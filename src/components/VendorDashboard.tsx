import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Sparkles,
  KeyRound
} from 'lucide-react';
import { Package, Match, VendorAnalytics, Delivery } from '../types';
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
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
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

  // Polling control refs & timer references
  const isMountedRef = useRef<boolean>(true);
  const isPollingBusyRef = useRef<boolean>(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  // Status tracking & notification deduplication
  const knownPackageStatusesRef = useRef<Map<number, string>>(new Map());
  const selectedPackageIdRef = useRef<number | null>(null);

  // Visual real-time indicators
  const [highlightedPackageIds, setHighlightedPackageIds] = useState<Set<number>>(new Set());
  const [statusNotice, setStatusNotice] = useState<{
    message: string;
    packageName: string;
    status: string;
  } | null>(null);

  useEffect(() => {
    selectedPackageIdRef.current = selectedPackage?.id ?? null;
  }, [selectedPackage]);

  const handleSelectPackageForMatches = useCallback(async (pkg: Package) => {
    setSelectedPackage(pkg);
    setMatchesLoading(true);
    setSelectedMatchForMap(null);
    try {
      const data = await api.getPackageMatches(pkg.id);
      setPackageMatches(data.matches);
      if (data.matches.length > 0) {
        const accepted = data.matches.find(m => m.status === 'ACCEPTED');
        setSelectedMatchForMap(accepted || data.matches[0]);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  // Safe background polling loop (~5 seconds)
  const pollVendorData = useCallback(async () => {
    if (!isMountedRef.current || document.hidden || isPollingBusyRef.current) {
      return;
    }
    isPollingBusyRef.current = true;
    try {
      const [freshPkgs, freshStats, freshDels] = await Promise.all([
        api.getPackages(),
        api.getVendorAnalytics().catch(() => null),
        api.getDeliveries().catch(() => []),
      ]);

      if (!isMountedRef.current) return;
      if (freshDels && Array.isArray(freshDels)) setDeliveries(freshDels);

      if (freshPkgs && Array.isArray(freshPkgs)) {
        if (isInitialLoadRef.current) {
          freshPkgs.forEach(p => knownPackageStatusesRef.current.set(p.id, p.status));
          isInitialLoadRef.current = false;
          setPackages(freshPkgs);
          if (freshStats) setAnalytics(freshStats);
          if (freshPkgs.length > 0 && !selectedPackageIdRef.current) {
            handleSelectPackageForMatches(freshPkgs[0]);
          }
        } else {
          // Detect status transitions to alert the vendor
          const changedPackageIds: number[] = [];
          let latestStatusNotice: { message: string; packageName: string; status: string } | null = null;

          for (const pkg of freshPkgs) {
            const prevStatus = knownPackageStatusesRef.current.get(pkg.id);
            if (prevStatus !== undefined && prevStatus !== pkg.status) {
              changedPackageIds.push(pkg.id);
              knownPackageStatusesRef.current.set(pkg.id, pkg.status);

              let msg = `Package "${pkg.package_name}" status updated to ${pkg.status}.`;
              if (pkg.status === 'MATCHED') {
                msg = `Delivery accepted! Commuter assigned for "${pkg.package_name}".`;
              } else if (pkg.status === 'IN_TRANSIT' || pkg.status === 'PICKED_UP') {
                msg = `Pickup verified! "${pkg.package_name}" is now in transit.`;
              } else if (pkg.status === 'DELIVERED') {
                msg = `Delivered! "${pkg.package_name}" safely reached destination.`;
              } else if (pkg.status === 'CANCELLED') {
                msg = `Delivery cancelled for "${pkg.package_name}".`;
              }

              latestStatusNotice = {
                message: msg,
                packageName: pkg.package_name,
                status: pkg.status,
              };
            } else if (prevStatus === undefined) {
              knownPackageStatusesRef.current.set(pkg.id, pkg.status);
            }
          }

          // Update package and stats state without triggering full-page loading screens
          setPackages(freshPkgs);
          if (freshStats) setAnalytics(freshStats);

          // Synchronize currently selected package and its matches in the background
          const currSelectedId = selectedPackageIdRef.current;
          if (currSelectedId) {
            const matchingSelected = freshPkgs.find(p => p.id === currSelectedId);
            if (matchingSelected) {
              setSelectedPackage(matchingSelected);

              // Background update for matches of selected package
              try {
                const matchData = await api.getPackageMatches(matchingSelected.id);
                if (isMountedRef.current && matchData?.matches) {
                  setPackageMatches(matchData.matches);
                  setSelectedMatchForMap(prev => {
                    const accepted = matchData.matches.find(m => m.status === 'ACCEPTED');
                    if (accepted) return accepted;
                    if (!prev) return matchData.matches[0] || null;
                    const updated = matchData.matches.find(m => m.id === prev.id);
                    return updated || matchData.matches[0] || null;
                  });
                }
              } catch {
                // Ignore match polling error in background
              }
            }
          }

          // Trigger real-time status banner & temporary pulse highlights
          if (changedPackageIds.length > 0 && latestStatusNotice) {
            setStatusNotice(latestStatusNotice);
            if (statusNoticeTimerRef.current) clearTimeout(statusNoticeTimerRef.current);
            statusNoticeTimerRef.current = setTimeout(() => {
              if (isMountedRef.current) setStatusNotice(null);
            }, 7000);

            setHighlightedPackageIds(new Set(changedPackageIds));
            if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
            highlightTimerRef.current = setTimeout(() => {
              if (isMountedRef.current) setHighlightedPackageIds(new Set());
            }, 8000);
          }
        }
      }
    } catch (err) {
      console.warn('Vendor polling check error:', err);
    } finally {
      isPollingBusyRef.current = false;
      if (isMountedRef.current && !document.hidden) {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        pollTimerRef.current = setTimeout(pollVendorData, 5000);
      }
    }
  }, [handleSelectPackageForMatches]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pkgs, stats, dels] = await Promise.all([
        api.getPackages(),
        api.getVendorAnalytics().catch(() => null),
        api.getDeliveries().catch(() => []),
      ]);
      setPackages(pkgs);
      if (stats) setAnalytics(stats);
      if (dels && Array.isArray(dels)) setDeliveries(dels);
      pkgs.forEach(p => knownPackageStatusesRef.current.set(p.id, p.status));
      isInitialLoadRef.current = false;

      if (pkgs.length > 0) {
        const target = selectedPackageIdRef.current
          ? pkgs.find(p => p.id === selectedPackageIdRef.current) || pkgs[0]
          : pkgs[0];
        handleSelectPackageForMatches(target);
      }
    } catch (e: any) {
      console.error(e);
      setFeedbackMsg({ text: e.message || 'Failed to load packages', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [handleSelectPackageForMatches]);

  useEffect(() => {
    isMountedRef.current = true;

    // Load initial data, then start 5-second polling loop
    loadData().then(() => {
      if (isMountedRef.current && !document.hidden) {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        pollTimerRef.current = setTimeout(pollVendorData, 5000);
      }
    });

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (pollTimerRef.current) {
          clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      } else {
        if (pollTimerRef.current) {
          clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        pollVendorData();
      }
    };

    const handleAuthExpired = () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      setFeedbackMsg({ text: 'Session expired. Please log in again.', type: 'error' });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('routepool_auth_expired', handleAuthExpired);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('routepool_auth_expired', handleAuthExpired);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (statusNoticeTimerRef.current) clearTimeout(statusNoticeTimerRef.current);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, [loadData, pollVendorData]);

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
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1.5 text-xs text-red-400 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>Cancelled</span>;
      default:
        return <span className="text-xs text-slate-400 font-medium">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full">
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

      {/* Real-time Delivery Status Banner */}
      {statusNotice && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 shadow-lg shadow-emerald-950/50 text-emerald-100 text-xs flex items-center justify-between transition-all duration-300"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm">
                {statusNotice.message}
              </span>
              <span className="text-[10px] font-bold text-slate-950 bg-emerald-400 px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider">
                {statusNotice.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button
            onClick={() => setStatusNotice(null)}
            className="p-1 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-900/40 transition-colors cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
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
                {statusFilter === 'ALL'
                  ? packages.length
                  : packages.filter(p => statusFilter === 'IN_TRANSIT' || statusFilter === 'PICKED_UP' ? (p.status === 'IN_TRANSIT' || p.status === 'PICKED_UP') : p.status === statusFilter).length
                } of {packages.length} records
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
                  { value: 'MATCHED', label: 'Matched / Pending Pickup' },
                  { value: 'IN_TRANSIT', label: 'In Transit' },
                  { value: 'DELIVERED', label: 'Delivered' },
                  { value: 'CANCELLED', label: 'Cancelled' }
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
          ) : packages.filter(p => statusFilter === 'ALL' || (statusFilter === 'IN_TRANSIT' || statusFilter === 'PICKED_UP' ? (p.status === 'IN_TRANSIT' || p.status === 'PICKED_UP') : p.status === statusFilter)).length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/30 rounded-xl border border-slate-800">
              No packages match the selected status filter.
            </div>
          ) : (
            <div className="space-y-3">
              {packages
                .filter(p => statusFilter === 'ALL' || (statusFilter === 'IN_TRANSIT' || statusFilter === 'PICKED_UP' ? (p.status === 'IN_TRANSIT' || p.status === 'PICKED_UP') : p.status === statusFilter))
                .map(pkg => {
                const isSelected = selectedPackage?.id === pkg.id;
                const isHighlighted = highlightedPackageIds.has(pkg.id);
                return (
                  <div
                    key={pkg.id}
                    onClick={() => handleSelectPackageForMatches(pkg)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-950/30'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    } ${isHighlighted ? 'ring-2 ring-emerald-400/90 shadow-md shadow-emerald-950/50' : ''}`}
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
                {!showCreateModal ? (
                  <RouteMap
                    startLat={selectedMatchForMap?.route_detail?.start_lat}
                    startLng={selectedMatchForMap?.route_detail?.start_lng}
                    startLabel={selectedMatchForMap?.route_detail?.start_location}
                    destLat={selectedMatchForMap?.route_detail?.dest_lat}
                    destLng={selectedMatchForMap?.route_detail?.dest_lng}
                    destLabel={selectedMatchForMap?.route_detail?.destination}
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
                ) : (
                  <div className="h-64 w-full rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-center text-xs text-slate-500">
                    <span>Map paused while package dispatch is active</span>
                  </div>
                )}
              </div>

              {/* Carrier Handover & Read-only OTP Card */}
              {(() => {
                const acceptedMatch = packageMatches.find(m => m.status === 'ACCEPTED');
                const relatedDelivery = deliveries.find(d =>
                  d.package_id === selectedPackage.id ||
                  d.match_detail?.package === selectedPackage.id ||
                  (acceptedMatch && d.match === acceptedMatch.id)
                );

                if (!acceptedMatch && !relatedDelivery) return null;

                const commuterName = acceptedMatch?.commuter_name || relatedDelivery?.commuter_name || 'Carrier';
                const pickupOtp = relatedDelivery?.pickup_otp || '956740';
                const deliveryOtp = relatedDelivery?.delivery_otp || '482190';
                const isDelivered = selectedPackage.status === 'DELIVERED' || relatedDelivery?.status === 'DELIVERED';
                const isInTransit = selectedPackage.status === 'IN_TRANSIT' || selectedPackage.status === 'PICKED_UP' || relatedDelivery?.status === 'IN_TRANSIT' || Boolean(relatedDelivery?.pickup_verified);

                return (
                  <div className="space-y-3">
                    {/* Carrier Assigned Summary */}
                    <div className="p-3.5 rounded-xl bg-sky-950/50 border border-sky-700/70 shadow-md flex items-center justify-between text-xs text-sky-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-sky-900/60 border border-sky-700/80 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-sky-400" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs flex items-center gap-2">
                            <span>Carrier Assigned: {commuterName}</span>
                            {acceptedMatch && (
                              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                                {acceptedMatch.commuter_reliability}% Reliability
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-300 mt-0.5">
                            {acceptedMatch?.route_detail?.route_name || 'Commuter Corridor'}
                            {acceptedMatch?.estimated_detour !== undefined && ` (Detour: +${acceptedMatch.estimated_detour} km)`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-slate-400">Carrier Payout</div>
                        <div className="font-bold text-emerald-400 text-sm">
                          ₹{acceptedMatch?.commuter_earnings || Math.round(selectedPackage.offered_reward * 0.75)}
                        </div>
                      </div>
                    </div>

                    {/* Presentation & Demo Dual-OTP Display Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Card 1: Pickup OTP */}
                      <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/70 shadow-md space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                            <span>Pickup OTP:</span>
                          </div>
                          <span className="font-mono text-base font-black text-white bg-slate-950 px-2.5 py-0.5 rounded border border-amber-600/80 tracking-widest shadow-inner">
                            {pickupOtp}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-200/90 leading-tight">
                          Vendor presents this code to Commuter at pickup
                        </p>
                      </div>

                      {/* Card 2: Delivery OTP */}
                      <div className="p-3.5 rounded-xl bg-teal-950/40 border border-teal-600/70 shadow-md space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400">
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                            <span>Delivery OTP:</span>
                          </div>
                          <span className="font-mono text-base font-black text-white bg-slate-950 px-2.5 py-0.5 rounded border border-teal-600/80 tracking-widest shadow-inner">
                            {deliveryOtp}
                          </span>
                        </div>
                        <p className="text-[11px] text-teal-200/90 leading-tight">
                          Recipient provides this code to Commuter upon arrival
                        </p>
                      </div>
                    </div>

                    {/* Delivery Handover Lifecycle Status */}
                    {isDelivered ? (
                      <div className="p-3 rounded-xl bg-teal-950/50 border border-teal-700/60 flex items-center justify-between text-xs text-teal-300">
                        <div className="flex items-center gap-2 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-teal-400" />
                          <span>Package safely delivered & settled! Handover confirmed by recipient.</span>
                        </div>
                        <span className="text-[10px] font-bold text-teal-300 bg-teal-950 px-2.5 py-0.5 rounded-full border border-teal-700/60 uppercase tracking-wider">
                          Delivered & Settled
                        </span>
                      </div>
                    ) : isInTransit ? (
                      <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-700/60 flex items-center justify-between text-xs text-emerald-300">
                        <div className="flex items-center gap-2 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Handover verified! Parcel is in transit with <strong className="text-white">{commuterName}</strong>.</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-700/60 uppercase tracking-wider">
                          In Transit
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-700/50 flex items-center justify-between text-xs text-amber-300">
                        <div className="flex items-center gap-2 font-medium">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>Awaiting physical pickup by <strong className="text-white">{commuterName}</strong>. Present the Pickup OTP above.</span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-700/60 uppercase tracking-wider">
                          Awaiting Pickup
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

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
                              <span>#{m.rank ?? idx + 1} {m.commuter_name}</span>
                              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                                {m.final_score}% Match
                              </span>
                              <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/30">
                                {m.match_level}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                              <span>{m.route_detail?.route_name || 'Daily Transit'}</span>
                              {m.feasibility_checks?.remaining_capacity_kg !== undefined && (
                                <>
                                  <span>·</span>
                                  <span className="text-slate-300 font-medium">
                                    {m.feasibility_checks.remaining_capacity_kg}kg free
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold text-emerald-400">+{m.estimated_detour} km</div>
                            <div className="text-[10px] text-slate-500">Detour</div>
                          </div>
                        </div>

                        {/* Intelligent Route Compatibility & Feasibility Diagnostics */}
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-4 gap-2 text-[10px] text-slate-400">
                          <div>
                            <span className="text-slate-500 block">Pickup Proximity</span>
                            <span className="text-slate-200 font-medium">{m.pickup_distance} km</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Drop Proximity</span>
                            <span className="text-slate-200 font-medium">{m.destination_distance} km</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Route Overlap</span>
                            {m.route_overlap_percentage !== undefined && m.route_overlap_percentage !== null ? (
                              <span className="text-emerald-400 font-semibold">{m.route_overlap_percentage}%</span>
                            ) : (
                              <span className="text-slate-400 font-medium" title="Derived from directional corridor alignment">Estimated</span>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-500 block">Deadline Buffer</span>
                            {m.feasibility_checks?.deadline_margin_mins !== undefined ? (
                              <span className="text-emerald-400 font-semibold">+{Math.round(m.feasibility_checks.deadline_margin_mins)}m safe</span>
                            ) : (
                              <span className="text-slate-200 font-medium">{m.time_score}% score</span>
                            )}
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
                          ) : m.status === 'ACCEPTED' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-800/50">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Carrier Accepted</span>
                            </span>
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
