import React from 'react';
import { Segment } from '../types';
import { Info, X, DollarSign, Ban, CheckCircle2 } from 'lucide-react';

interface SegmentDetailsModalProps {
  segment: Segment | null;
  onClose: () => void;
}

export const SegmentDetailsModal: React.FC<SegmentDetailsModalProps> = ({
  segment,
  onClose,
}) => {
  if (!segment) return null;

  const getStyle = () => {
    switch (segment.type) {
      case 'free':
        return {
          title: 'Free Parking',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          badgeBg: 'bg-emerald-600',
          badgeText: 'FREE',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
          accent: '#4CAF50',
        };
      case 'paid':
        return {
          title: 'Paid / Metered Parking',
          bg: 'bg-blue-50 text-blue-900 border-blue-200',
          badgeBg: 'bg-[#1E6FD9]',
          badgeText: 'PAID',
          icon: <DollarSign className="w-5 h-5 text-[#1E6FD9]" />,
          accent: '#1E6FD9',
        };
      case 'no':
        return {
          title: 'No Parking Zone',
          bg: 'bg-rose-50 text-rose-900 border-rose-200',
          badgeBg: 'bg-rose-600',
          badgeText: 'NO PARKING',
          icon: <Ban className="w-5 h-5 text-rose-600" />,
          accent: '#E53935',
        };
    }
  };

  const config = getStyle();

  return (
    <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar handle for mobile bottom sheet look */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-2 mb-1 sm:hidden" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: `${config.accent}15` }}
            >
              {config.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">{config.title}</h3>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded text-white ${config.badgeBg}`}>
                  {config.badgeText}
                </span>
              </div>
              <p className="text-xs text-slate-500">Street Segment Regulation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Regulation Details */}
        <div className={`p-4 rounded-xl border ${config.bg}`}>
          <div className="text-sm font-semibold leading-relaxed">
            {segment.text}
          </div>
        </div>

        {/* Exact helper note from PDF spec */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs leading-relaxed">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>
            Colored lines show street parking rules. Tap open spot pins to claim available spaces.
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors shadow-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
