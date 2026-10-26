import React, { useState } from 'react';
import { X, Gift, Coffee, Car, Sparkles, CheckCircle2, Ticket } from 'lucide-react';

interface PerksRedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  points: number;
  onRedeem: (cost: number, perkTitle: string) => void;
}

interface Perk {
  id: string;
  title: string;
  merchant: string;
  pointsCost: number;
  desc: string;
  icon: 'coffee' | 'car' | 'parking';
  sponsored: boolean;
}

const PERKS: Perk[] = [
  {
    id: 'perk-1',
    title: '$2.00 Off Coffee & Pastry',
    merchant: 'Blue Bottle Cafe (50m from spot)',
    pointsCost: 30,
    desc: 'Show QR code to barista for instant $2 off your order.',
    icon: 'coffee',
    sponsored: true,
  },
  {
    id: 'perk-2',
    title: '$5 Off Premium Car Wash',
    merchant: 'Sparkle Express Wash',
    pointsCost: 50,
    desc: 'Redeemable at 4 locations in the downtown core.',
    icon: 'car',
    sponsored: true,
  },
  {
    id: 'perk-3',
    title: '1 Hour Free Garage Credit',
    merchant: 'ParkPulse Network Lots',
    pointsCost: 40,
    desc: 'Applied automatically to your next commercial lot booking.',
    icon: 'parking',
    sponsored: false,
  },
];

export const PerksRedeemModal: React.FC<PerksRedeemModalProps> = ({
  isOpen,
  onClose,
  points,
  onRedeem,
}) => {
  const [redeemedId, setRedeemedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClaim = (perk: Perk) => {
    if (points < perk.pointsCost) return;
    setRedeemedId(perk.id);
    setTimeout(() => {
      onRedeem(perk.pointsCost, perk.title);
      setRedeemedId(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[1250] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in select-none">
      <div className="w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl p-6 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200 border border-slate-100 text-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Redeem Perks &amp; Rewards
              </h2>
              <span className="text-[11px] text-slate-500">
                You have <strong className="text-amber-600">{points} points</strong> earned from crowdsourcing
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

        {/* Flywheel Explanation Note */}
        <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/70 text-[11px] text-amber-900 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Startup Monetization Loop</strong>: Local merchants pay ParkPulse $75/mo to sponsor parking perks, driving high-intent foot traffic from parked drivers!
          </span>
        </div>

        {/* Perks List */}
        <div className="space-y-2.5">
          {PERKS.map((perk) => {
            const canAfford = points >= perk.pointsCost;
            const isClaimed = redeemedId === perk.id;

            return (
              <div
                key={perk.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isClaimed
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {perk.icon === 'coffee' ? (
                      <Coffee className="w-4 h-4 text-amber-700" />
                    ) : perk.icon === 'car' ? (
                      <Car className="w-4 h-4 text-blue-700" />
                    ) : (
                      <Ticket className="w-4 h-4 text-purple-700" />
                    )}
                    <span className="font-bold text-xs text-slate-900">
                      {perk.title}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-amber-100 text-amber-900">
                    {perk.pointsCost} pts
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 mb-2">
                  {perk.merchant} &bull; {perk.desc}
                </div>

                <button
                  type="button"
                  disabled={!canAfford || isClaimed}
                  onClick={() => handleClaim(perk)}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isClaimed
                      ? 'bg-emerald-600 text-white'
                      : canAfford
                      ? 'bg-[#0A4296] hover:bg-blue-900 text-white shadow-xs active:scale-98'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isClaimed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Coupon Claimed!</span>
                    </>
                  ) : canAfford ? (
                    <span>Redeem ({perk.pointsCost} pts)</span>
                  ) : (
                    <span>Need {perk.pointsCost - points} more pts</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
