import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';

import 'firebase_options.dart';

// User-supplied configuration constants
const String kMapboxToken = '';
const String kSignApi = 'http://YOUR-SERVER:8000';

typedef Doc = QueryDocumentSnapshot<Map<String, dynamic>>;

LatLng _ll(Map d) {
  final num lat = d['lat'] as num;
  final num lng = d['lng'] as num;
  return LatLng(lat.toDouble(), lng.toDouble());
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  final auth = FirebaseAuth.instance;
  if (auth.currentUser == null) {
    try {
      await auth.signInAnonymously();
    } catch (e) {
      debugPrint('Anonymous auth error: $e');
    }
  }

  runApp(const ParkApp());
}

class ParkApp extends StatelessWidget {
  const ParkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ParkPulse',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF0A4296),
        brightness: Brightness.light,
      ),
      home: const MapPage(),
    );
  }
}

class MapPage extends StatefulWidget {
  const MapPage({super.key});

  @override
  State<MapPage> createState() => _MapPageState();
}

class _MapPageState extends State<MapPage> {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final MapController _mapController = MapController();
  final TextEditingController _searchController = TextEditingController();

  String? _uid;
  LatLng? _dest;
  bool _pickDest = false;
  bool _first = true;
  String? _filter; // null, 'free', 'paid', or 'garage'

  late final Stream<QuerySnapshot<Map<String, dynamic>>> _spots;
  late final Stream<QuerySnapshot<Map<String, dynamic>>> _rulesS;
  late final Stream<QuerySnapshot<Map<String, dynamic>>> _garS;
  StreamSubscription? _spotsSubscription;

  @override
  void initState() {
    super.initState();
    _uid = FirebaseAuth.instance.currentUser?.uid;

    final thirtyMinsAgo = Timestamp.fromDate(
      DateTime.now().subtract(const Duration(minutes: 30)),
    );

    // Streams created once, NEVER inside build
    _spots = _db
        .collection('spots')
        .where('createdAt', isGreaterThan: thirtyMinsAgo)
        .orderBy('createdAt', descending: true)
        .limit(200)
        .snapshots();

    _rulesS = _db.collection('rules').limit(300).snapshots();
    _garS = _db.collection('garages').limit(300).snapshots();

    _setupNotifications();
    _initLocation();
    _listenToSpotAlerts();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _spotsSubscription?.cancel();
    super.dispose();
  }

