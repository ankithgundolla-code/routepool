import React, { useState, useEffect } from 'react';
import {
  Package as PackageIcon,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  TrendingUp,
  Leaf,
  AlertCircle,
  ChevronRight,
  Send,
  X,
  MapPin,
  Scale,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  Eye,
  ArrowLeftRight,
  Sparkles
} from 'lucide-react';
import { Package, Match, VendorAnalytics } from '../types';
import { api } from '../services/api';
import { RouteMap } from './RouteMap';
import { RoleGuidePanel } from './RoleGuidePanel';
import { LocationPicker } from './LocationPicker';
import { CustomSelect } from './CustomSelect';

export const HYDERABAD_PICKUP_POINTS = [
  { name: 'Khairatabad Circle Vendor Hub', lat: 17.4116, lng: 78.4611, area: 'Central Market' },
  { name: 'Punjagutta Commercial Wholesale Depot', lat: 17.4265, lng: 78.4526, area: 'Central Junction' },
  { name: 'Lakdikapul Station Merchant Corridor', lat: 17.4042, lng: 78.4659, area: 'Transit Gateway' },
  { name: 'Somajiguda Medical & Hardware Depot', lat: 17.4260, lng: 78.4590, area: 'Corridor Hub' },
  { name: 'Banjara Hills Road 12 Artisan Store', lat: 17.4156, lng: 78.4357, area: 'West Retail' },
  { name: 'Abids Wholesale Component Center', lat: 17.3916, lng: 78.4740, area: 'Old City Hub' },
];

export const HYDERABAD_DESTINATION_POINTS = [
  { name: 'Ameerpet Computer Electronics Market', lat: 17.4375, lng: 78.4482, area: 'Tech Market' },
  { name: 'Begumpet Software Technology Park', lat: 17.4448, lng: 78.4664, area: 'Software Park' },
  { name: 'SR Nagar Engineering & Tech Cluster', lat: 17.4428, lng: 78.4481, area: 'Academic / Tech' },
  { name: 'Secunderabad Junction Corridor', lat: 17.4399, lng: 78.4983, area: 'Station Node' },
  { name: 'Hitec City Cyber Gateway', lat: 17.4485, lng: 78.3772, area: 'Cyberabad IT' },
  { name: 'Gachibowli Financial District Hub', lat: 17.4190, lng: 78.3490, area: 'Financial District' },
  { name: 'Madhapur Mindspace IT Campus', lat: 17.4435, lng: 78.3812, area: 'Mindspace SEZ' },
  { name: 'Jubilee Hills Road 36 Retail Plaza', lat: 17.4319, lng: 78.4072, area: 'Commercial Zone' },
];

