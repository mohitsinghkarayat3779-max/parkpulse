import React, { useState } from 'react';
import { Search, X, CircleDollarSign, Banknote, DollarSign, Car, Gift, Crown } from 'lucide-react';

interface TopOverlayProps {
  points: number;
  filter: string | null;
  onFilterChange: (filter: string | null) => void;
  onSearch: (query: string) => Promise<void>;
  searching: boolean;
  isPro?: boolean;
  onOpenPro?: () => void;
  onOpenPerks?: () => void;
}

export const TopOverlay: React.FC<TopOverlayProps> = ({
  points,
  filter,
  onFilterChange,
  onSearch,
  searching,
  isPro = false,
  onOpenPro,
  onOpenPerks,
}) => {
  const [searchValue, setSearchValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      onSearch(searchValue.trim());
    }
  };

  const handleClear = () => {
    setSearchValue('');
  };

  const toggleFilter = (type: string) => {
    onFilterChange(filter === type ? null : type);
  };

  return (
    <div className="absolute top-2 left-3 right-3 z-[1100] flex flex-col pointer-events-none select-none">
      {/* 1. Header Cards Row */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-100 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#0A4296] text-white flex items-center justify-center font-black text-xs">
              P
            </div>
            <span className="font-extrabold text-[15px] text-[#0A4296] tracking-tight">
              ParkPulse
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenPro}
            className={`px-2 py-1 rounded-xl shadow-xs font-bold text-[10px] flex items-center gap-1 transition-all ${
              isPro
                ? 'bg-purple-600 text-white'
                : 'bg-white/90 text-purple-700 hover:bg-white border border-purple-200'
            }`}
            title="ParkPulse Pro Pass ($4.99/mo)"
          >
            <Crown className="w-3 h-3 text-amber-400" />
            <span>{isPro ? 'PRO' : 'GET PRO'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenPerks}
            className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-md border border-slate-100 flex items-center gap-1.5 hover:bg-white transition-all text-xs font-semibold text-slate-700 active:scale-95"
            title="Redeem points for local perks"
          >
            <CircleDollarSign className="w-4 h-4 text-amber-500 fill-amber-400 stroke-amber-600" />
            <span className="font-bold text-[15px] text-slate-800 tabular-nums">
              {points}
            </span>
            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded font-bold text-[9px]">
              REDEEM
            </span>
          </button>
        </div>
      </div>

      <div className="h-2" />

      {/* 2. Elevation 2 Search Field with 16px rounded corners */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-white shadow-md rounded-[16px] overflow-hidden pointer-events-auto border border-slate-100 transition-shadow focus-within:shadow-lg"
      >
        <div className="flex items-center px-3.5 py-2.5">
          <Search className={`w-5 h-5 text-slate-400 mr-2.5 ${searching ? 'animate-spin' : ''}`} />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search address or place"
            className="w-full text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none border-none focus:ring-0 p-0"
          />
          {searchValue && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search text"
              className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      <div className="h-2" />

      {/* 3. FilterChips scrollable row */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto py-0.5">
        <button
          type="button"
          onClick={() => toggleFilter('free')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
            filter === 'free'
              ? 'bg-green-700 text-white shadow-green-700/30'
              : 'bg-white/95 text-slate-700 hover:bg-white border border-slate-200'
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span>Free</span>
        </button>

        <button
          type="button"
          onClick={() => toggleFilter('paid')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
            filter === 'paid'
              ? 'bg-[#1E6FD9] text-white shadow-blue-700/30'
              : 'bg-white/95 text-slate-700 hover:bg-white border border-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Paid</span>
        </button>

        <button
          type="button"
          onClick={() => toggleFilter('garage')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
            filter === 'garage'
              ? 'bg-[#0A4296] text-white shadow-blue-900/30'
              : 'bg-white/95 text-slate-700 hover:bg-white border border-slate-200'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Garages</span>
        </button>
      </div>
    </div>
  );
};
