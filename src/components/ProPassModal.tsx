import React, { useState } from 'react';
import { X, Crown, Zap, ShieldCheck, Clock, CheckCircle2, Sparkles } from 'lucide-react';

interface ProPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPro: boolean;
  onUpgrade: () => void;
}

export const ProPassModal: React.FC<ProPassModalProps> = ({
  isOpen,
  onClose,
  isPro,
  onUpgrade,
}) => {
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubscribe = () => {
    setSuccess(true);
    setTimeout(() => {
      onUpgrade();
      setSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[1250] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in select-none">
      <div className="w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl p-6 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200 border border-slate-100 text-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                ParkPulse Pro Pass
              </h2>
              <span className="text-[11px] font-semibold text-purple-700">
                Premium Driver Subscription &bull; $4.99/mo
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <CheckCircle2 className="w-14 h-14 text-purple-600 animate-bounce" />
            <h3 className="text-lg font-bold text-slate-900">Welcome to Pro!</h3>
            <p className="text-xs text-slate-500 max-w-xs">
              Priority alerts activated and 10-minute spot hold guarantee unlocked.
            </p>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 text-xs space-y-3">
              <div className="font-bold text-purple-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Everything you get for $4.99/month:</span>
              </div>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Priority 0-Latency Alerts</strong>: Get notified 3 minutes before free drivers when street spots open.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span><strong>10-Minute Spot Hold</strong>: Reserve an open street spot while driving to it.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>AI Parking Ticket Protection</strong>: Unlimited camera scans + automated contest letters if ticketed wrongfully.</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              disabled={isPro}
              onClick={handleSubscribe}
              className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 ${
                isPro
                  ? 'bg-emerald-600 cursor-default'
                  : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>{isPro ? 'You are a Pro Member' : 'Upgrade to Pro ($4.99/month)'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
