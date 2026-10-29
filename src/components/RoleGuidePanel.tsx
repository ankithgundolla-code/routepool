import React from 'react';
import { Store, Bike, X, Sparkles, CheckCircle2 } from 'lucide-react';

interface RoleGuidePanelProps {
  role: 'vendor' | 'commuter';
  onDismiss: () => void;
}

export const RoleGuidePanel: React.FC<RoleGuidePanelProps> = ({ role, onDismiss }) => {
  const isVendor = role === 'vendor';

  const vendorSteps = [
    {
      num: 1,
      title: 'Create Delivery Package',
      desc: 'Set pickup hub, destination, weight, and courier price savings reward.'
    },
    {
      num: 2,
      title: 'Review Commuter Matches',
      desc: 'Our spatial engine identifies commuters with minimal detour along the corridor.'
    },
    {
      num: 3,
      title: 'Choose Match & Request',
      desc: 'Select an optimal commuter based on detour, time window, and reliability score.'
    },
    {
      num: 4,
      title: 'Verify Pickup & Delivery',
      desc: 'Provide Pickup OTP to commuter at handoff; track package until final destination OTP.'
    }
  ];

  const commuterSteps = [
    {
      num: 1,
      title: 'Register Travel Route',
      desc: 'Specify your routine commute path (e.g. Khairatabad to Ameerpet) and max detour.'
    },
    {
      num: 2,
      title: 'Review Compatible Packages',
      desc: 'Browse packages awaiting delivery directly along your travel corridor.'
    },
    {
      num: 3,
      title: 'Accept a Delivery',
      desc: 'Lock in compatible package opportunities (pool up to 2 parcels concurrently).'
    },
    {
      num: 4,
      title: 'Complete OTP Verification',
      desc: 'Verify Pickup OTP at vendor and Delivery OTP at dropoff to release instant payout.'
    }
  ];

  const steps = isVendor ? vendorSteps : commuterSteps;
  const accentColor = isVendor ? 'emerald' : 'cyan';

  return (
    <div
      className={`relative rounded-2xl border p-4 sm:p-5 transition-all shadow-lg ${
        isVendor
          ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-slate-900/80 border-emerald-800/40 shadow-emerald-950/20'
          : 'bg-gradient-to-r from-cyan-950/40 via-slate-900/90 to-slate-900/80 border-cyan-800/40 shadow-cyan-950/20'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
              isVendor
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            }`}
          >
            {isVendor ? <Store className="w-4 h-4" /> : <Bike className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                How to get started as a {isVendor ? 'Vendor' : 'Commuter'}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  isVendor
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-800/50'
                }`}
              >
                4 Simple Steps
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {isVendor
                ? 'Hyperlocal logistics made simple: pool deliveries onto existing trips to cut costs & courier emissions.'
                : 'Monetize everyday travel: earn wallet credits by carrying small parcels with minimal detour.'}
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Dismiss guide"
          aria-label="Dismiss guide"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step) => (
          <div
            key={step.num}
            className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/80 transition-colors"
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                isVendor
                  ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/30'
                  : 'bg-cyan-400 text-slate-950 shadow-sm shadow-cyan-400/30'
              }`}
            >
              {step.num}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-slate-100 truncate">{step.title}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
