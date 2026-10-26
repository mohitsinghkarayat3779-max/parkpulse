import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ParkMap } from './ParkMap';
import { TopOverlay } from './TopOverlay';
import { BottomOverlay } from './BottomOverlay';
import { ReportSpotModal } from './ReportSpotModal';
import { AddRuleModal } from './AddRuleModal';
import { SpotDetailsModal } from './SpotDetailsModal';
import { RuleDetailsModal } from './RuleDetailsModal';
import { SegmentDetailsModal } from './SegmentDetailsModal';
import { ScanSignModal } from './ScanSignModal';
import { GarageBookingModal } from './GarageBookingModal';
import { PerksRedeemModal } from './PerksRedeemModal';
import { ProPassModal } from './ProPassModal';
import { parkingStore } from '../state/parkingStore';
import { Spot, Garage, Rule, Segment, RuleType } from '../types';
import { Wifi, Battery, Signal, Bell } from 'lucide-react';

interface PhoneScreenProps {
  uid: 'phone-a' | 'phone-b';
  phoneName: string;
  isDual?: boolean;
}

export const PhoneScreen: React.FC<PhoneScreenProps> = ({
  uid,
  phoneName,
  isDual = false,
}) => {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [garages, setGarages] = useState<Garage[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [filter, setFilter] = useState<string | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [pickDest, setPickDest] = useState(false);
  const [center, setCenter] = useState<[number, number]>([29.03, 77.07]);
  const [zoom, setZoom] = useState(15);
  const [searching, setSearching] = useState(false);
  const [isPro, setIsPro] = useState(false);

  // Modals state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [addRuleInitialText, setAddRuleInitialText] = useState('');
  const [addRuleInitialType, setAddRuleInitialType] = useState<RuleType>('paid');
  const [addRuleCoords, setAddRuleCoords] = useState<[number, number]>([29.03, 77.07]);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [selectedGarageForBooking, setSelectedGarageForBooking] = useState<Garage | null>(null);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isPerksOpen, setIsPerksOpen] = useState(false);
  const [isProPassOpen, setIsProPassOpen] = useState(false);
  const [city, setCity] = useState('Murthal');

  // Snackbars & Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Sync with store
  useEffect(() => {
    const update = () => {
      setSpots(parkingStore.getSpots());
      setGarages(parkingStore.getGarages());
      setRules(parkingStore.getRules());
      setSegments(parkingStore.getSegments());
      const u = parkingStore.getUser(uid);
      setUserPoints(u.points);
    };

    update();
    const unsub = parkingStore.subscribe(update);

    // Listen to 500m alerts
    const unsubAlerts = parkingStore.subscribeAlerts((msg) => {
      const alertState = parkingStore.getAlert(uid);
      if (alertState?.alertOn) {
        showToast(msg);
        try {
          confetti({
            particleCount: 25,
            spread: 50,
            origin: { y: 0.7 },
          });
        } catch (_) {}
      }
    });

    return () => {
      unsub();
      unsubAlerts();
    };
  }, [uid]);

  // Reverse geocode city for current center
  const detectCity = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
        { headers: { 'User-Agent': 'ParkPulse/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        const detected =
          data?.address?.city ||
          data?.address?.town ||
          data?.address?.village ||
          data?.address?.county ||
          '';
        if (detected) setCity(detected);
      }
    } catch (_) {}
  };

  useEffect(() => {
    detectCity(center[0], center[1]);
  }, [center]);

  // Nominatim Search
  const handleSearch = async (query: string) => {
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&limit=1`,
        { headers: { 'User-Agent': 'ParkPulse/1.0' } }
      );
      if (res.ok) {
        const list = await res.json();
        if (list && list.length > 0) {
          const lat = parseFloat(list[0].lat);
          const lon = parseFloat(list[0].lon);
          setCenter([lat, lon]);
          setZoom(16);
          detectCity(lat, lon);
        } else {
          showToast('Place not found');
        }
      } else {
        showToast('Search failed. Check your connection.');
      }
    } catch (_) {
      showToast('Search failed. Check your connection.');
    } finally {
      setSearching(false);
    }
  };

  // Map Click
  const handleMapClick = (coords: [number, number]) => {
    if (pickDest) {
      setDestination(coords);
      setPickDest(false);
      parkingStore.setDestinationAlert(uid, coords[0], coords[1]);
      showToast('Alerts on. We will notify you even when the app is closed.');
    }
  };

  // Map Long Press
  const handleMapLongPress = (coords: [number, number]) => {
    setAddRuleCoords(coords);
    setAddRuleInitialText('');
    setAddRuleInitialType('paid');
    setIsAddRuleOpen(true);
  };

  // My location button
  const handleMyLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCenter([pos.coords.latitude, pos.coords.longitude]);
          setZoom(16);
          detectCity(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // If denied, fallback to Murthal
          setCenter([29.03, 77.07]);
          setZoom(16);
          showToast('Allow location access to use this.');
        }
      );
    } else {
      setCenter([29.03, 77.07]);
      setZoom(16);
    }
  };

  // Report spot submission
  const handleSubmitStreetSpot = (note: string) => {
    // Add small random offset around center to simulate parking along the road
    const offsetLat = (Math.random() - 0.5) * 0.003;
    const offsetLng = (Math.random() - 0.5) * 0.003;
    parkingStore.addSpot({
      lat: center[0] + offsetLat,
      lng: center[1] + offsetLng,
      uid,
      city,
      note,
    });
    showToast('Shared. Thanks!');
    try {
      confetti({ particleCount: 30, spread: 60 });
    } catch (_) {}
  };

  const handleSubmitGarage = (name: string, price: number) => {
    const offsetLat = (Math.random() - 0.5) * 0.003;
    const offsetLng = (Math.random() - 0.5) * 0.003;
    parkingStore.addGarage({
      lat: center[0] + offsetLat,
      lng: center[1] + offsetLng,
      uid,
      city,
      name,
      price,
    });
    showToast('Shared. Thanks!');
  };

  // Add rule submission
  const handleSubmitRule = (type: RuleType, text: string) => {
    parkingStore.addRule({
      lat: addRuleCoords[0],
      lng: addRuleCoords[1],
      uid,
      type,
      text,
    });
    showToast('Rule added. +5 points');
  };

  // Taking a spot
  const handleTakeSpot = (spotId: string) => {
    const success = parkingStore.takeSpot(spotId, uid);
    if (success) {
      showToast('Spot marked as taken! (+3 points)');
      try {
        confetti({ particleCount: 40, spread: 70 });
      } catch (_) {}
    }
  };

  // Scan sign forward to rule dialog
  const handleApplyRuleFromScan = (type: RuleType, text: string) => {
    setAddRuleCoords(center);
    setAddRuleInitialType(type);
    setAddRuleInitialText(text);
    setIsAddRuleOpen(true);
  };

  return (
    <div
      className={`relative flex flex-col bg-slate-900 rounded-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden border-[6px] border-slate-800 ${
        isDual ? 'h-[740px] w-full max-w-[420px]' : 'h-[800px] w-full max-w-[430px]'
      }`}
    >
      {/* Device Top Status Bar */}
      <div className="h-7 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between text-[11px] font-semibold text-slate-800 z-[1200] select-none border-b border-slate-100">
        <span>9:41</span>
        {/* Dynamic Island / Camera Notch */}
        <div className="w-20 h-3.5 bg-black rounded-full" />
        <div className="flex items-center gap-1.5 text-slate-700">
          <Signal className="w-3 h-3" />
          <Wifi className="w-3 h-3" />
          <Battery className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Persona Tag for Presenter */}
      <div className="bg-slate-800/90 text-slate-200 text-[10px] font-bold px-4 py-1 flex items-center justify-between border-b border-slate-700 select-none z-[1150]">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              uid === 'phone-a' ? 'bg-blue-400' : 'bg-emerald-400'
            }`}
          />
          {phoneName}
        </span>
        <span className="text-slate-400">
          {destination ? 'Alerts ON' : 'Alerts OFF'}
        </span>
      </div>

      {/* Main Map Layer */}
      <div className="relative flex-1 w-full overflow-hidden">
        <ParkMap
          center={center}
          zoom={zoom}
          spots={spots}
          garages={garages}
          rules={rules}
          segments={segments}
          filter={filter}
          destination={destination}
          pickDest={pickDest}
          onMapClick={handleMapClick}
          onMapLongPress={handleMapLongPress}
          onSelectSpot={(s) => setSelectedSpot(s)}
          onSelectRule={(r) => setSelectedRule(r)}
          onSelectGarage={(g) => setSelectedGarageForBooking(g)}
          onSelectSegment={(seg) => setSelectedSegment(seg)}
          onZoomChange={(z) => setZoom(z)}
        />

        {/* 8.4 Top Overlay with Pro & Perks triggers */}
        <TopOverlay
          points={userPoints}
          filter={filter}
          onFilterChange={(f) => setFilter(f)}
          onSearch={handleSearch}
          searching={searching}
          isPro={isPro}
          onOpenPro={() => setIsProPassOpen(true)}
          onOpenPerks={() => setIsPerksOpen(true)}
        />

        {/* 8.5 Bottom Overlay */}
        <BottomOverlay
          pickDest={pickDest}
          hasDestination={destination !== null}
          onTogglePickDest={() => {
            setPickDest(!pickDest);
            if (!pickDest) {
              showToast('Tap the map to set your destination');
            }
          }}
          onMyLocation={handleMyLocation}
          onReportSpot={() => setIsReportOpen(true)}
          onReportRule={() => {
            setAddRuleCoords(center);
            setAddRuleInitialText('');
            setAddRuleInitialType('paid');
            setIsAddRuleOpen(true);
          }}
          onScanSign={() => setIsScanOpen(true)}
        />

        {/* In-App Floating Snackbar Notification */}
        {toastMessage && (
          <div className="absolute top-36 left-4 right-4 z-[1250] bg-[#0A4296] text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-200 border border-blue-400/30">
            <Bell className="w-4 h-4 text-amber-300 shrink-0 animate-bounce" />
            <span className="flex-1">{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Modals & Bottom Sheets */}
      <ReportSpotModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        city={city}
        onSubmitStreet={handleSubmitStreetSpot}
        onSubmitGarage={handleSubmitGarage}
      />

      <AddRuleModal
        isOpen={isAddRuleOpen}
        onClose={() => setIsAddRuleOpen(false)}
        initialText={addRuleInitialText}
        initialType={addRuleInitialType}
        onSubmit={handleSubmitRule}
      />

      <SpotDetailsModal
        spot={selectedSpot}
        onClose={() => setSelectedSpot(null)}
        onTakeSpot={handleTakeSpot}
      />

      <RuleDetailsModal
        rule={selectedRule}
        onClose={() => setSelectedRule(null)}
      />

      {/* Street Segment Regulation Sheet (_segSheet) */}
      <SegmentDetailsModal
        segment={selectedSegment}
        onClose={() => setSelectedSegment(null)}
      />

      <ScanSignModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onApplyRule={handleApplyRuleFromScan}
      />

      {/* Commercial Garage Booking Modal (B2B Take Rate) */}
      <GarageBookingModal
        garage={selectedGarageForBooking}
        onClose={() => setSelectedGarageForBooking(null)}
        onBooked={(garageName, amount) => {
          showToast(`Reserved ${garageName} for $${amount.toFixed(2)} (Incl. 18% fee)`);
          try {
            confetti({ particleCount: 35, spread: 50 });
          } catch (_) {}
        }}
      />

      {/* Perks & Local Merchant Rewards Flywheel Modal */}
      <PerksRedeemModal
        isOpen={isPerksOpen}
        onClose={() => setIsPerksOpen(false)}
        points={userPoints}
        onRedeem={(cost, title) => {
          parkingStore.addPoints(uid, -cost);
          showToast(`Redeemed "${title}"! Check your wallet.`);
          try {
            confetti({ particleCount: 40, spread: 60 });
          } catch (_) {}
        }}
      />

      {/* Pro Pass Subscription Modal */}
      <ProPassModal
        isOpen={isProPassOpen}
        onClose={() => setIsProPassOpen(false)}
        isPro={isPro}
        onUpgrade={() => {
          setIsPro(true);
          showToast('Upgraded to ParkPulse Pro ($4.99/mo)! Priority alerts active.');
          try {
            confetti({ particleCount: 50, spread: 70 });
          } catch (_) {}
        }}
      />

      {/* Phone Bottom Home Bar */}
      <div className="h-4 bg-white/90 flex items-center justify-center select-none">
        <div className="w-32 h-1 bg-slate-400 rounded-full" />
      </div>
    </div>
  );
};
