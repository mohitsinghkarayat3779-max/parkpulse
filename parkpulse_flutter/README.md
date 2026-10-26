# ParkPulse: Crowdsourced Street Parking & Sign Reader

**Founder & Lead Architect:** Mohit Singh Karayat  
**Contact:** mskarayat042@gmail.com  
**Copyright:** © 2026 Mohit Singh Karayat. All rights reserved.

ParkPulse is a real-time, crowdsourced mobile parking application. Drivers view open street parking spots reported by other drivers in real time, read complex street parking rules in plain English, scan physical parking signs with camera AI, receive automated push notifications when a spot opens near their destination, and earn points for keeping their community moving.

---

## Architecture Overview

```
                      +-----------------------------+
                      |   ParkPulse Flutter Mobile  |
                      | (Android & iOS / Material 3)|
                      +--------------+--------------+
                                     |
           +-------------------------+-------------------------+
           |                                                   |
           v                                                   v
+-----------------------+                           +---------------------+
| Firebase Cloud        |                           |  Sign AI Fast-API   |
| - Anonymous Auth      |                           |  - EasyOCR          |
| - Cloud Firestore     |                           |  - Rule Decoder     |
| - Cloud Functions v2  |                           |  - Optional YOLOv8  |
| - FCM Push Alerts     |                           +---------------------+
+-----------------------+
```

---

## Setup Steps

### 1. Flutter Client Initialization
```bash
flutter create parkpulse && cd parkpulse
# Replace lib/main.dart with the provided lib/main.dart file
```

### 2. Add Dependencies
```bash
flutter pub add firebase_core firebase_auth cloud_firestore firebase_messaging flutter_map latlong2 geolocator image_picker http
```

### 3. Firebase Project Configuration
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. In **Build > Authentication**, enable **Anonymous Sign-in**.
3. In **Build > Firestore Database**, click **Create Database** (start in production mode).
4. Copy the contents of `firestore.rules` and paste them into your Firebase Console Firestore Rules tab, then click **Publish**.

### 4. Configure FlutterFire CLI
```bash
dart pub global activate flutterfire_cli
flutterfire configure
```
*This command generates `lib/firebase_options.dart` which is imported by `lib/main.dart`.*

### 5. Platform Permissions

#### Android (`android/app/src/main/AndroidManifest.xml`):
Add the following permissions inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.CAMERA" />
```
For local HTTP testing with the sign reader server, add `android:usesCleartextTraffic="true"` inside `<application>`:
```xml
<application
    android:label="ParkPulse"
    android:name="${applicationName}"
    android:icon="@mipmap/ic_launcher"
    android:usesCleartextTraffic="true">
```

#### iOS (`ios/Runner/Info.plist`):
Add the following permission keys:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>ParkPulse needs your location to find parking spots near you.</string>
<key>NSCameraUsageDescription</key>
<string>ParkPulse uses your camera to scan parking signs.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>ParkPulse lets you pick photos of parking signs to read rules.</string>
```

### 6. Backend Deployment (Cloud Functions v2)
1. Install Firebase CLI and login:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
2. Initialize project:
   ```bash
   firebase init
   # Select Firestore and Functions (JavaScript)
   ```
3. Copy `functions/index.js`, `functions/package.json`, and `firestore.rules` into your project directory.
4. Note: Firebase Cloud Functions v2 requires upgrading your Firebase project to the **Blaze (Pay as you go)** plan. Google Cloud includes a generous monthly free tier (2M Cloud Functions invocations and 50k Firestore operations every month).
5. Deploy rules and functions:
   ```bash
   firebase deploy --only functions,firestore:rules
   ```

### 7. Sign Reader AI Server
1. Navigate to `sign_ai/`:
   ```bash
   cd sign_ai
   pip install -r requirements.txt
   uvicorn server:app --host 0.0.0.0 --port 8000
   ```
2. Open `lib/main.dart` and update `kSignApi`:
   ```dart
   const String kSignApi = 'http://YOUR_SERVER_IP:8000'; // or https://your-cloud-run-domain.a.run.app
   ```

