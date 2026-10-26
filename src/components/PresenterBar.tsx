import React from 'react';
import { Smartphone, Users, Code, RotateCcw, Sparkles, TrendingUp, Rocket } from 'lucide-react';

interface PresenterBarProps {
  activePhone: 'phone-a' | 'phone-b';
  dualPhoneMode: boolean;
  onSelectPhone: (phone: 'phone-a' | 'phone-b') => void;
  onToggleDualPhone: () => void;
  onOpenCode: () => void;
  onOpenRevenue: () => void;
  onOpenDeploy: () => void;
  onResetData: () => void;
  currentDemoStep?: number;
  onSelectDemoStep?: (step: number) => void;
}

export const PresenterBar: React.FC<PresenterBarProps> = ({
  activePhone,
  dualPhoneMode,
  onSelectPhone,
  onToggleDualPhone,
  onOpenCode,
  onOpenRevenue,
  onOpenDeploy,
  onResetData,
}) => {
  return (
    <div className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-[1400] select-none shadow-md">
      {/* Brand & Persona Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-blue-400">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>ParkPulse</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Founder:</span>
            <span className="font-bold text-white tracking-wide">Mohit Singh Karayat</span>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-700 hidden sm:block" />

        {/* Phone switch pills */}
        <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
          <button
            type="button"
            onClick={() => {
              if (dualPhoneMode) onToggleDualPhone();
              onSelectPhone('phone-a');
            }}
            className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
              !dualPhoneMode && activePhone === 'phone-a'
                ? 'bg-[#0A4296] text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-300" />
            <span>Phone A (Scout)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (dualPhoneMode) onToggleDualPhone();
              onSelectPhone('phone-b');
            }}
            className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
              !dualPhoneMode && activePhone === 'phone-b'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
            <span>Phone B (Driver)</span>
          </button>

          <button
            type="button"
            onClick={onToggleDualPhone}
            className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
              dualPhoneMode
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-300" />
            <span>Dual Phone Mode</span>
          </button>
        </div>
      </div>

      {/* Action Tools */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenDeploy}
          className="px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 border border-blue-400/40"
        >
          <Rocket className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>Download &amp; Deploy</span>
        </button>

        <button
          type="button"
          onClick={onOpenRevenue}
          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors border border-emerald-400/40"
        >
          <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
          <span>Startup Revenue Model</span>
        </button>

        <button
          type="button"
          onClick={onResetData}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 border border-slate-700 transition-colors"
          title="Reset sample spots and points"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden md:inline">Reset Demo</span>
        </button>

        <button
          type="button"
          onClick={onOpenCode}
          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Code className="w-3.5 h-3.5" />
          <span>Flutter &amp; AI Source</span>
        </button>
      </div>
    </div>
  );
};
