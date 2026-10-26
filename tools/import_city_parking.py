#!/usr/bin/env python3
"""
ParkPulse - City Parking Regulation Importer
Founder & Author: Mohit Singh Karayat

Bulk imports city curb regulations from Open Data GeoJSON into Firestore `segments`.
Usage:
    python tools/import_city_parking.py regulations.geojson [serviceAccount.json] [--dry-run]

GeoJSON Requirements:
    - Features must be LineString or MultiLineString geometries.
    - Properties should include regulation type ('free', 'paid', or 'no') or text description.
"""

import sys
import json
import argparse
from datetime import datetime

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    firebase_admin = None


def normalize_rule_type(text, explicit_type=None):
    if explicit_type and explicit_type.lower() in ('free', 'paid', 'no'):
        return explicit_type.lower()
    
    t = (text or '').lower()
    if any(k in t for k in ['no park', 'no stop', 'tow-away', 'no standing', 'red zone']):
        return 'no'
    if any(k in t for k in ['meter', 'pay', 'paid', 'hr', 'hour', 'coin']):
        return 'paid'
    if any(k in t for k in ['free', 'unrestricted', 'public']):
        return 'free'
    return 'paid'


def parse_geojson_features(geojson_path):
    with open(geojson_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    features = data.get('features', [])
    segments = []

    for idx, feature in enumerate(features):
        geom = feature.get('geometry') or {}
        props = feature.get('properties') or {}
        geom_type = geom.get('type')
        coords = geom.get('coordinates', [])

        if not coords:
            continue

        lines = []
        if geom_type == 'LineString':
            lines.append(coords)
        elif geom_type == 'MultiLineString':
            lines.extend(coords)
        else:
            continue

        raw_text = (
            props.get('text') or
            props.get('regulation') or
            props.get('rule') or
            props.get('description') or
            props.get('sign') or
            'Street Parking Regulation'
        )
        rule_type = normalize_rule_type(raw_text, props.get('type'))

        for line in lines:
            if len(line) < 2:
                continue
            
            # GeoJSON coordinates are [longitude, latitude]
            # Firestore segments require pts: [{lat, lng}, ...] (2 to 20 points)
            pts = []
            # Subsample if more than 20 points to fit Firestore schema constraints
            step = max(1, len(line) // 20)
            sampled = line[::step]
            if line[-1] != sampled[-1]:
                sampled.append(line[-1])
            sampled = sampled[:20]

            for pt in sampled:
                if len(pt) >= 2:
                    pts.append({
                        'lat': float(pt[1]),
                        'lng': float(pt[0])
                    })

            if len(pts) < 2:
                continue

            mid = pts[len(pts) // 2]
            segments.append({
                'uid': 'system_city_import',
                'type': rule_type,
                'text': str(raw_text)[:190],
                'lat': mid['lat'],
                'lng': mid['lng'],
                'pts': pts,
                'createdAt': firestore.SERVER_TIMESTAMP if firebase_admin else datetime.utcnow().isoformat()
            })

    return segments


def main():
    parser = argparse.ArgumentParser(description="ParkPulse - Bulk import city parking segments from GeoJSON")
    parser.add_argument('geojson', help="Path to input regulations GeoJSON file")
    parser.add_argument('--service-account', '-s', default='serviceAccount.json', help="Path to Firebase Service Account JSON")
    parser.add_argument('--dry-run', action='store_true', help="Parse and validate without writing to Firestore")
    args = parser.parse_args()

    print(f"🚗 ParkPulse Importer: reading {args.geojson}...")
    try:
        segments = parse_geojson_features(args.geojson)
    except Exception as e:
        print(f"❌ Error reading GeoJSON: {e}")
        sys.exit(1)

    print(f"✅ Found {len(segments)} valid street parking segments.")
    if not segments:
        print("No valid LineString features found. Exiting.")
        return

    if args.dry_run:
        print("🔍 Dry run active. Sample segment:")
        print(json.dumps(segments[0], indent=2, default=str))
        print("Dry run complete. No data written.")
        return

    if not firebase_admin:
        print("❌ firebase_admin package is required for direct upload. Install via: pip install firebase-admin")
        print("Sample output verified. Re-run after installing.")
        sys.exit(1)

    try:
        cred = credentials.Certificate(args.service_account)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
    except Exception as e:
        print(f"❌ Could not initialize Firebase Admin SDK: {e}")
        print("Tip: Run with --dry-run to test parsing without credentials.")
        sys.exit(1)

    # Firestore batches max 500 operations; using 400 for safety margin per PDF
    batch_size = 400
    total_written = 0

    for i in range(0, len(segments), batch_size):
        chunk = segments[i:i + batch_size]
        batch = db.batch()
        for seg in chunk:
            doc_ref = db.collection('segments').document()
            batch.set(doc_ref, seg)
        batch.commit()
        total_written += len(chunk)
        print(f"📦 Committed {total_written}/{len(segments)} segments to Firestore.")

    print(f"🎉 Successfully imported {total_written} street segments into ParkPulse!")


if __name__ == '__main__':
    main()