### 8. Run the Application
```bash
flutter run
```
Connect a physical phone or launch an Android/iOS emulator.

---

## Known Limits (Stated Honestly)

- **Line snapping depends on OpenStreetMap road geometry and Overpass API availability**: If Overpass is unreachable or times out, realistic fallback lines are drawn based on reporting coordinates.
- **Side-of-street accuracy**: Lines snap to the road center line, not the curb edge, since OSM ways do not distinguish curbs.
- **Zoom threshold**: Street lines are only queried and drawn at zoom 15 and above to preserve performance and prevent map clutter. At zoom >= 16, centered text badges ('FREE', 'PAID', 'NO PARKING') appear.
- **No photo upload on reports**: Spot reports store geolocations, notes, and city names rather than image blobs to optimize battery, data usage, and upload latency.
- **No spam rate limiting**: For demonstration purposes, users can report multiple spots without CAPTCHAs or cooldown limits.
- **Map tile limits**: The default configuration uses OpenStreetMap public tile servers (`tile.openstreetmap.org`) and Nominatim geocoding under their Fair Use Policy. For high-volume production, configure a dedicated tile CDN or insert a Mapbox access token in `kMapboxToken`.
- **Sign OCR angle tolerance**: Optical Character Recognition performs best on close, well-lit, orthogonal photos of parking signs until a custom YOLOv8 model is trained and deployed (`runs/detect/signs/weights/best.pt`).

---

## Bulk Import City Parking Regulations

ParkPulse includes a bulk import script (`tools/import_city_parking.py`) to load municipal parking GIS datasets:
```bash
python tools/import_city_parking.py regulations.geojson serviceAccount.json
# Or test with dry-run:
python tools/import_city_parking.py regulations.geojson --dry-run
```
Segments are batched in groups of 400 with automatic coordinate conversion `[lng, lat]` -> `{lat, lng}` and point clamping (2 to 20 vertices) adhering to Firestore security rules.

---

## What Is Not Included

- Trained custom YOLO weights (the repository provides the complete dataset specification `data.yaml` and one-line training pipeline `train.py`).
- Cloud Storage photo bucket integration on spot reports.
- Hardcoded user secrets or API keys.

---

## Presenter Demo Script

1. **Explore Live Map & Filter Chips**:
   - Launch ParkPulse. Observe the OpenStreetMap view centered at Murthal (29.03, 77.07) with active rule circles and spots.
   - Tap the filter chips: **Free** (green money-off icons), **Paid** (blue money icons), and **Garages** (navy "P" badges with `$price/hr` tags).
2. **Multi-Phone Spot Reporting (Phone A -> Phone B)**:
   - On Phone A, tap **Report Spot**. Reverse-geocoded city is detected automatically. Select Street, enter "Opposite the cafe", and tap "Save spot".
   - Notice the navy "P" badge instantly appears on Phone B via Firestore realtime sync.
   - Observe Phone A's coin badge update with **+10 points** awarded by Cloud Functions (`onSpot`).
3. **Destination Push Alert**:
   - On Phone B, tap **"Get open spot alerts"** and tap a point on the map within 500m of Phone A's location.
   - Phone A reports another spot.
   - Phone B receives the alert toast: *"A spot just opened 140 m from your destination"*, backed by `sendEachForMulticast` on Cloud Functions.
4. **Take Spot & Points**:
   - On Phone B, tap the spot pin and press **"I took it (+3 points)"**.
   - The pin immediately closes for all drivers, and Phone B is credited +3 points.
5. **AI Sign Reader Flow**:
   - Tap the purple **"Scan Parking Sign"** button.
   - Capture a sign (e.g. `2 HR PARKING 8AM-6PM MON-FRI EXCEPT SUN`).
   - The AI server parses the text, calculates real-time validity, and populates the rule dialog with plain-English summary: *"Up to 2 hours, 8 AM to 6 PM, Monday to Friday. No limit outside those times."*
