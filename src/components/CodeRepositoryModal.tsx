import React, { useState } from 'react';
import { X, FileCode, Download, Copy, Check, FolderGit2 } from 'lucide-react';
import JSZip from 'jszip';

interface CodeRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DART_MAIN = `import 'dart:async';
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
                  'A spot just opened \${meters.round()} m from your destination',
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
        'https://nominatim.openstreetmap.org/search?q=\${Uri.encodeComponent(query)}&format=json&limit=1',
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
        'https://nominatim.openstreetmap.org/reverse?lat=\$lat&lon=\$lng&format=json&zoom=10',
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
          debugPrint('Alert save error: \$e');
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
                      city.isNotEmpty ? 'City: \$city' : 'City not detected',
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
                'Reported \$minAgo min ago',
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
      final request = http.MultipartRequest('POST', Uri.parse('\$kSignApi/detect'));
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
          SnackBar(content: Text('Could not read the sign: HTTP \${res.statusCode}')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not read the sign: \$e')),
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
        ? 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=\$kMapboxToken'
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: const LatLng(29.03, 77.07),
              initialZoom: 15.0,
              onTap: (_, point) => _onMapTapped(point),
              onLongPress: (_, point) => _addRule(point),
            ),
            children: [
              TileLayer(
                urlTemplate: tileUrl,
                userAgentPackageName: 'com.example.parkpulse',
              ),
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
                              '\\$\\\${price.toStringAsFixed(0)}/hr',
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
        ],
      ),
    );
  }
}
`;

const RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /spots/{id} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.keys().hasOnly(['lat','lng','uid','createdAt','taken','note','city'])
        && request.resource.data.createdAt == request.time;
      allow update: if request.auth != null
        && resource.data.taken == false
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['taken','takenBy'])
        && request.resource.data.takenBy == request.auth.uid;
    }
    match /garages/{id} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.keys().hasOnly(['lat','lng','uid','city','createdAt','name','price'])
        && request.resource.data.name.size() < 80;
    }
    match /rules/{id} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.keys().hasOnly(['lat','lng','uid','type','text','createdAt'])
        && request.resource.data.text.size() < 200;
    }
    match /users/{u} {
      allow read: if request.auth != null && request.auth.uid == u;
    }
    match /alerts/{u} {
      allow read, write: if request.auth != null && request.auth.uid == u
        && request.resource.data.keys().hasOnly(['token','alertOn','destLat','destLng']);
    }
  }
}`;

const FUNCTIONS_INDEX = `const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

async function pts(uid, n) {
  if (!uid) return;
  await db.collection("users").doc(uid).set(
    { points: admin.firestore.FieldValue.increment(n) },
    { merge: true }
  );
}