export const VendorDashboard: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [packageMatches, setPackageMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [selectedMatchForMap, setSelectedMatchForMap] = useState<Match | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showGuide, setShowGuide] = useState(() => {
    try {
      return localStorage.getItem('routepool_guide_vendor_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  const [formData, setFormData] = useState({
    package_name: 'Microcontroller ICs & SMD Sensors Batch',
    description: 'Fragile electronics box with ESD shielding',
    pickup_location: HYDERABAD_PICKUP_POINTS[0].name,
    pickup_lat: HYDERABAD_PICKUP_POINTS[0].lat,
    pickup_lng: HYDERABAD_PICKUP_POINTS[0].lng,
    destination: HYDERABAD_DESTINATION_POINTS[0].name,
    dest_lat: HYDERABAD_DESTINATION_POINTS[0].lat,
    dest_lng: HYDERABAD_DESTINATION_POINTS[0].lng,
    weight: 1.0,
    size: 'small' as 'small' | 'medium' | 'large',
    ready_time: new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16),
    delivery_deadline: new Date(Date.now() + 4 * 3600000).toISOString().slice(0, 16),
    offered_reward: 45,
  });

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pkgs, stats] = await Promise.all([
        api.getPackages(),
        api.getVendorAnalytics().catch(() => null),
      ]);
      setPackages(pkgs);
      if (stats) setAnalytics(stats);
      if (pkgs.length > 0 && !selectedPackage) {
        handleSelectPackageForMatches(pkgs[0]);
      }
    } catch (e: any) {
      console.error(e);
      setFeedbackMsg({ text: e.message || 'Failed to load packages', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackageForMatches = async (pkg: Package) => {
    setSelectedPackage(pkg);
    setMatchesLoading(true);
    setSelectedMatchForMap(null);
    try {
      const data = await api.getPackageMatches(pkg.id);
      setPackageMatches(data.matches);
      if (data.matches.length > 0) {
        setSelectedMatchForMap(data.matches[0]);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setMatchesLoading(false);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.pickup_location?.trim() || !formData.pickup_lat || !formData.pickup_lng) {
      setModalError('Both pickup and destination locations with valid coordinates are required.');
      return;
    }
    if (!formData.destination?.trim() || !formData.dest_lat || !formData.dest_lng) {
      setModalError('Both pickup and destination locations with valid coordinates are required.');
      return;
    }

    try {
      const created = await api.createPackage({
        ...formData,
        ready_time: new Date(formData.ready_time).toISOString(),
        delivery_deadline: new Date(formData.delivery_deadline).toISOString(),
      });
      setShowCreateModal(false);
      setFeedbackMsg({ text: `Package "${created.package_name}" created! Matching engine executed.`, type: 'success' });
      await loadData();
      handleSelectPackageForMatches(created);
    } catch (err: any) {
      setModalError(err.message || 'Failed to create package');
    }
  };

  const handleSendMatchRequest = async (matchId: number) => {
    try {
      await api.requestMatch(matchId);
      setFeedbackMsg({ text: 'Delivery request sent to commuter!', type: 'success' });
      if (selectedPackage) {
        handleSelectPackageForMatches(selectedPackage);
      }
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    }
  };

  const handleCancelPackage = async (pkgId: number) => {
    if (!confirm('Are you sure you want to cancel this package delivery?')) return;
    try {
      await api.cancelPackage(pkgId);
      setFeedbackMsg({ text: 'Package cancelled successfully', type: 'success' });
      loadData();
      setSelectedPackage(null);
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    }
  };

  const statusDot = (status: string) => {
    switch (status) {
      case 'SEARCHING':
        return <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>Searching Commuter</span>;
      case 'MATCHED':
        return <span className="inline-flex items-center gap-1.5 text-xs text-sky-400 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>Matched / Pending Pickup</span>;
      case 'IN_TRANSIT':
      case 'PICKED_UP':
        return <span className="inline-flex items-center gap-1.5 text-xs text-purple-400 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>In Transit</span>;
      case 'DELIVERED':
        return <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Delivered</span>;
      default:
        return <span className="text-xs text-slate-400 font-medium">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Vendor Logistics Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Dispatch local goods along existing commuter journeys with minimum detour.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              const next = !showGuide;
              setShowGuide(next);
              try {
                if (!next) localStorage.setItem('routepool_guide_vendor_dismissed', 'true');
                else localStorage.removeItem('routepool_guide_vendor_dismissed');
              } catch {}
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              showGuide
                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Getting Started Guide"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Guide</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh Deliveries"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Delivery Package</span>
          </button>
        </div>
      </div>

      {/* Role-Specific Getting Started Guide */}
      {showGuide && (
        <RoleGuidePanel
          role="vendor"
          onDismiss={() => {
            setShowGuide(false);
            try {
              localStorage.setItem('routepool_guide_vendor_dismissed', 'true');
            } catch {}
          }}
        />
      )}

      {feedbackMsg && (
        <div className={`p-3 rounded-xl text-xs flex items-center justify-between ${
          feedbackMsg.type === 'success' ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' : 'bg-red-950/60 border border-red-800 text-red-300'
        }`}>
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Total Packages</div>
          <div className="text-2xl font-bold text-white mt-1">{analytics?.total_packages ?? packages.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {analytics?.searching_count ?? packages.filter(p => p.status === 'SEARCHING').length} active search
          </div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Estimated Savings</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">₹{analytics?.estimated_savings_inr ?? 78}</div>
          <div className="text-[11px] text-slate-500 mt-1">vs traditional courier base</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Avoided Travel</div>
          <div className="text-2xl font-bold text-teal-400 mt-1">{analytics?.distance_saved_km ?? 16.4} km</div>
          <div className="text-[11px] text-slate-500 mt-1">Direct courier displacement</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">CO₂ Reduced</div>
          <div className="text-2xl font-bold text-sky-400 mt-1">{analytics?.co2_saved_kg ?? 2.36} kg</div>
          <div className="text-[11px] text-slate-500 mt-1">@ 0.144 kg/km avoided</div>
        </div>
      </div>

      {/* Main Content: Packages List & Match Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Registered Delivery Packages</h2>
              <span className="text-xs text-slate-400">
                {statusFilter === 'ALL' ? packages.length : packages.filter(p => p.status === statusFilter).length} of {packages.length} records
              </span>
            </div>
            <div className="w-44">
              <CustomSelect
                size="sm"
                value={statusFilter}
                onChange={setStatusFilter}
                accentColor="emerald"
                options={[
                  { value: 'ALL', label: 'All Packages' },
                  { value: 'SEARCHING', label: 'Searching Commuters', badge: 'Active' },
                  { value: 'MATCHED', label: 'Matched Only' },
                  { value: 'PICKED_UP', label: 'In Transit' },
                  { value: 'DELIVERED', label: 'Delivered' }
                ]}
              />
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
              Loading vendor packages...
            </div>
          ) : packages.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/30 rounded-xl border border-slate-800">
              No delivery requests yet. Click <strong>Create Delivery Request</strong> above to dispatch your first package!
            </div>
          ) : packages.filter(p => statusFilter === 'ALL' || p.status === statusFilter).length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/30 rounded-xl border border-slate-800">
              No packages match the selected status filter.
            </div>
          ) : (
            <div className="space-y-3">
              {packages
                .filter(p => statusFilter === 'ALL' || p.status === statusFilter)
                .map(pkg => {
                const isSelected = selectedPackage?.id === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => handleSelectPackageForMatches(pkg)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-950/30'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                          <PackageIcon className="w-4 h-4 text-emerald-400" />
                          <span>{pkg.package_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                          <span>{pkg.weight} kg</span>
                          <span>·</span>
                          <span className="capitalize">{pkg.size} parcel</span>
                          <span>·</span>
                          <span>Reward: <strong className="text-white">₹{pkg.offered_reward}</strong></span>
                        </div>
                      </div>
                      <div className="text-right">
                        {statusDot(pkg.status)}
                        <div className="text-[10px] text-slate-500 mt-1">Est. Save: ~₹{pkg.estimated_savings}</div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Pickup</span>
                        <span className="text-slate-300 truncate block">{pkg.pickup_location}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Destination</span>
                        <span className="text-slate-300 truncate block">{pkg.destination}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPackageForMatches(pkg);
                        }}
                        className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-medium text-xs cursor-pointer"
                      >
                        <Search className="w-3 h-3" />
                        <span>Inspect Commuter Matches</span>
                      </button>
                      {pkg.status === 'SEARCHING' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelPackage(pkg.id);
                          }}
                          className="text-[11px] text-red-400 hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 space-y-4">
          {selectedPackage ? (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Matches for: {selectedPackage.package_name}</h3>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {packageMatches.length} candidate commuters traveling this corridor
                  </div>
                </div>
                <button
                  onClick={() => api.runPackageMatching(selectedPackage.id).then(() => handleSelectPackageForMatches(selectedPackage))}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  title="Re-run matching algorithm"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-evaluate</span>
                </button>
              </div>

              <div>
                <div className="text-xs text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                  <span>Geographic Detour Visualization</span>
                  {selectedMatchForMap && (
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      Commuter Detour: +{selectedMatchForMap.estimated_detour} km
                    </span>
                  )}
                </div>
                <RouteMap
                  startLat={selectedMatchForMap?.route_detail?.start_lat || selectedPackage.pickup_lat}
                  startLng={selectedMatchForMap?.route_detail?.start_lng || selectedPackage.pickup_lng}
                  startLabel={selectedMatchForMap?.route_detail?.start_location || selectedPackage.pickup_location}
                  destLat={selectedMatchForMap?.route_detail?.dest_lat || selectedPackage.dest_lat}
                  destLng={selectedMatchForMap?.route_detail?.dest_lng || selectedPackage.dest_lng}
                  destLabel={selectedMatchForMap?.route_detail?.destination || selectedPackage.destination}
                  waypoints={selectedMatchForMap?.route_detail?.intermediate_points || []}
                  pickupLat={selectedPackage.pickup_lat}
                  pickupLng={selectedPackage.pickup_lng}
                  pickupLabel={selectedPackage.pickup_location}
                  dropLat={selectedPackage.dest_lat}
                  dropLng={selectedPackage.dest_lng}
                  dropLabel={selectedPackage.destination}
                  detourKm={selectedMatchForMap?.estimated_detour}
                  className="h-64 w-full rounded-xl overflow-hidden border border-slate-800"
                />
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-300">
                  Algorithmic Candidate Ranking (Minimum-Detour)
                </div>

                {matchesLoading ? (
                  <div className="p-4 text-center text-xs text-slate-500">Calculating detours...</div>
                ) : packageMatches.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 text-center">
                    Level 3: Wait & Notify — No commuter currently travelling this exact corridor. The package remains active in the pool.
                  </div>
                ) : (
                  packageMatches.map((m, idx) => {
                    const isCardSelected = selectedMatchForMap?.id === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMatchForMap(m)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isCardSelected
                            ? 'bg-slate-950 border-emerald-500/60 shadow-md'
                            : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-white text-xs flex items-center gap-2">
                              <span>#{idx + 1} {m.commuter_name}</span>
                              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                                {m.final_score}% Match
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              {m.route_detail?.route_name || 'Daily Transit'}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs font-bold text-emerald-400">+{m.estimated_detour} km</div>
                            <div className="text-[10px] text-slate-500">Marginal Detour</div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-4 gap-1 text-[10px] text-slate-400">
                          <div>
                            <span className="text-slate-500 block">Corridor</span>
                            <span className="text-slate-200 font-medium">{m.route_score}%</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Time Win</span>
                            <span className="text-slate-200 font-medium">{m.time_score}%</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Reliability</span>
                            <span className="text-slate-200 font-medium">{m.commuter_reliability}%</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Level</span>
                            <span className="text-emerald-400 font-medium">{m.match_level}</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            Commuter Payout: <strong>₹{m.commuter_earnings}</strong>
                          </span>
                          {m.status === 'PROPOSED' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendMatchRequest(m.id);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>Request Commuter</span>
                            </button>
                          ) : (
                            <span className="text-xs text-sky-400 font-semibold">{m.status}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800 text-center text-slate-500 text-xs">
              <PackageIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <div>Select a package from the list to view its minimum-detour matches and route map</div>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-xs text-slate-200 relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Create Delivery Request</h3>
                <p className="text-[11px] text-slate-400">RoutePool will automatically find the lowest-detour commuters across Hyderabad</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePackage} className="space-y-4">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Package Name / Title</label>
                <input
                  type="text"
                  required
                  value={formData.package_name}
                  onChange={(e) => setFormData({ ...formData, package_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Reusable Location Picker */}
              <LocationPicker
                pickupLabel="Pickup Store / Vendor Hub"
                destLabel="Delivery Destination / Client Drop-off"
                pickupValue={{
                  location: formData.pickup_location,
                  lat: formData.pickup_lat,
                  lng: formData.pickup_lng,
                }}
                destValue={{
                  location: formData.destination,
                  lat: formData.dest_lat,
                  lng: formData.dest_lng,
                }}
                onChange={({ pickup, destination }) => {
                  setModalError(null);
                  setFormData(prev => ({
                    ...prev,
                    pickup_location: pickup.location,
                    pickup_lat: pickup.lat,
                    pickup_lng: pickup.lng,
                    destination: destination.location,
                    dest_lat: destination.lat,
                    dest_lng: destination.lng,
                  }));
                }}
                accentColor="emerald"
                error={modalError}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10.0"
                    required
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:border-emerald-500 outline-none no-spinners"
                  />
                </div>
                <div>
                  <CustomSelect
                    label="Parcel Size"
                    value={formData.size}
                    onChange={(val) => setFormData({ ...formData, size: val as any })}
                    accentColor="emerald"
                    options={[
                      {
                        value: 'small',
                        label: 'Small Parcel',
                        badge: '< 20cm, ≤1kg',
                        description: 'Microcontroller ICs, documents, phone accessories'
                      },
                      {
                        value: 'medium',
                        label: 'Medium Parcel',
                        badge: '< 40cm, ≤4kg',
                        description: 'Shoebox or bag fit (devices, hardware components)'
                      },
                      {
                        value: 'large',
                        label: 'Large Parcel',
                        badge: '< 60cm, ≤10kg',
                        description: 'Carton box or bulk merchant consignment'
                      }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Ready Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.ready_time}
                    onChange={(e) => setFormData({ ...formData, ready_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Delivery Deadline</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.delivery_deadline}
                    onChange={(e) => setFormData({ ...formData, delivery_deadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Offered Delivery Reward (₹ INR)</label>
                <input
                  type="number"
                  min="20"
                  max="500"
                  required
                  value={formData.offered_reward}
                  onChange={(e) => setFormData({ ...formData, offered_reward: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:border-emerald-500 outline-none no-spinners"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Typical courier for this route would cost ~₹75. You save ~₹{Math.max(0, 75 - formData.offered_reward)}.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Create & Run Matching
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
