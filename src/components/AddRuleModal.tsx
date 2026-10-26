import React, { useState, useEffect } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { RuleType } from '../types';

interface AddRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  initialType?: RuleType;
  onSubmit: (type: RuleType, text: string) => void;
}

export const AddRuleModal: React.FC<AddRuleModalProps> = ({
  isOpen,
  onClose,
  initialText = '',
  initialType = 'paid',
  onSubmit,
}) => {
  const [ruleType, setRuleType] = useState<RuleType>(initialType);
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setRuleType(initialType);
    }
  }, [isOpen, initialText, initialType]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(ruleType, text.trim());
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150 border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0A4296] flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Add a sign or rule here
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Rule Type
            </label>
            <select
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as RuleType)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A4296] bg-white"
            >
              <option value="free">Free parking</option>
              <option value="paid">Paid or time limit</option>
              <option value="no">No parking</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Sign text / restriction
              </label>
              <span className="text-[11px] text-slate-400">
                {text.length}/150
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 150))}
              placeholder="2 HR, 8AM-6PM, Mon-Fri"
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A4296]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#0A4296] hover:bg-blue-900 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>Save</span>
              <span className="text-amber-300 text-xs font-semibold">(+5 pts)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
