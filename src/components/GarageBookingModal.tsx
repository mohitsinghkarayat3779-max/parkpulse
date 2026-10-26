import React, { useState } from 'react';
import { X, Building2, Clock, ShieldCheck, CreditCard, Sparkles, CheckCircle2 } from 'lucide-react';
import { Garage } from '../types';

interface GarageBookingModalProps {
  garage: Garage | null;
  onClose: () => void;
  onBooked: (garageName: string, amount: number) => void;
}

export const GarageBookingModal: React.FC<GarageBookingModalProps> = ({
  garage,
  onClose,
  onBooked,
}) => {
  const [hours, setHours] = useState(2);
  const [bookedSuccess, setBookedSuccess] = useState(false);

  if (!garage) return null;

  const hourlyRate = garage.price || 3.0;
  const subtotal = hourlyRate * hours;
  const platformFee = Math.round(subtotal * 0.18 * 100) / 100; // 18% take rate
  const total = subtotal + platformFee;

  const handleConfirm = () => {
    setBookedSuccess(true);
    setTimeout(() => {
      onBooked(garage.name, total);
      setBookedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[1250] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl p-6 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200 border border-slate-100 text-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-[#0A4296]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {garage.name}
              </h2>
              <span className="text-[11px] font-semibold text-emerald-600">
                Partner Garage &bull; Guaranteed Space
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

        {bookedSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 animate-bounce" />
            <h3 className="text-lg font-bold text-slate-900">Spot Reserved!</h3>
            <p className="text-xs text-slate-500 max-w-xs">
              Your guaranteed parking space is reserved for {hours} hours. Navigate to entry gate with QR code.
            </p>
          </div>
        ) : (
          <>
            {/* Hours Selector */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Parking Duration:</span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHours(h)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                      hours === h
                        ? 'bg-[#0A4296] text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            {/* Price Breakdown showing 18% Marketplace Take Rate */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Garage Rate ({hours}h @ ${hourlyRate.toFixed(2)}/h)</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="flex items-center gap-1">
                  <span>ParkPulse Platform Fee (18%)</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-700 font-bold rounded">
                    B2B Cut
                  </span>
                </span>
                <span className="font-semibold text-blue-700">+${platformFee.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
                <span>Total Charge</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              className="w-full py-3.5 rounded-xl bg-[#0A4296] hover:bg-blue-900 text-white font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Book &amp; Reserve Spot (${total.toFixed(2)})</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
