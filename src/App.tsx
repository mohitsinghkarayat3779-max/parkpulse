import React, { useState } from 'react';
import { PhoneScreen } from './components/PhoneScreen';
import { PresenterBar } from './components/PresenterBar';
import { CodeRepositoryModal } from './components/CodeRepositoryModal';
import { RevenueModelModal } from './components/RevenueModelModal';
import { DeployModal } from './components/DeployModal';
import { parkingStore } from './state/parkingStore';
import {
  Compass,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

export default function App() {
  const [activePhone, setActivePhone] = useState<'phone-a' | 'phone-b'>('phone-a');
  const [dualPhoneMode, setDualPhoneMode] = useState<boolean>(true);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [showDemoGuide, setShowDemoGuide] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);

  const DEMO_STEPS = [
    {
      step: 1,
      title: 'Colored Street Lines & Filter Chips',
      desc: 'Real-world road snapped colored lines: Green (Free), Blue (Paid), Red (No Parking). At zoom ≥ 16, centered labels appear. Tap any line to view regulations.',
    },
    {
      step: 2,
      title: 'Multi-User Spot Reporting',
      desc: 'On Phone A, tap "Report Spot" (+10 pts). Watch the navy P pin appear live on Phone B, and Phone A’s coin counter rise by 10 points via Cloud Functions.',
    },
    {
      step: 3,
      title: 'Destination Push Alert (500m)',
      desc: 'On Phone B, tap "Get open spot alerts" and tap the map near the spot. When Phone A reports nearby, Phone B receives an instant push alert toast!',
    },
    {
      step: 4,
      title: 'Take Spot (+3 pts)',
      desc: 'On Phone B, tap the spot pin and click "I took it (+3 points)". The pin disappears for all drivers and Phone B earns +3 points.',
    },
    {
      step: 5,
      title: 'AI Sign Reader & Plain-English Rules',
      desc: 'Tap "Scan Parking Sign". Pick sample signs or upload one. The NLP decoder parses days, hours, exceptions, and live active verdicts.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans select-none overflow-x-hidden">
      {/* 1. Presenter Top Bar */}
      <PresenterBar
        activePhone={activePhone}
        dualPhoneMode={dualPhoneMode}
        onSelectPhone={(phone) => setActivePhone(phone)}
        onToggleDualPhone={() => setDualPhoneMode(!dualPhoneMode)}
        onOpenCode={() => setIsCodeModalOpen(true)}
        onOpenRevenue={() => setIsRevenueModalOpen(true)}
        onOpenDeploy={() => setIsDeployModalOpen(true)}
        onResetData={() => parkingStore.resetDemoData()}
      />

      {/* 2. Interactive Demo Walkthrough Banner */}
      {showDemoGuide && (
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-blue-900/40 px-4 py-2 text-white">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-blue-600 font-bold text-[10px] uppercase tracking-wider">
                Demo Step {currentStep}/5
              </span>
              <span className="font-bold text-slate-100">
                {DEMO_STEPS[currentStep - 1].title}:
              </span>
              <span className="text-slate-300 hidden md:inline">
                {DEMO_STEPS[currentStep - 1].desc}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {DEMO_STEPS.map((s) => (
                  <button
                    key={s.step}
                    onClick={() => setCurrentStep(s.step)}
                    className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition-all ${
                      currentStep === s.step
                        ? 'bg-amber-400 text-slate-900 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {s.step}
                  </button>
                ))}
              </div>

              <button
                onClick={() =>
                  setCurrentStep((prev) => (prev < 5 ? prev + 1 : 1))
                }
                className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Next</span>
                <ArrowRight className="w-3 h-3" />
              </button>

              <button
                onClick={() => setShowDemoGuide(false)}
                className="text-slate-400 hover:text-slate-200 ml-1"
                title="Hide guide"
              >
                &times;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Phone Interactive Showcase */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {dualPhoneMode ? (
          <div className="w-full max-w-5xl flex flex-col items-center">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 w-full justify-items-center">
              {/* Phone A */}
              <div className="flex flex-col items-center w-full">
                <div className="mb-2 text-center">
                  <span className="text-xs font-bold text-blue-400 bg-blue-950/80 px-3 py-1 rounded-full border border-blue-800/60 inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    Phone A: Reporter (Driver on the road)
                  </span>
                </div>
                <PhoneScreen
                  uid="phone-a"
                  phoneName="Phone A (Scout)"
                  isDual={true}
                />
              </div>

              {/* Phone B */}
              <div className="flex flex-col items-center w-full">
                <div className="mb-2 text-center">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800/60 inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Phone B: Destination Alerts &amp; Spot Taker
                  </span>
                </div>
                <PhoneScreen
                  uid="phone-b"
                  phoneName="Phone B (Driver)"
                  isDual={true}
                />
              </div>
            </div>

            {/* Live Sync Information Note */}
            <div className="mt-6 text-center text-xs text-slate-400 max-w-xl bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Both phones run independently with live Firestore &amp; Cloud Functions v2 sync. Actions on one phone reflect on the other in milliseconds!
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            <PhoneScreen
              uid={activePhone}
              phoneName={activePhone === 'phone-a' ? 'Phone A (Scout)' : 'Phone B (Driver)'}
              isDual={false}
            />
          </div>
        )}
      </main>

      {/* 4. Complete Code Repository & Setup Modal */}
      <CodeRepositoryModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />

      {/* 5. Startup & Revenue Model Modal */}
      <RevenueModelModal
        isOpen={isRevenueModalOpen}
        onClose={() => setIsRevenueModalOpen(false)}
      />

      {/* 6. Deploy & Download Hub Modal */}
      <DeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
      />
    </div>
  );
}
