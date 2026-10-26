import React from 'react';
import { X, ShieldAlert, Banknote, DollarSign, Ban } from 'lucide-react';
import { Rule } from '../types';

interface RuleDetailsModalProps {
  rule: Rule | null;
  onClose: () => void;
}

export const RuleDetailsModal: React.FC<RuleDetailsModalProps> = ({ rule, onClose }) => {
  if (!rule) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl p-[20px] flex flex-col gap-4 animate-in slide-in-from-bottom duration-200 border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {rule.type === 'free' ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5" />
                Free Parking
              </span>
            ) : rule.type === 'paid' ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-[#0A4296] flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                Paid / Time Limit
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 flex items-center gap-1">
                <Ban className="w-3.5 h-3.5" />
                No Parking
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 8.8 Rule sheet: padding 20, the rule text at size 18 */}
        <div className="text-[18px] font-medium text-slate-900 leading-relaxed">
          {rule.text}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
