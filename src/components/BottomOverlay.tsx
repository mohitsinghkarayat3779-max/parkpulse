import React from 'react';
import { Bell, X, Navigation, MapPin, ParkingCircle, ScanLine } from 'lucide-react';

interface BottomOverlayProps {
  pickDest: boolean;
  hasDestination: boolean;
  onTogglePickDest: () => void;
  onMyLocation: () => void;
  onReportSpot: () => void;
  onReportRule: () => void;
  onScanSign: () => void;
}

export const BottomOverlay: React.FC<BottomOverlayProps> = ({
  pickDest,
  hasDestination,
  onTogglePickDest,
  onMyLocation,
  onReportSpot,
  onReportRule,
  onScanSign,
}) => {
  return (
    <div className="absolute bottom-3 left-3 right-3 z-[1100] flex flex-col gap-3 pointer-events-none select-none">
      {/* 1. Bottom-aligned Action Row */}
      <div className="flex items-end justify-between pointer-events-auto">
        {/* Left: Tonal filled Destination Alert Button */}
        <div>
          <button
            type="button"
            onClick={onTogglePickDest}
            className={`px-3.5 py-2.5 rounded-full font-medium text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 ${
              pickDest
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : hasDestination
                ? 'bg-blue-100 text-[#0A4296] border border-blue-200'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            {pickDest ? (
              <>
                <X className="w-4 h-4 text-amber-700" />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <Bell className={`w-4 h-4 ${hasDestination ? 'text-[#0A4296] fill-[#0A4296]/20' : 'text-slate-600'}`} />
                <span>{hasDestination ? 'Alerts on' : 'Get open spot alerts'}</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Column aligned right with 10px gaps */}
        <div className="flex flex-col items-end gap-2.5">
          {/* Small round "my location" button */}
          <button
            type="button"
            onClick={onMyLocation}
            aria-label="Center on my location"
            className="w-10 h-10 rounded-full bg-white text-slate-700 shadow-md flex items-center justify-center hover:bg-slate-50 active:scale-95 border border-slate-200 transition-all"
          >
            <Navigation className="w-5 h-5 text-[#0A4296]" />
          </button>

          {/* Extended Red Button: Report Spot */}
          <button
            type="button"
            onClick={onReportSpot}
            className="px-4 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md flex items-center gap-2 font-semibold text-sm active:scale-95 transition-all shadow-red-600/30"
          >
            <MapPin className="w-4 h-4" />
            <span>Report Spot</span>
          </button>

          {/* Extended Blue Button: Report Rule */}
          <button
            type="button"
            onClick={onReportRule}
            className="px-4 py-2.5 rounded-full bg-[#1E6FD9] hover:bg-blue-600 text-white shadow-md flex items-center gap-2 font-semibold text-sm active:scale-95 transition-all shadow-blue-600/30"
          >
            <ParkingCircle className="w-4 h-4" />
            <span>Report Rule</span>
          </button>
        </div>
      </div>

      {/* 2. Full-width-ish filled button: Scan Parking Sign */}
      <div className="flex justify-center pointer-events-auto">
        <button
          type="button"
          onClick={onScanSign}
          style={{ backgroundColor: '#1F1FA8' }}
          className="w-full max-w-[340px] min-h-[52px] rounded-full text-white shadow-lg flex items-center justify-center gap-2.5 font-bold text-[16px] hover:opacity-95 active:scale-98 transition-all"
        >
          <ScanLine className="w-5 h-5" />
          <span>Scan Parking Sign</span>
        </button>
      </div>
    </div>
  );
};