function km(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

exports.onSpot = onDocumentCreated("spots/{id}", async (event) => {
  const data = event.data?.data();
  if (!data) return;
  await pts(data.uid, 10);
  const delta = 0.5 / 111.0;
  const alertsSnapshot = await db.collection("alerts")
    .where("destLat", ">=", data.lat - delta)
    .where("destLat", "<=", data.lat + delta)
    .get();
  const tokens = [];
  alertsSnapshot.forEach(doc => {
    const alert = doc.data();
    if (doc.id !== data.uid && alert.alertOn && alert.token) {
      if (km(data.lat, data.lng, alert.destLat, alert.destLng) < 0.5) {
        tokens.push(alert.token);
      }
    }
  });
  if (tokens.length > 0) {
    await messaging.sendEachForMulticast({
      tokens: [...new Set(tokens)],
      notification: {
        title: "Parking spot opened",
        body: "A spot just opened near your destination.",
      },
      android: { priority: "high" }
    });
  }
});

exports.onRule = onDocumentCreated("rules/{id}", async (e) => {
  if (e.data?.data()?.uid) await pts(e.data.data().uid, 5);
});

exports.onGarage = onDocumentCreated("garages/{id}", async (e) => {
  if (e.data?.data()?.uid) await pts(e.data.data().uid, 10);
});

exports.onTaken = onDocumentUpdated("spots/{id}", async (e) => {
  const b = e.data.before?.data();
  const a = e.data.after?.data();
  if (b?.taken === false && a?.taken === true && a?.takenBy && a.takenBy !== a.uid) {
    await pts(a.takenBy, 3);
  }
});`;

const DECODE_PY = `import re
from datetime import datetime

DAY_MAP = {
    "SUN": 0, "SUNDAY": 0, "MON": 1, "MONDAY": 1,
    "TUE": 2, "TUES": 2, "TUESDAY": 2, "WED": 3, "WEDNESDAY": 3,
    "THU": 4, "THUR": 4, "THURS": 4, "THURSDAY": 4,
    "FRI": 5, "FRIDAY": 5, "SAT": 6, "SATURDAY": 6,
}
DAY_FULL_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

def decode(raw: str, now: datetime = None) -> dict | None:
    if not raw or not isinstance(raw, str): return None
    text = " ".join(raw.upper().split()).strip()
    if len(text) < 4: return None
    if now is None: now = datetime.now()
    today_weekday = (now.weekday() + 1) % 7
    current_minutes = now.hour * 60 + now.minute

    days = [0, 1, 2, 3, 4, 5, 6]
    range_match = re.search(r"\\b(MON|TUE|TUES|WED|THU|THUR|THURS|FRI|SAT|SUN)\\s*(?:-|–|TO)\\s*(MON|TUE|TUES|WED|THU|THUR|THURS|FRI|SAT|SUN)\\b", text)
    if range_match:
        cur = DAY_MAP[range_match.group(1)]
        end_d = DAY_MAP[range_match.group(2)]
        expanded = []
        while True:
            expanded.append(cur)
            if cur == end_d: break
            cur = (cur + 1) % 7
        days = expanded

    for ex_match in re.finditer(r"EXCEPT\\s+(SUN|SUNDAY|MON|MONDAY|TUE|TUESDAY|WED|WEDNESDAY|THU|THURSDAY|FRI|FRIDAY|SAT|SATURDAY)\\b", text):
        ex_d = DAY_MAP[ex_match.group(1)]
        days = [d for d in days if d != ex_d]

    if len(days) == 7: days_str = "every day"
    elif len(days) == 5 and set(days) == {1, 2, 3, 4, 5}: days_str = "Monday to Friday"
    else: days_str = ", ".join(DAY_FULL_NAMES[d] for d in days)

    time_regex = re.compile(r"(\\d{1,2})(?::(\\d{2}))?\\s*(AM|PM)?\\s*(?:-|–|TO)\\s*(\\d{1,2})(?::(\\d{2}))?\\s*(AM|PM)", re.IGNORECASE)
    windows = []
    for m in time_regex.finditer(text):
        s_h, s_m = int(m.group(1)), int(m.group(2)) if m.group(2) else 0
        end_meridiem = m.group(6).upper()
        start_meridiem = m.group(3).upper() if m.group(3) else end_meridiem
        e_h, e_m = int(m.group(4)), int(m.group(5)) if m.group(5) else 0
        def to_min(h, m_val, meridiem):
            if meridiem == "PM" and h != 12: h += 12
            elif meridiem == "AM" and h == 12: h = 0
            return h * 60 + m_val
        windows.append((to_min(s_h, s_m, start_meridiem), to_min(e_h, e_m, end_meridiem), f"{s_h}:{s_m:02d} {start_meridiem} to {e_h}:{e_m:02d} {end_meridiem}"))

    times_str = " and ".join(w[2] for w in windows) if windows else "at all times"
    day_active = today_weekday in days
    time_active = any(w[0] <= current_minutes < w[1] for w in windows) if windows else True
    is_active = day_active and time_active

    limit_match = re.search(r"\\b(\\d+)\\s*(HR|HOUR|HOURS|MIN|MINS|MINUTE|MINUTES)\\b", text)
    limit_str = None
    if limit_match:
        val = int(limit_match.group(1))
        unit = limit_match.group(2).upper()
        limit_str = ("1 hour" if val == 1 else f"{val} hours") if "HR" in unit or "HOUR" in unit else ("1 minute" if val == 1 else f"{val} minutes")

    if any(p in text for p in ["NO PARKING", "NO STOPPING", "NO STANDING", "TOW AWAY", "DO NOT PARK"]):
        return {"kind": "no", "summary": f"No parking {times_str}, {days_str}.", "verdict": "Don’t park here now." if is_active else "You can park now. The rule isn’t active."}
    elif limit_str:
        return {"kind": "limit", "summary": f"Up to {limit_str}, {times_str}, {days_str}. No limit outside those times.", "verdict": f"You can park now, but move within {limit_str}." if is_active else "You can park now with no limit."}
    elif "PERMIT" in text:
        return {"kind": "no", "summary": f"Permit holders only, {times_str}, {days_str}.", "verdict": "Skip this street unless you hold a permit." if is_active else "Permit rule isn't active now."}
    elif any(p in text for p in ["METER", "PAY", "PAID"]):
        return {"kind": "limit", "summary": f"Paid parking {times_str}, {days_str}.", "verdict": "Pay before you leave the car." if is_active else "Free right now."}
    return None`;

const SERVER_PY = `import os, io
from fastapi import FastAPI, UploadFile, File, HTTPException
from PIL import Image
import numpy as np
import easyocr
from decode import decode

app = FastAPI(title="ParkPulse Sign AI Server")
reader = easyocr.Reader(['en'], gpu=False)

weights_path = os.getenv("SIGN_WEIGHTS", "runs/detect/signs/weights/best.pt")
model = None
if os.path.exists(weights_path):
    from ultralytics import YOLO
    model = YOLO(weights_path)

@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    contents = await file.read()
    pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    crops = []
    used_detector = False
    if model:
        results = model.predict(pil_image, conf=0.35)
        if results and results[0].boxes:
            used_detector = True
            for box in results[0].boxes:
                xy = [int(v) for v in box.xyxy[0].tolist()]
                crops.append({"img": pil_image.crop(xy), "class": "sign", "conf": float(box.conf[0])})
    if not crops:
        crops.append({"img": pil_image, "class": "whole_image", "conf": 1.0})

    signs = []
    for item in crops:
        text = " ".join(reader.readtext(np.array(item["img"]), detail=0))
        signs.append({"class": item["class"], "confidence": item["conf"], "text": text, "rule": decode(text)})
    return {"signs": signs, "used_detector": used_detector}`;

const README_MD = `# ParkPulse Flutter & Firebase Prototype
1. flutter create parkpulse && cd parkpulse (replace lib/main.dart)
2. flutter pub add firebase_core firebase_auth cloud_firestore firebase_messaging flutter_map latlong2 geolocator image_picker http
3. Enable Firebase Anonymous Auth, create Firestore, paste firestore.rules
4. flutterfire configure
5. Add Android/iOS permissions (INTERNET, ACCESS_FINE_LOCATION, POST_NOTIFICATIONS, CAMERA)
6. Firebase CLI: firebase deploy --only functions,firestore:rules (requires Blaze plan)
7. Sign server: pip install -r requirements.txt && uvicorn server:app --port 8000
8. flutter run
`;

const FILES: Record<string, { path: string; content: string }> = {
  'lib/main.dart': { path: 'parkpulse_flutter/lib/main.dart', content: DART_MAIN },
  'firestore.rules': { path: 'parkpulse_flutter/firestore.rules', content: RULES },
  'functions/index.js': { path: 'parkpulse_flutter/functions/index.js', content: FUNCTIONS_INDEX },
  'sign_ai/decode.py': { path: 'parkpulse_flutter/sign_ai/decode.py', content: DECODE_PY },
  'sign_ai/server.py': { path: 'parkpulse_flutter/sign_ai/server.py', content: SERVER_PY },
  'README.md': { path: 'parkpulse_flutter/README.md', content: README_MD },
};

export const CodeRepositoryModal: React.FC<CodeRepositoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<string>('lib/main.dart');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const current = FILES[selectedFile] || FILES['lib/main.dart'];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('parkpulse_flutter');

      folder?.file('lib/main.dart', DART_MAIN);
      folder?.file('firestore.rules', RULES);
      folder?.file('functions/index.js', FUNCTIONS_INDEX);
      folder?.file('sign_ai/decode.py', DECODE_PY);
      folder?.file('sign_ai/server.py', SERVER_PY);
      folder?.file('README.md', README_MD);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'parkpulse_flutter_project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (_) {
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1300] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="w-full max-w-4xl bg-slate-900 rounded-2xl shadow-2xl flex flex-col h-[85vh] border border-slate-800 text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#0A4296] text-white">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                ParkPulse Flutter &amp; Backend Codebase
              </h2>
              <p className="text-xs text-slate-400">
                Created in <code className="text-amber-400">/parkpulse_flutter/</code> as specified
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={downloading}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Packing...' : 'Export ZIP'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* File Browser Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 sm:w-64 border-r border-slate-800 bg-slate-950/40 p-3 overflow-y-auto">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
              Project Structure
            </div>
            <div className="flex flex-col gap-1">
              {Object.keys(FILES).map((fileName) => (
                <button
                  key={fileName}
                  onClick={() => setSelectedFile(fileName)}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center gap-2 transition-all ${
                    selectedFile === fileName
                      ? 'bg-[#0A4296] text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{fileName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col bg-slate-900/90 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950/30 text-xs">
              <span className="font-mono text-slate-400">{current.path}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-4 flex-1 overflow-auto font-mono text-xs text-slate-200 leading-relaxed">
              <code>{current.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
