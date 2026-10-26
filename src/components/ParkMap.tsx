import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Spot, Garage, Rule, Segment } from '../types';

interface ParkMapProps {
  center: [number, number];
  zoom: number;
  spots: Spot[];
  garages: Garage[];
  rules: Rule[];
  segments: Segment[];
  filter: string | null; // 'free', 'paid', 'garage', or null
  destination: [number, number] | null;
  pickDest: boolean;
  onMapClick: (coords: [number, number]) => void;
  onMapLongPress: (coords: [number, number]) => void;
  onSelectSpot: (spot: Spot) => void;
  onSelectRule: (rule: Rule) => void;
  onSelectGarage: (garage: Garage) => void;
  onSelectSegment: (segment: Segment) => void;
  onZoomChange?: (newZoom: number) => void;
  mapboxToken?: string;
  mapInstanceRef?: React.MutableRefObject<L.Map | null>;
}

export const ParkMap: React.FC<ParkMapProps> = ({
  center,
  zoom,
  spots,
  garages,
  rules,
  segments,
  filter,
  destination,
  pickDest,
  onMapClick,
  onMapLongPress,
  onSelectSpot,
  onSelectRule,
  onSelectGarage,
  onSelectSegment,
  onZoomChange,
  mapboxToken = '',
  mapInstanceRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylinesLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    const tileUrl = mapboxToken
      ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Layer groups: Polylines below markers
    const polylinesGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);
    polylinesLayerRef.current = polylinesGroup;
    markersLayerRef.current = markersGroup;
    mapRef.current = map;
    if (mapInstanceRef) {
      mapInstanceRef.current = map;
    }

    // Zoom listener
    map.on('zoomend', () => {
      const z = map.getZoom();
      setCurrentZoom(z);
      if (onZoomChange) onZoomChange(z);
    });

    // Handle map clicks and long presses
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    });

    // Simulated Long Press via mousedown / touchstart
    const handleStart = (lat: number, lng: number) => {
      longPressTimerRef.current = setTimeout(() => {
        onMapLongPress([lat, lng]);
      }, 700);
    };

    const handleClear = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    map.on('mousedown', (e: L.LeafletMouseEvent) => {
      handleStart(e.latlng.lat, e.latlng.lng);
    });
    map.on('mouseup mousemove zoomstart dragstart', handleClear);

    map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      onMapLongPress([e.latlng.lat, e.latlng.lng]);
    });

    return () => {
      handleClear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center when changed externally
  useEffect(() => {
    if (mapRef.current) {
      const current = mapRef.current.getCenter();
      if (Math.abs(current.lat - center[0]) > 0.0001 || Math.abs(current.lng - center[1]) > 0.0001) {
        mapRef.current.setView(center, zoom, { animate: true });
      }
    }
  }, [center, zoom]);

  // Render Polylines and Markers
  useEffect(() => {
    if (!mapRef.current || !polylinesLayerRef.current || !markersLayerRef.current) return;
    const polyLayer = polylinesLayerRef.current;
    const markLayer = markersLayerRef.current;

    polyLayer.clearLayers();
    markLayer.clearLayers();

    // 1. Destination Marker (red place marker, size 40)
    if (destination) {
      const destIcon = L.divIcon({
        className: 'custom-dest-pin',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            transform: translate(-50%, -100%);
            filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));
            cursor: pointer;
          ">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="#EF4444" stroke="#ffffff" stroke-width="1.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [0, 0],
      });

      const destMarker = L.marker(destination, { icon: destIcon });
      destMarker.bindTooltip('Alert Target (500m zone)', { permanent: false });
      markLayer.addLayer(destMarker);

      // Destination 500m radius circle indicator
      const destCircle = L.circle(destination, {
        radius: 500,
        color: '#EF4444',
        weight: 1.5,
        fillColor: '#EF4444',
        fillOpacity: 0.08,
        dashArray: '4, 6',
      });
      markLayer.addLayer(destCircle);
    }

    // 2. Colored Street Segments (Polylines)
    // Per PDF spec:
    // - Zoom < 15: Hide segments, do not run segment queries.
    // - Filter == 'garage': hide all lines.
    // - Filter == 'free': show green lines only.
    // - Filter == 'paid': show blue lines only.
    if (currentZoom >= 15 && filter !== 'garage') {
      segments.forEach((seg) => {
        if (filter !== null && filter !== seg.type) return;

        let strokeColor = '#1E6FD9'; // paid blue
        let labelText = 'PAID';
        if (seg.type === 'free') {
          strokeColor = '#4CAF50'; // free green
          labelText = 'FREE';
        } else if (seg.type === 'no') {
          strokeColor = '#E53935'; // no parking red
          labelText = 'NO PARKING';
        }

        // Draw street polyline directly on the road
        const polyline = L.polyline(seg.pts, {
          color: strokeColor,
          weight: 6,
          opacity: 0.92,
          lineCap: 'round',
          lineJoin: 'round',
        });

        polyline.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectSegment(seg);
        });

        polyLayer.addLayer(polyline);

        // Zoom >= 16: Display centered text labels with white drop shadow at segment midpoint
        if (currentZoom >= 16 && seg.pts.length > 0) {
          const midIdx = Math.floor(seg.pts.length / 2);
          const midPt = seg.pts[midIdx];

          const labelIcon = L.divIcon({
            className: 'custom-segment-label',
            html: `
              <div style="
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background-color: ${strokeColor};
                color: white;
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.5px;
                padding: 2px 7px;
                border-radius: 4px;
                border: 1.5px solid white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.35);
                text-shadow: 0 1px 2px rgba(0,0,0,0.4);
                cursor: pointer;
                white-space: nowrap;
                transform: translate(-50%, -50%);
                user-select: none;
                transition: transform 0.15s ease;
              " onmouseover="this.style.transform='translate(-50%, -50%) scale(1.1)'" onmouseout="this.style.transform='translate(-50%, -50%) scale(1)'">
                ${labelText}
              </div>
            `,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          });

          const labelMarker = L.marker(midPt, { icon: labelIcon });
          labelMarker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onSelectSegment(seg);
          });
          polyLayer.addLayer(labelMarker);
        }
      });
    }

    // 3. Rule Markers (34x34 circles)
    // Per PDF spec:
    // When zoom >= 16, HIDE circle rule pins because colored street lines with midpoint labels
    // take precedence cleanly on the street. When zoom < 16, show circle rule pins.
    if (currentZoom < 16 && filter !== 'garage') {
      rules.forEach((rule) => {
        if (filter !== null && filter !== rule.type) return;

        let bg = '#1E6FD9'; // paid
        let svgIcon = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        `;

        if (rule.type === 'free') {
          bg = '#4CAF50'; // green
          svgIcon = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          `;
        } else if (rule.type === 'no') {
          bg = '#E53935'; // red
          svgIcon = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
            </svg>
          `;
        }

        const ruleIcon = L.divIcon({
          className: 'custom-rule-marker',
          html: `
            <div style="
              width: 34px;
              height: 34px;
              background-color: ${bg};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 3px 6px rgba(0,0,0,0.25);
              border: 2px solid white;
              cursor: pointer;
              transition: transform 0.15s ease;
            " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
              ${svgIcon}
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const marker = L.marker([rule.lat, rule.lng], { icon: ruleIcon });
        marker.on('click', () => onSelectRule(rule));
        markLayer.addLayer(marker);
      });
    }

    // 4. Garage Markers (80 by 60, only when filter == 'garage')
    if (filter === 'garage') {
      garages.forEach((garage) => {
        const garageIcon = L.divIcon({
          className: 'custom-garage-marker',
          html: `
            <div style="
              width: 80px;
              height: 60px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              cursor: pointer;
            ">
              <div style="
                width: 36px;
                height: 36px;
                background-color: #0A4296;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 18px;
                font-weight: 800;
                box-shadow: 0 3px 6px rgba(0,0,0,0.3);
                border: 2px solid white;
              ">
                P
              </div>
              <div style="
                margin-top: 2px;
                color: #0A4296;
                font-size: 12px;
                font-weight: 600;
                background: rgba(255,255,255,0.9);
                padding: 1px 6px;
                border-radius: 4px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.15);
              ">
                $${garage.price.toFixed(0)}/hr
              </div>
            </div>
          `,
          iconSize: [80, 60],
          iconAnchor: [40, 30],
        });

        const marker = L.marker([garage.lat, garage.lng], { icon: garageIcon });
        marker.on('click', () => onSelectGarage(garage));
        markLayer.addLayer(marker);
      });
    }

    // 5. Open-Spot Markers (40 by 40 navy circles with white P icon)
    // Constraint: DO NOT claim lines represent open parking spots; open spots remain navy "P" pins!
    if (filter !== 'garage') {
      spots.forEach((spot) => {
        if (spot.taken) return;

        const spotIcon = L.divIcon({
          className: 'custom-spot-marker',
          html: `
            <div style="
              width: 40px;
              height: 40px;
              background-color: #0A4296;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 8px rgba(0,0,0,0.3);
              border: 2.5px solid white;
              cursor: pointer;
              transition: transform 0.2s ease;
            " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                <path d="M9 3h4.5a5.5 5.5 0 0 1 5.5 5.5c0 2.8-2.07 5.12-4.75 5.46V19a2 2 0 0 1-4 0V3zm0 4v4h4.5a1.5 1.5 0 0 0 0-3H9z"/>
              </svg>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([spot.lat, spot.lng], { icon: spotIcon });
        marker.on('click', () => onSelectSpot(spot));
        markLayer.addLayer(marker);
      });
    }
  }, [spots, garages, rules, segments, filter, destination, currentZoom]);

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  return (
    <div className="relative w-full h-full select-none">
      <div
        ref={containerRef}
        className={`w-full h-full ${pickDest ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      />
      {pickDest && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-blue-900/90 text-white text-xs px-4 py-2 rounded-full shadow-lg backdrop-blur pointer-events-none animate-pulse">
          🎯 Destination Mode Active: Tap anywhere on map
        </div>
      )}

      {/* Floating Zoom & Level Indicator */}
      <div className="absolute bottom-24 right-3 z-[900] flex flex-col gap-1.5 items-end">
        <div className="bg-white/90 backdrop-blur text-[10px] font-bold text-slate-700 px-2 py-0.5 rounded shadow-sm border border-slate-200">
          Zoom {currentZoom.toFixed(1)} {currentZoom >= 16 ? '(Lines + Labels)' : currentZoom >= 15 ? '(Lines)' : '(Pins)'}
        </div>
        <div className="flex flex-col bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:bg-slate-200 text-base font-bold transition-colors"
            title="Zoom In"
          >
            +
          </button>
          <div className="w-full h-px bg-slate-200" />
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:bg-slate-200 text-base font-bold transition-colors"
            title="Zoom Out"
          >
            &minus;
          </button>
        </div>
      </div>
    </div>
  );
};
