import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  DollarSign,
  Building2,
  Users,
  Database,
  Crown,
  Gift,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sliders,
  PieChart,
} from 'lucide-react';
import {
  calculateRevenueModel,
  RevenueModelInputs,
} from '../utils/revenueCalculator';

interface RevenueModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RevenueModelModal: React.FC<RevenueModelModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'calculator' | 'streams' | 'playbook'>('calculator');

  // Interactive Calculator State
  const [inputs, setInputs] = useState<RevenueModelInputs>({
    monthlyActiveUsers: 50000,
    proConversionRate: 0.04,
    proSubscriptionPrice: 4.99,
    garageBookingsPerUserMonth: 0.25,
    averageBookingValue: 12.0,
    platformTakeRate: 0.18,
    sponsoredPinsPerCityMonth: 60,
    sponsoredPinPrice: 85,
    enterpriseDataDeals: 2,
    averageDataDealPriceMonth: 6000,
  });

  if (!isOpen) return null;

  const outputs = calculateRevenueModel(inputs);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in select-none">
      <div className="w-full max-w-4xl bg-slate-900 rounded-3xl shadow-2xl flex flex-col h-[90vh] border border-slate-800 text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  ParkPulse Startup Revenue &amp; Business Model
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                  Monetization Blueprint
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Four diversified revenue engines: B2C Pro Subscriptions, B2B Garage Marketplace, Merchant Perks, and Mobility Data Licensing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'calculator'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Interactive ARR Calculator</span>
          </button>

          <button
            onClick={() => setActiveTab('streams')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'streams'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>The 4 Revenue Engines</span>
          </button>

          <button
            onClick={() => setActiveTab('playbook')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'playbook'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Go-To-Market &amp; Unit Economics</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'calculator' && (
            <div className="space-y-6">
              {/* Financial KPI Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30 flex flex-col">
                  <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                    Projected ARR
                  </span>
                  <span className="text-2xl font-black text-white mt-1 tabular-nums">
                    {formatCurrency(outputs.totalAnnualRecurringRevenue)}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Annual Recurring Revenue
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-500/30 flex flex-col">
                  <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
                    Monthly MRR
                  </span>
                  <span className="text-2xl font-black text-white mt-1 tabular-nums">
                    {formatCurrency(outputs.totalMonthlyRecurringRevenue)}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Blended monthly run rate
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/60 to-slate-900 border border-purple-500/30 flex flex-col">
                  <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">
                    Pro Subscribers
                  </span>
                  <span className="text-2xl font-black text-white mt-1 tabular-nums">
                    {outputs.proSubscribers.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    {(inputs.proConversionRate * 100).toFixed(1)}% conversion of MAU
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-500/30 flex flex-col">
                  <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                    ARPU / Month
                  </span>
                  <span className="text-2xl font-black text-white mt-1 tabular-nums">
                    ${outputs.averageRevenuePerUser.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Average revenue per active driver
                  </span>
                </div>
              </div>

              {/* Revenue Breakdown Progress Bars */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Monthly Revenue Mix</span>
                  <span>Total: {formatCurrency(outputs.totalMonthlyRecurringRevenue)}/mo</span>
                </div>
                <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{
                      width: `${(outputs.proMonthlyRevenue / (outputs.totalMonthlyRecurringRevenue || 1)) * 100}%`,
                    }}
                    className="bg-purple-500 transition-all"
                    title={`B2C Pro: ${formatCurrency(outputs.proMonthlyRevenue)}`}
                  />
                  <div
                    style={{
                      width: `${(outputs.garageMonthlyRevenue / (outputs.totalMonthlyRecurringRevenue || 1)) * 100}%`,
                    }}
                    className="bg-blue-500 transition-all"
                    title={`Garage Commissions: ${formatCurrency(outputs.garageMonthlyRevenue)}`}
                  />
                  <div
                    style={{
                      width: `${(outputs.sponsoredPinsMonthlyRevenue / (outputs.totalMonthlyRecurringRevenue || 1)) * 100}%`,
                    }}
                    className="bg-amber-500 transition-all"
                    title={`Merchant Pins: ${formatCurrency(outputs.sponsoredPinsMonthlyRevenue)}`}
                  />
                  <div
                    style={{
                      width: `${(outputs.dataLicensingMonthlyRevenue / (outputs.totalMonthlyRecurringRevenue || 1)) * 100}%`,
                    }}
                    className="bg-emerald-500 transition-all"
                    title={`Data Licensing: ${formatCurrency(outputs.dataLicensingMonthlyRevenue)}`}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="text-slate-400">B2C Pro:</span>
                    <span className="font-bold">{formatCurrency(outputs.proMonthlyRevenue)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-slate-400">Garages:</span>
                    <span className="font-bold">{formatCurrency(outputs.garageMonthlyRevenue)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-400">Merchant Ads:</span>
                    <span className="font-bold">{formatCurrency(outputs.sponsoredPinsMonthlyRevenue)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-400">Data API:</span>
                    <span className="font-bold">{formatCurrency(outputs.dataLicensingMonthlyRevenue)}</span>
                  </div>
                </div>
              </div>

              {/* Interactive Sliders */}
              <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-5">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Tweak Assumptions &amp; Scale Metrics</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* MAU */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Monthly Active Drivers (MAU)</span>
                      <span className="font-bold text-white tabular-nums">
                        {inputs.monthlyActiveUsers.toLocaleString()} users
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5000}
                      max={250000}
                      step={5000}
                      value={inputs.monthlyActiveUsers}
                      onChange={(e) =>
                        setInputs({
                          ...inputs,
                          monthlyActiveUsers: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Pro Conversion */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Pro Pass Conversion Rate</span>
                      <span className="font-bold text-purple-400 tabular-nums">
                        {(inputs.proConversionRate * 100).toFixed(1)}% ($4.99/mo)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.01}
                      max={0.1}
                      step={0.005}
                      value={inputs.proConversionRate}
                      onChange={(e) =>
                        setInputs({
                          ...inputs,
                          proConversionRate: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>

                  {/* Garage Booking Take Rate */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Commercial Garage Take Rate</span>
                      <span className="font-bold text-blue-400 tabular-nums">
                        {(inputs.platformTakeRate * 100).toFixed(0)}% commission
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={0.25}
                      step={0.01}
                      value={inputs.platformTakeRate}
                      onChange={(e) =>
                        setInputs({
                          ...inputs,
                          platformTakeRate: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>

                  {/* Enterprise Data Deals */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Municipal / Fleet Data Contracts</span>
                      <span className="font-bold text-emerald-400 tabular-nums">
                        {inputs.enterpriseDataDeals} cities / fleets ($6k/mo each)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={inputs.enterpriseDataDeals}
                      onChange={(e) =>
                        setInputs({
                          ...inputs,
                          enterpriseDataDeals: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'streams' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Stream 1: B2C Pro Pass */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-800/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-purple-600/30 text-purple-400 border border-purple-500/30">
                      <Crown className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300">
                      $4.99/mo or $49/yr
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">
                    1. B2C "ParkPulse Pass" Subscription
                  </h4>
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    Premium utility for high-frequency commuters, rideshare drivers, and downtown professionals who cannot afford circling for 20 minutes.
                  </p>
                  <ul className="text-xs text-slate-300 space-y-1.5 mb-4">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span><strong>Instant Priority Alerts</strong>: Notified 3 minutes before free tier users when spots open.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span><strong>10-Minute Spot Hold</strong>: "Lock" a reported spot while en route.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span><strong>AI Ticket Defense Guarantee</strong>: Unlimited sign scans + automated evidence dispute packet if ticketed.</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-purple-900/40 text-[11px] text-purple-300 font-semibold flex justify-between">
                  <span>Target conversion: 3% – 5% of MAU</span>
                  <span>LTV: ~$60/year</span>
                </div>
              </div>

              {/* Stream 2: B2B Commercial Garage Marketplace */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-800/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/30">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300">
                      15% – 20% Take Rate
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">
                    2. Commercial Garage Marketplace
                  </h4>
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    Commercial garages and private lot operators pay a marketplace commission on pre-booked empty slots to monetize off-peak capacity.
                  </p>
                  <ul className="text-xs text-slate-300 space-y-1.5 mb-4">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>In-App Guaranteed Booking</strong>: Driver clicks a garage pin, reserves for $10–$25, ParkPulse retains 18%.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Dynamic Yield Management</strong>: Garages discount idle slots in real time to capture drivers currently circling nearby.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Featured Placement</strong>: Promoted search pins during major sports events and concerts.</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-blue-900/40 text-[11px] text-blue-300 font-semibold flex justify-between">
                  <span>Gross Margin: ~85%</span>
                  <span>Benchmark: SpotHero model</span>
                </div>
              </div>

              {/* Stream 3: Local Merchant Perks */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-800/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-amber-600/30 text-amber-400 border border-amber-500/30">
                      <Gift className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300">
                      $75 – $150 / pin / mo
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">
                    3. Local Merchant Sponsored Pins &amp; Perks
                  </h4>
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    Connects user crowdsourcing points (+10, +5, +3 pts) into real economic incentives funded by restaurants, cafes, and retailers.
                  </p>
                  <ul className="text-xs text-slate-300 space-y-1.5 mb-4">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Point Redemption Flywheel</strong>: Drivers burn 100 points to get $2 off lunch at partner restaurants near where they parked.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Hyperlocal Contextual Ads</strong>: "Parked 50m from Blue Bottle Coffee? Enjoy 15% off your pastry."</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Zero-CAC User Retention</strong>: Drivers keep reporting spots because points have tangible cash value.</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-amber-900/40 text-[11px] text-amber-300 font-semibold flex justify-between">
                  <span>Recurring local SMB subscription</span>
                  <span>High retention</span>
                </div>
              </div>

              {/* Stream 4: Municipal & Fleet Mobility API */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-800/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/30">
                      <Database className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                      $5k – $25k / mo / client
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">
                    4. Municipal &amp; Delivery Fleet Intelligence
                  </h4>
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    Commercial last-mile fleets (FedEx, UPS, Amazon, DoorDash) waste $billions idling for loading zones. Cities lack real-time digital parking sign maps.
                  </p>
                  <ul className="text-xs text-slate-300 space-y-1.5 mb-4">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Fleet Loading Zone Routing API</strong>: Real-time curbside availability feed reduces delivery driver circle time by 40%.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Sign Digital Twin Audits</strong>: Cities pay ParkPulse to map and audit contradictory parking signage using crowdsourced OCR scans.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Autonomous Vehicle (AV) HD Rules</strong>: Licensing parsed curbside regulations to Waymo, Zoox, and Tesla FSD.</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-emerald-900/40 text-[11px] text-emerald-300 font-semibold flex justify-between">
                  <span>High ACV B2B / B2G contracts</span>
                  <span>Negative net churn</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'playbook' && (
            <div className="space-y-6">
              {/* 3-Stage Go-To-Market */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>3-Phase Startup Launch &amp; Scaling Playbook</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="font-extrabold text-amber-400 mb-1">Phase 1: Hyperlocal Density</div>
                    <div className="font-semibold text-slate-200 mb-2">Month 1 - 6 (Beachhead)</div>
                    <p className="text-slate-400 leading-relaxed">
                      Launch in 1 high-friction micro-market (e.g. Murthal roadside dining corridor or a congested university campus). Seed rewards so initial spot reports happen under 30 seconds.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="font-extrabold text-blue-400 mb-1">Phase 2: Garage Monetization</div>
                    <div className="font-semibold text-slate-200 mb-2">Month 7 - 18 (B2B Expansion)</div>
                    <p className="text-slate-400 leading-relaxed">
                      Onboard 50 commercial garages in the metropolitan hub. Launch in-app bookings with 18% take rate. Introduce $4.99/mo Pro Pass to capture frequent parkers.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="font-extrabold text-emerald-400 mb-1">Phase 3: Fleet &amp; City Licensing</div>
                    <div className="font-semibold text-slate-200 mb-2">Month 19+ (Enterprise Scale)</div>
                    <p className="text-slate-400 leading-relaxed">
                      Package crowdsourced curb occupancy and AI sign database into an enterprise API. Close $100k+ annual data licensing contracts with logistics fleets and municipal departments of transportation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Startup Pitch Metrics */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-slate-100">
                  Core Investor Metrics (Target at Series A)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">LTV / CAC</span>
                    <span className="text-lg font-bold text-emerald-400">4.2x</span>
                    <span className="text-[10px] text-slate-500 block">Organic viral referrals</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Monthly Burn</span>
                    <span className="text-lg font-bold text-slate-200">&lt; $15k</span>
                    <span className="text-[10px] text-slate-500 block">Serverless Firebase/Cloud Run</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Gross Margins</span>
                    <span className="text-lg font-bold text-blue-400">82%</span>
                    <span className="text-[10px] text-slate-500 block">Software marketplace</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Defensibility</span>
                    <span className="text-lg font-bold text-purple-400">Network Effect</span>
                    <span className="text-[10px] text-slate-500 block">More spots = faster finds</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Based on proven unit economics from SpotHero, Waze, and Parkopedia</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
