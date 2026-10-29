import React, { useState } from 'react';
import {
  Compass,
  ArrowRight,
  TrendingDown,
  Leaf,
  ShieldCheck,
  Bike,
  Store,
  Layers,
  MapPin,
  Clock,
  Sparkles,
  ChevronRight,
  Calculator,
  ShieldAlert,
  Zap,
  Info,
  HelpCircle
} from 'lucide-react';
import { PlatformOverview } from '../types';
import { api } from '../services/api';

interface LandingPageProps {
  overview: PlatformOverview | null;
  navigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  overview,
  navigate,
}) => {
  // Simulator state
  const [normalKm, setNormalKm] = useState(8.0);
  const [detourKm, setDetourKm] = useState(0.8);
  const [pkgReward, setPkgReward] = useState(50);

  const deliveryKm = normalKm + detourKm;
  const commuterEarning = Math.round(pkgReward * 0.75);
  const traditionalCourierEstimate = Math.round(45 + (deliveryKm * 6.5));
  const vendorSaving = Math.max(0, traditionalCourierEstimate - pkgReward);
  const co2AvoidedKg = (normalKm * 0.144).toFixed(2);

  const scrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToSimulator = () => {
    const el = document.getElementById('simulator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col bg-slate-950 selection:bg-emerald-500 selection:text-slate-950">
      {/* 1. Hero Section */}
      <section className="relative pt-12 sm:pt-16 pb-16 sm:pb-20 overflow-hidden border-b border-slate-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative text-center">
          {/* Platform badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6 shadow-sm shadow-emerald-950/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>RoutePool · Hyperlocal Logistics & Package Pooling</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            Deliver more. <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Travel no further.</span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            RoutePool connects local retailers with everyday commuters already traveling along the exact same Hyderabad transit corridors. By matching small packages with routine journeys using minimum-detour algorithms, we slash courier emissions and delivery costs by up to 40%.
          </p>

          {/* Primary Action Buttons: Get Started & Explore How It Works */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate('/auth')}
              className="px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-emerald-500/25 flex items-center gap-2 cursor-pointer group"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={scrollToHowItWorks}
              className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>Explore How It Works</span>
            </button>
          </div>

          {/* Live Platform Impact Bar */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
              <div className="text-2xl font-bold text-white tracking-tight">
                {overview?.deliveries_completed ?? 18}
              </div>
              <div className="text-xs text-slate-400 mt-1">Deliveries Pooled</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
              <div className="text-2xl font-bold text-emerald-400 tracking-tight">
                {overview?.estimated_distance_avoided_km ?? 164.2} km
              </div>
              <div className="text-xs text-slate-400 mt-1">Avoided Courier Distance</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
              <div className="text-2xl font-bold text-teal-400 tracking-tight">
                {overview?.estimated_co2_reduced_kg ?? 23.6} kg
              </div>
              <div className="text-xs text-slate-400 mt-1">Displaced CO₂ Emissions</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
              <div className="text-2xl font-bold text-sky-400 tracking-tight">
                &lt; 1.5 km
              </div>
              <div className="text-xs text-slate-400 mt-1">Average Detour Bound</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Platform Value: For Vendors & Commuters */}
      <section className="py-16 border-b border-slate-800/80 bg-slate-950/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">A Two-Sided Hyperlocal Logistics Mesh</h2>
            <p className="mt-2 text-sm text-slate-400">
              Bridging local commerce and routine urban commuting with cryptographic trust.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Vendor Card */}
            <div className="p-8 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Store className="w-4 h-4" />
                  <span>For Local Retailers & Vendors</span>
                </div>
                <h3 className="text-xl font-bold text-white">Fast, Hyperlocal Delivery at 40% Lower Cost</h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Eliminate exorbitant courier surge charges. Dispatch urgent electronics, hardware spares, documents, or prescriptions with neighbors already traveling past your dropoff location.
                </p>
                <ul className="mt-5 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                    <span>Sub-2 hour direct corridor delivery (Khairatabad, Ameerpet, Begumpet)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                    <span>Pickup OTP verification ensures only your assigned commuter receives parcels</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                    <span>Transparent savings against traditional courier baselines</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => navigate('/auth')}
                className="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Start Shipping as Vendor</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Commuter Card */}
            <div className="p-8 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
              <div>
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Bike className="w-4 h-4" />
                  <span>For Everyday Commuters</span>
                </div>
                <h3 className="text-xl font-bold text-white">Monetize Your Routine Travel</h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Traveling to college or the office anyway? Carry a small parcel in your backpack. Earn ₹35–₹60 per trip with an average marginal detour under 5 minutes.
                </p>
                <ul className="mt-5 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                    <span>You define max acceptable detour — never routed out of your way</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                    <span>Package pooling allowed: Carry up to 2 packages simultaneously</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                    <span>Instant wallet clearing upon cryptographic OTP verification</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => navigate('/auth')}
                className="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Start Earning as Commuter</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section id="how-it-works" className="py-16 border-b border-slate-800/80 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">How RoutePool Operates</h2>
            <p className="mt-2 text-sm text-slate-400">
              Transforming everyday urban commutes into an eco-friendly distributed logistics mesh.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-600/40 text-emerald-400 flex items-center justify-center font-bold text-sm mb-4">
                01
              </div>
              <h3 className="text-base font-bold text-white">Registered Commuter Corridors</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Commuters explicitly register their routine transit path (e.g. Khairatabad to Ameerpet), schedule departure window, and max acceptable detour limit.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-600/40 text-emerald-400 flex items-center justify-center font-bold text-sm mb-4">
                02
              </div>
              <h3 className="text-base font-bold text-white">Minimum-Detour Spatial Engine</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                When a vendor registers a package, RoutePool calculates marginal spatial detour. Only commuters with negligible extra travel are scored and recommended.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-600/40 text-emerald-400 flex items-center justify-center font-bold text-sm mb-4">
                03
              </div>
              <h3 className="text-base font-bold text-white">Dual-OTP Cryptographic Handover</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Physical custody transfer is verified at pickup and delivery. Upon completion, 75% of the fee settles immediately to the commuter's wallet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Technical Showcase: Minimum Detour Simulator */}
      <section id="simulator" className="py-16 border-b border-slate-800/80 bg-slate-950/40 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium mb-1">
              <Calculator className="w-3.5 h-3.5" />
              <span>Technical Algorithm Demonstration</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Minimum-Detour Simulator</h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Interactive demonstration of RoutePool's detour scoring and cost/emission calculation model.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 max-w-4xl mx-auto shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 font-medium mb-2">
                    <span>Commuter Base Journey:</span>
                    <span className="text-emerald-400 font-bold">{normalKm} km</span>
                  </div>
                  <input
                    type="range"
                    min="3.0"
                    max="20.0"
                    step="0.5"
                    value={normalKm}
                    onChange={(e) => setNormalKm(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">E.g. Khairatabad to Ameerpet route</div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 font-medium mb-2">
                    <span>Marginal Detour for Package:</span>
                    <span className="text-amber-400 font-bold">+{detourKm} km</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={detourKm}
                    onChange={(e) => setDetourKm(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">Extra deviation to vendor pickup and recipient</div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 font-medium mb-2">
                    <span>Vendor Offered Reward:</span>
                    <span className="text-white font-bold">₹{pkgReward}</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="120"
                    step="5"
                    value={pkgReward}
                    onChange={(e) => setPkgReward(parseInt(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">75% commuter share / 25% platform fee</div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Engine Calculations
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Route with Detour:</span>
                      <span className="font-semibold text-slate-200">{deliveryKm.toFixed(1)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Detour Efficiency Ratio:</span>
                      <span className="font-semibold text-emerald-400">
                        {(100 - (detourKm / normalKm * 100)).toFixed(1)}% Optimal
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Commuter Net Earning:</span>
                      <span className="font-bold text-emerald-400">₹{commuterEarning}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Estimated Traditional Courier:</span>
                      <span className="text-slate-400 line-through">₹{traditionalCourierEstimate}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-800">
                      <span className="text-white font-medium">Estimated Vendor Saving:</span>
                      <span className="font-bold text-emerald-400">~₹{vendorSaving}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 text-teal-400">
                    <Leaf className="w-4 h-4" />
                    <span>Avoided CO₂: <strong>{co2AvoidedKg} kg</strong></span>
                  </div>
                  <span className="text-[11px] text-slate-500">Emission factor: 0.144 kg/km</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Environmental Impact Section */}
      <section className="py-16 border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Leaf className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Estimated Environmental Impact</h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Traditional couriers dispatch a dedicated two-wheeler or van that traverses the entire distance empty or partially laden. RoutePool replaces dedicated trips with zero marginal trips.
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="text-3xl font-black text-emerald-400">
                {overview?.estimated_distance_avoided_km ?? 164.2} km
              </div>
              <div className="text-xs text-slate-300 mt-2 font-medium">Estimated Travel Avoided</div>
              <p className="text-[11px] text-slate-500 mt-1">Displaced dedicated courier journeys</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="text-3xl font-black text-teal-400">
                {overview?.estimated_co2_reduced_kg ?? 23.6} kg
              </div>
              <div className="text-xs text-slate-300 mt-2 font-medium">Estimated CO₂ Reduction</div>
              <p className="text-[11px] text-slate-500 mt-1">Calculated @ 0.144 kg CO₂ per km avoided</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="text-3xl font-black text-sky-400">100%</div>
              <div className="text-xs text-slate-300 mt-2 font-medium">Shared Existing Journeys</div>
              <p className="text-[11px] text-slate-500 mt-1">Zero dedicated courier engines deployed</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Ready to Get Started CTA */}
      <section className="py-20 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-white">Join RoutePool Today</h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Whether you are a retailer looking to cut local shipping costs or a commuter looking to monetize daily travel, start pooling packages along Hyderabad transit corridors.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/auth')}
              className="px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-emerald-500/25 cursor-pointer"
            >
              Get Started Now
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-900 bg-slate-950 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-300">RoutePool</span>
            <span>·</span>
            <span>Hyperlocal Eco-Friendly Logistics Platform</span>
          </div>
          <div>
            <span>Django 5.1 REST Framework · PostgreSQL/SQLite ORM · Leaflet Maps</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
