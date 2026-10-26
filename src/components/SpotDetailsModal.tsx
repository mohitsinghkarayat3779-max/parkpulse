import React from 'react';
import { X, CheckCircle, Clock, MapPin, Sparkles } from 'lucide-react';
import { Spot } from '../types';

interface SpotDetailsModalProps {
  spot: Spot | null;
  onClose: () => void;
  onTakeSpot: (spotId: string) => void;
}

export const SpotDetailsModal: React.FC<SpotDetailsModalProps> = ({
  spot,
  onClose,
  onTakeSpot,
}) => {
  if (!spot) return null;

  const minAgo = Math.max(0, Math.floor((Date.now() - spot.createdAt) / (60 * 1000)));

  const handleTake = () => {
    onTakeSpot(spot.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl p-6 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200 border border-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-slate-900 flex items-center gap-2">
            <span>Open spot</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>Reported {minAgo} min ago</span>
        </div>

        {spot.city && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>Near {spot.city}</span>
          </div>
        )}

        {spot.note && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 italic">
            "{spot.note}"
          </div>
        )}

        <button
          type="button"
          onClick={handleTake}
          className="w-full py-3.5 rounded-xl bg-[#0A4296] hover:bg-blue-900 text-white font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>I took it (+3 points)</span>
        </button>
      </div>
    </div>
  );
};
