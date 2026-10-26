import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Spot, Garage, Rule } from '../types';

interface ParkMapProps {
  center: [number, number];
  zoom: number;
  spots: Spot[];
  garages: Garage[];
  rules: Rule[];
  filter: string | null; // 'free', 'paid', 'garage', or null
  destination: [number, number] | null;
  pickDest: boolean;
  onMapClick: (coords: [number, number]) => void;
  onMapLongPress: (coords: [number, number]) => void;
  onSelectSpot: (spot: Spot) => void;
  onSelectRule: (rule: Rule) => void;
  onSelectGarage: (garage: Garage) => void;
  mapboxToken?: string;
  mapInstanceRef?: React.MutableRefObject<L.Map | null>;
}

export const ParkMap: React.FC<ParkMapProps> = ({
  center,
  zoom,
  spots,
  garages,
  rules,
  filter,
  destination,
  pickDest,
  onMapClick,
  onMapLongPress,
  onSelectSpot,
  onSelectRule,
  onSelectGarage,
  mapboxToken = '',
  mapInstanceRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

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

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapRef.current = map;
    if (mapInstanceRef) {
      mapInstanceRef.current = map;
    }

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
      // Right-click also acts as long press
      e.originalEvent.preventDefault();
      onMapLongPress([e.latlng.lat, e.latlng.lng]);
    });

    return () => {
      handleClear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center when changed from search or my-location
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom, { animate: true });
    }
  }, [center, zoom]);

  // Update Markers when spots, rules, garages, filter, or destination changes
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();

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
      layer.addLayer(destMarker);

      // Destination 500m radius circle indicator
      const destCircle = L.circle(destination, {
        radius: 500,
        color: '#EF4444',
        weight: 1.5,
        fillColor: '#EF4444',
        fillOpacity: 0.08,
        dashArray: '4, 6',
      });
      layer.addLayer(destCircle);
    }

    // 2. Rule Markers (34x34 circles)
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
        bg = '#16A34A'; // green
        svgIcon = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        `;
      } else if (rule.type === 'no') {
        bg = '#DC2626'; // red
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
      layer.addLayer(marker);
    });

    // 3. Garage Markers (80 by 60, only when filter == 'garage')
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
        layer.addLayer(marker);
      });
    }

    // 4. Open-Spot Markers (40 by 40 navy circles with white P icon)
    // Shown unless filter is garage, and only where taken != true
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
        layer.addLayer(marker);
      });
    }
  }, [spots, garages, rules, filter, destination]);

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
    </div>
  );
};