  Future<void> _setupNotifications() async {
    try {
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized && _uid != null) {
        final token = await messaging.getToken();
        if (token != null) {
          await _db.collection('alerts').doc(_uid).set(
            {'token': token},
            SetOptions(merge: true),
          );
        }
        messaging.onTokenRefresh.listen((newToken) {
          if (_uid != null) {
            _db.collection('alerts').doc(_uid).set(
              {'token': newToken},
              SetOptions(merge: true),
            );
          }
        });
      }
    } catch (e) {
      debugPrint('FCM setup error: $e');
    }
  }

  Future<void> _initLocation() async {
    try {
      final pos = await _getCurrentLocation();
      _mapController.move(pos, 16.0);
    } catch (_) {
      // Ignore errors on startup to maintain initial Murthal coordinate
    }
  }

  Future<LatLng> _getCurrentLocation() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw 'Allow location access to use this.';
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw 'Allow location access to use this.';
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw 'Allow location access to use this.';
    }

    final pos = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    );
    return LatLng(pos.latitude, pos.longitude);
  }

  void _listenToSpotAlerts() {
    _spotsSubscription = _spots.listen((snapshot) {
      if (_first) {
        _first = false;
        return;
      }
      if (_dest == null) return;

      const distanceCalculator = Distance();
      for (final change in snapshot.docChanges) {
        if (change.type == DocumentChangeType.added) {
          final data = change.doc.data();
          if (data == null) continue;
          final reporter = data['uid'] as String?;
          if (reporter == _uid) continue; // Skip own spots
          if (data['taken'] == true) continue;

          final spotPos = _ll(data);
          final meters = distanceCalculator.as(
            LengthUnit.Meter,
            _dest!,
            spotPos,
          );

          if (meters <= 500) {
            if (!mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'A spot just opened ${meters.round()} m from your destination',
                ),
                backgroundColor: const Color(0xFF0A4296),
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        }
      }
    });
  }

  Future<void> _searchPlace(String query) async {
    if (query.trim().isEmpty) return;
    try {
      final url = Uri.parse(
        'https://nominatim.openstreetmap.org/search?q=${Uri.encodeComponent(query)}&format=json&limit=1',
      );
      final res = await http.get(url, headers: {'User-Agent': 'ParkPulse/1.0'});
      if (res.statusCode == 200) {
        final List list = jsonDecode(res.body);
        if (list.isNotEmpty) {
          final lat = double.parse(list[0]['lat']);
          final lon = double.parse(list[0]['lon']);
          final target = LatLng(lat, lon);
          _mapController.move(target, 16.0);
          return;
        } else {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Place not found')),
          );
        }
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Search failed. Check your connection.')),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Search failed. Check your connection.')),
      );
    }
  }

  Future<String> _reverseGeocodeCity(double lat, double lng) async {
    try {
      final url = Uri.parse(
        'https://nominatim.openstreetmap.org/reverse?lat=$lat&lon=$lng&format=json&zoom=10',
      );
      final res = await http.get(url, headers: {'User-Agent': 'ParkPulse/1.0'});
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final address = data['address'] as Map<String, dynamic>?;
        if (address != null) {
          return address['city'] ??
              address['town'] ??
              address['village'] ??
              address['county'] ??
              '';
        }
      }
    } catch (_) {}
    return '';
  }

  void _onMapTapped(LatLng point) async {
    if (_pickDest) {
      setState(() {
        _dest = point;
        _pickDest = false;
      });

      if (_uid != null) {
        try {
          await _db.collection('alerts').doc(_uid).set({
            'alertOn': true,
            'destLat': point.latitude,
            'destLng': point.longitude,
          }, SetOptions(merge: true));
        } catch (e) {
          debugPrint('Alert save error: $e');
        }
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Alerts on. We will notify you even when the app is closed.',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _openReportSpotSheet() async {
    LatLng location;
    try {
      location = await _getCurrentLocation();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
      return;
    }

    final city = await _reverseGeocodeCity(location.latitude, location.longitude);
    if (!mounted) return;

    String type = 'Street';
    final noteController = TextEditingController();
    final priceController = TextEditingController();

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
                left: 20,
                right: 20,
                top: 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Report parking spot',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(value: 'Street', label: Text('Street')),
                        ButtonSegment(value: 'Garage', label: Text('Garage')),
                      ],
                      selected: {type},
                      onSelectionChanged: (val) {
                        setSheetState(() => type = val.first);
                      },
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: noteController,
                      decoration: InputDecoration(
                        border: const OutlineInputBorder(),
                        labelText: type == 'Street'
                            ? 'Optional note (e.g. opposite the cafe)'
                            : 'Garage name',
                      ),
                    ),
                    if (type == 'Garage') ...[
                      const SizedBox(height: 12),
                      TextField(
                        controller: priceController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          labelText: 'Price per hour',
                        ),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Text(
                      city.isNotEmpty ? 'City: $city' : 'City not detected',
                      style: const TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                    const SizedBox(height: 18),
                    FilledButton(
                      onPressed: () async {
                        Navigator.pop(ctx);
                        if (_uid == null) return;
                        if (type == 'Street') {
                          await _db.collection('spots').add({
                            'lat': location.latitude,
                            'lng': location.longitude,
                            'uid': _uid,
                            'city': city,
                            'note': noteController.text.trim(),
                            'taken': false,
                            'createdAt': FieldValue.serverTimestamp(),
                          });
                        } else {
                          final price = double.tryParse(priceController.text.trim()) ?? 0.0;
                          await _db.collection('garages').add({
                            'lat': location.latitude,
                            'lng': location.longitude,
                            'uid': _uid,
                            'city': city,
                            'name': noteController.text.trim(),
                            'price': price,
                            'createdAt': FieldValue.serverTimestamp(),
                          });
                        }

                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Shared. Thanks!'),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      },
                      child: const Text('Save spot'),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _addRule(LatLng ll, {String text = '', String type0 = 'paid'}) async {
    String selectedType = type0;
    final textController = TextEditingController(text: text);

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Add a sign or rule here'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButtonFormField<String>(
                      value: selectedType,
                      decoration: const InputDecoration(border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 'free', child: Text('Free parking')),
                        DropdownMenuItem(value: 'paid', child: Text('Paid or time limit')),
                        DropdownMenuItem(value: 'no', child: Text('No parking')),
                      ],
                      onChanged: (val) {
                        if (val != null) setDialogState(() => selectedType = val);
                      },
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: textController,
                      maxLength: 150,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        hintText: '2 HR, 8AM-6PM, Mon-Fri',
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );

    if (saved == true && textController.text.trim().isNotEmpty && _uid != null) {
      await _db.collection('rules').add({
        'lat': ll.latitude,
        'lng': ll.longitude,
        'uid': _uid,
        'type': selectedType,
        'text': textController.text.trim(),
        'createdAt': FieldValue.serverTimestamp(),
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Rule added. +5 points'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _showSpotSheet(Doc doc) {
    final data = doc.data();
    final Timestamp? ts = data['createdAt'] as Timestamp?;
    final int minAgo = ts != null
        ? DateTime.now().difference(ts.toDate()).inMinutes.clamp(0, 9999)
        : 0;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Open spot',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'Reported $minAgo min ago',
                style: TextStyle(color: Colors.grey.shade700, fontSize: 15),
              ),
              if ((data['note'] as String?)?.isNotEmpty ?? false) ...[
                const SizedBox(height: 8),
                Text(
                  data['note'],
                  style: const TextStyle(fontSize: 14, fontStyle: FontStyle.italic),
                ),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () async {
                  Navigator.pop(ctx);
                  if (_uid == null) return;
                  await doc.reference.update({
                    'taken': true,
                    'takenBy': _uid,
                  });
                },
                child: const Text('I took it (+3 points)'),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showRuleSheet(Doc doc) {
    final data = doc.data();
    final text = data['text'] as String? ?? '';

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                text,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  Future<void> _scanParkingSign() async {
    final picker = ImagePicker();
    final XFile? image = await picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1280,
    );
    if (image == null) return;

    LatLng loc;
    try {
      loc = await _getCurrentLocation();
    } catch (_) {
      loc = LatLng(29.03, 77.07);
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Reading the sign...'),
        duration: Duration(seconds: 2),
      ),
    );

    try {
      final request = http.MultipartRequest('POST', Uri.parse('$kSignApi/detect'));
      request.files.add(await http.MultipartFile.fromPath('file', image.path));
      final streamedResponse = await request.send();
      final res = await http.Response.fromStream(streamedResponse);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final List signs = data['signs'] as List? ?? [];
        if (signs.isEmpty) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No sign found. Try a closer photo.')),
          );
          return;
        }

        final first = signs.first as Map<String, dynamic>;
        final rule = first['rule'] as Map<String, dynamic>?;
        final String rawOcr = first['text'] as String? ?? '';

        final String textToPreFill = rule != null ? (rule['summary'] ?? rawOcr) : rawOcr;
        final String signType = (rule != null && rule['kind'] == 'no') ? 'no' : 'paid';

        if (!mounted) return;
        _addRule(loc, text: textToPreFill, type0: signType);
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not read the sign: HTTP ${res.statusCode}')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not read the sign: $e')),
      );
    }
  }

  Widget _buildMarkerLayer<T>({
    required Stream<QuerySnapshot<Map<String, dynamic>>> stream,
    required List<Marker> Function(List<Doc> docs) builder,
  }) {
    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: stream,
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const MarkerLayer(markers: []);
        final markers = builder(snapshot.data!.docs);
        return MarkerLayer(markers: markers);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    final String tileUrl = kMapboxToken.isNotEmpty
        ? 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=$kMapboxToken'
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    return Scaffold(
      body: Stack(
        children: [
          // 8.3 Map Layer
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: const LatLng(29.03, 77.07),
              initialZoom: 15.0,
              onTap: (_, point) => _onMapTapped(point),
              onLongPress: (_, point) => _addRule(point),
            ),
            children: [
              // 1. Tile layer
              TileLayer(
                urlTemplate: tileUrl,
                userAgentPackageName: 'com.example.parkpulse',
              ),

              // 2. Rule markers (34 by 34 circles)
              _buildMarkerLayer(
                stream: _rulesS,
                builder: (docs) {
                  final markers = <Marker>[];
                  for (final doc in docs) {
                    final data = doc.data();
                    final type = data['type'] as String? ?? 'paid';
                    if (_filter != null && _filter != type) continue;

                    Color bg = const Color(0xFF1E6FD9);
                    IconData icon = Icons.attach_money;
                    if (type == 'free') {
                      bg = Colors.green;
                      icon = Icons.money_off;
                    } else if (type == 'no') {
                      bg = Colors.red;
                      icon = Icons.block;
                    }

                    markers.add(
                      Marker(
                        point: _ll(data),
                        width: 34,
                        height: 34,
                        child: GestureDetector(
                          onTap: () => _showRuleSheet(doc),
                          child: Container(
                            decoration: BoxDecoration(
                              color: bg,
                              shape: BoxShape.circle,
                              boxShadow: const [
                                BoxShadow(
                                  color: Colors.black26,
                                  blurRadius: 4,
                                  offset: Offset(0, 2),
                                )
                              ],
                            ),
                            child: Icon(icon, color: Colors.white, size: 18),
                          ),
                        ),
                      ),
                    );
                  }
                  return markers;
                },
              ),

              // 3. Garage markers (80 by 60), only when _filter == 'garage'
              _buildMarkerLayer(
                stream: _garS,
                builder: (docs) {
                  if (_filter != 'garage') return [];
                  final markers = <Marker>[];
                  for (final doc in docs) {
                    final data = doc.data();
                    final price = (data['price'] as num?)?.toDouble() ?? 0.0;
                    markers.add(
                      Marker(
                        point: _ll(data),
                        width: 80,
                        height: 60,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: const Color(0xFF0A4296),
                                borderRadius: BorderRadius.circular(6),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Colors.black26,
                                    blurRadius: 3,
                                    offset: Offset(0, 2),
                                  )
                                ],
                              ),
                              alignment: Alignment.center,
                              child: const Text(
                                'P',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '\$${price.toStringAsFixed(0)}/hr',
                              style: const TextStyle(
                                color: Color(0xFF0A4296),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }
                  return markers;
                },
              ),

              // 4. Open-spot markers (40 by 40 navy circles with white Icons.local_parking)
              _buildMarkerLayer(
                stream: _spots,
                builder: (docs) {
                  if (_filter == 'garage') return [];
                  final markers = <Marker>[];
                  for (final doc in docs) {
                    final data = doc.data();
                    if (data['taken'] == true) continue;
                    markers.add(
                      Marker(
                        point: _ll(data),
                        width: 40,
                        height: 40,
                        child: GestureDetector(
                          onTap: () => _showSpotSheet(doc),
                          child: Container(
                            decoration: const BoxDecoration(
                              color: Color(0xFF0A4296),
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black26,
                                  blurRadius: 4,
                                  offset: Offset(0, 2),
                                )
                              ],
                            ),
                            child: const Icon(
                              Icons.local_parking,
                              color: Colors.white,
                              size: 24,
                            ),
                          ),
                        ),
                      ),
                    );
                  }
                  return markers;
                },
              ),

              // 5. Destination marker (red Icons.place, size 40)
              if (_dest != null)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: _dest!,
                      width: 40,
                      height: 40,
                      child: const Icon(
                        Icons.place,
                        color: Colors.red,
                        size: 40,
                      ),
                    ),
                  ],
                ),
            ],
          ),

          // 8.4 Top Overlay
          Positioned(
            top: topPadding + 8,
            left: 12,
            right: 12,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Row with two cards
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Card(
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        child: Text(
                          'ParkPulse',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0A4296),
                          ),
                        ),
                      ),
                    ),
                    if (_uid != null)
                      StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
                        stream: _db.collection('users').doc(_uid).snapshots(),
                        builder: (context, snapshot) {
                          final points = snapshot.data?.data()?['points'] ?? 0;
                          return Card(
                            elevation: 2,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.monetization_on,
                                    color: Colors.orange,
                                    size: 20,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    '$points',
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                  ],
                ),
                const SizedBox(height: 8),

                // Search field
                Material(
                  elevation: 2,
                  borderRadius: BorderRadius.circular(16),
                  color: Colors.white,
                  child: TextField(
                    controller: _searchController,
                    onSubmitted: _searchPlace,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: 'Search address or place',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => _searchController.clear(),
                      ),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),

                // Filter Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      FilterChip(
                        showCheckmark: false,
                        avatar: const Icon(Icons.money_off, size: 18),
                        label: const Text('Free'),
                        selected: _filter == 'free',
                        onSelected: (selected) {
                          setState(() => _filter = selected ? 'free' : null);
                        },
                      ),
                      const SizedBox(width: 8),
                      FilterChip(
                        showCheckmark: false,
                        avatar: const Icon(Icons.attach_money, size: 18),
                        label: const Text('Paid'),
                        selected: _filter == 'paid',
                        onSelected: (selected) {
                          setState(() => _filter = selected ? 'paid' : null);
                        },
                      ),
                      const SizedBox(width: 8),
                      FilterChip(
                        showCheckmark: false,
                        avatar: const Icon(Icons.local_parking, size: 18),
                        label: const Text('Garages'),
                        selected: _filter == 'garage',
                        onSelected: (selected) {
                          setState(() => _filter = selected ? 'garage' : null);
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // 8.5 Bottom Overlay
          Positioned(
            bottom: bottomPadding + 12,
            left: 12,
            right: 12,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Destination alert button
                    FilledButton.tonalIcon(
                      onPressed: () {
                        setState(() => _pickDest = !_pickDest);
                        if (_pickDest) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Tap the map to set your destination'),
                              duration: Duration(seconds: 3),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      },
                      icon: Icon(_pickDest ? Icons.close : Icons.notifications_none),
                      label: Text(
                        _pickDest
                            ? 'Cancel'
                            : (_dest != null ? 'Alerts on' : 'Get open spot alerts'),
                      ),
                    ),

                    // Right column
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        FloatingActionButton.small(
                          heroTag: 'fab_my_location',
                          onPressed: () async {
                            try {
                              final pos = await _getCurrentLocation();
                              _mapController.move(pos, 16.0);
                            } catch (e) {
                              if (!mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(e.toString())),
                              );
                            }
                          },
                          child: const Icon(Icons.my_location),
                        ),
                        const SizedBox(height: 10),
                        FloatingActionButton.extended(
                          heroTag: 'fab_report_spot',
                          backgroundColor: Colors.red.shade600,
                          foregroundColor: Colors.white,
                          icon: const Icon(Icons.place),
                          label: const Text('Report Spot'),
                          onPressed: _openReportSpotSheet,
                        ),
                        const SizedBox(height: 10),
                        FloatingActionButton.extended(
                          heroTag: 'fab_report_rule',
                          backgroundColor: const Color(0xFF1E6FD9),
                          foregroundColor: Colors.white,
                          icon: const Icon(Icons.local_parking),
                          label: const Text('Report Rule'),
                          onPressed: () async {
                            try {
                              final loc = await _getCurrentLocation();
                              _addRule(loc);
                            } catch (e) {
                              if (!mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(e.toString())),
                              );
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Scan Parking Sign Button
                Center(
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF1F1FA8),
                      minimumSize: const Size(260, 52),
                    ),
                    onPressed: _scanParkingSign,
                    icon: const Icon(Icons.document_scanner),
                    label: const Text(
                      'Scan Parking Sign',
                      style: TextStyle(fontSize: 16),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
