import React, { useState } from 'react';
import { X, Building2, Car } from 'lucide-react';

interface ReportSpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  city: string;
  onSubmitStreet: (note: string) => void;
  onSubmitGarage: (name: string, price: number) => void;
}

export const ReportSpotModal: React.FC<ReportSpotModalProps> = ({
  isOpen,
  onClose,
  city,
  onSubmitStreet,
  onSubmitGarage,
}) => {
  const [type, setType] = useState<'Street' | 'Garage'>('Street');
  const [noteOrName, setNoteOrName] = useState('');
  const [price, setPrice] = useState('3.00');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'Street') {
      onSubmitStreet(noteOrName.trim());
    } else {
      const parsedPrice = parseFloat(price) || 0;
      onSubmitGarage(noteOrName.trim(), parsedPrice);
    }
    setNoteOrName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl p-6 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200 border border-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-slate-900">
            Report parking spot
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Button "Street" / "Garage" */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setType('Street')}
            className={`py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              type === 'Street'
                ? 'bg-white text-[#0A4296] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Street</span>
          </button>
          <button
            type="button"
            onClick={() => setType('Garage')}
            className={`py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              type === 'Garage'
                ? 'bg-white text-[#0A4296] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Garage</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {type === 'Street' ? 'Optional note' : 'Garage name'}
            </label>
            <input
              type="text"
              value={noteOrName}
              onChange={(e) => setNoteOrName(e.target.value)}
              placeholder={
                type === 'Street'
                  ? 'e.g. opposite the cafe, shady tree'
                  : 'e.g. Central City Parkade'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A4296] focus:border-transparent"
            />
          </div>

          {type === 'Garage' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Price per hour ($)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A4296] focus:border-transparent"
              />
            </div>
          )}

          <div className="text-xs text-slate-500 font-medium">
            {city ? `City: ${city}` : 'City not detected'}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#0A4296] text-white font-bold text-sm hover:bg-blue-900 active:scale-98 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>Save spot</span>
            <span className="text-amber-300 text-xs font-semibold">(+10 pts)</span>
          </button>
        </form>
      </div>
    </div>
  );
};
