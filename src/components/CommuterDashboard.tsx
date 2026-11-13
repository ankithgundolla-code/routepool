import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bike,
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingUp,
  Award,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Package as PackageIcon,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  ArrowLeftRight,
  Sparkles,
  Bell,
  Radio
} from 'lucide-react';
import { CommuterRoute, Match, CommuterAnalytics, Delivery } from '../types';
import { api } from '../services/api';
import { RouteMap } from './RouteMap';
import { RoleGuidePanel } from './RoleGuidePanel';
import { LocationPicker } from './LocationPicker';
import { CustomSelect } from './CustomSelect';

const HYDERABAD_ROUTES_PRESET = [
  {
    name: 'Daily Office Transit: Khairatabad to Ameerpet',
    start: 'Khairatabad Metro Station',
    startLat: 17.4116,
    startLng: 78.4611,
    dest: 'Ameerpet Commercial Complex',
    destLat: 17.4375,
    destLng: 78.4482,
    mode: 'two_wheeler' as const,
    dep: '08:30',
    arr: '09:15',
    maxDetour: 1.5
  },
  {
    name: 'Tech Park Corridor: Lakdikapul to Begumpet',
    start: 'Lakdikapul Old Bridge',
    startLat: 17.4042,
    startLng: 78.4659,
    dest: 'Begumpet Tech Park',
    destLat: 17.4448,
    destLng: 78.4664,
    mode: 'two_wheeler' as const,
    dep: '08:45',
    arr: '09:30',
    maxDetour: 2.0
  },
  {
    name: 'Evening Commute: Banjara Hills to Secunderabad',
    start: 'Banjara Hills Road 12',
    startLat: 17.4156,
    startLng: 78.4357,
    dest: 'Secunderabad Railway Station',
    destLat: 17.4399,
    destLng: 78.4983,
    mode: 'car' as const,
    dep: '18:00',
    arr: '18:50',
    maxDetour: 2.5
  }
];

export const CommuterDashboard: React.FC = () => {
  const [routes, setRoutes] = useState<CommuterRoute[]>([]);
  const [opportunities, setOpportunities] = useState<Match[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [analytics, setAnalytics] = useState<CommuterAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateRouteModal, setShowCreateRouteModal] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Match | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [highlightedOppIds, setHighlightedOppIds] = useState<Set<number>>(new Set());
  const [newOppNotice, setNewOppNotice] = useState<{ count: number } | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const isPollingBusyRef = useRef<boolean>(false);
  const knownOppIdsRef = useRef<Set<number>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showGuide, setShowGuide] = useState(() => {
    try {
      return localStorage.getItem('routepool_guide_commuter_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  const [newRoute, setNewRoute] = useState({
    route_name: 'Daily Office Transit: Khairatabad to Ameerpet',
    start_location: 'Khairatabad Metro Station',
    start_lat: 17.4116,
    start_lng: 78.4611,
    destination: 'Ameerpet Commercial Complex',
    dest_lat: 17.4375,
    dest_lng: 78.4482,
    departure_time: '08:30',
    arrival_time: '09:15',
    available_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    max_package_weight: 4.0,
    max_package_size: 'medium' as 'small' | 'medium' | 'large',
    max_detour: 1.5,
    travel_mode: 'two_wheeler' as 'two_wheeler' | 'car' | 'metro_walking' | 'bicycle',
  });

  // Core polling function every 5 seconds
  const pollOpportunities = useCallback(async () => {
    if (!isMountedRef.current || document.hidden || isPollingBusyRef.current) {
      return;
    }
    isPollingBusyRef.current = true;
    try {
      const [res, stats, dels] = await Promise.all([
        api.getCommuterOpportunities(),
        api.getCommuterAnalytics().catch(() => null),
        api.getDeliveries().catch(() => []),
      ]);
      if (!isMountedRef.current) return;
      if (stats) setAnalytics(stats);
      if (dels && Array.isArray(dels)) setDeliveries(dels);

      const freshList: Match[] = res?.opportunities || [];

      if (isInitialLoadRef.current) {
        // First load: record existing opportunity IDs without triggering any notifications
        knownOppIdsRef.current = new Set(freshList.map(o => o.id));
        isInitialLoadRef.current = false;
        setOpportunities(freshList);
        setSelectedOpp(prev => prev && freshList.some(o => o.id === prev.id) ? prev : (freshList.length > 0 ? freshList[0] : null));
      } else {
        // Compare newly fetched opportunity IDs with previously known opportunity IDs
        const incomingIds = freshList.map(o => o.id);
        const newIds = incomingIds.filter(id => !knownOppIdsRef.current.has(id));

        // Always update opportunities list state so UI stays in sync without page reload
        setOpportunities(freshList);

        if (newIds.length > 0) {
          // Record new IDs so we do not repeatedly notify about the same opportunity
          newIds.forEach(id => knownOppIdsRef.current.add(id));

          // Small notification: "New delivery opportunity available!" + count
          setNewOppNotice({ count: newIds.length });
          if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
          notifTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) setNewOppNotice(null);
          }, 7000);

          // Highlight newly arrived opportunity cards temporarily
          setHighlightedOppIds(new Set(newIds));
          if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
          highlightTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) setHighlightedOppIds(new Set());
          }, 8000);

          // Auto-focus first new opportunity if nothing was selected or previous is gone
          setSelectedOpp(prev => {
            if (prev && freshList.some(o => o.id === prev.id)) return prev;
            const topNew = freshList.find(o => newIds.includes(o.id));
            return topNew || (freshList.length > 0 ? freshList[0] : null);
          });
        } else {
          // If previous selection was accepted or removed, keep selection aligned
          setSelectedOpp(prev => prev && freshList.some(o => o.id === prev.id) ? prev : (freshList.length > 0 ? freshList[0] : null));
        }
      }
    } catch (err) {
      // Gracefully handle network errors without clearing previously loaded opportunities
      console.warn('Commuter opportunity polling check error:', err);
    } finally {
      isPollingBusyRef.current = false;
      // Schedule next poll in 5 seconds if mounted and tab is visible
      if (isMountedRef.current && !document.hidden) {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        pollTimerRef.current = setTimeout(pollOpportunities, 5000);
      }
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rts, opps, stats, dels] = await Promise.all([
        api.getCommuterRoutes(),
        api.getCommuterOpportunities(),
        api.getCommuterAnalytics().catch(() => null),
        api.getDeliveries().catch(() => []),
      ]);
      setRoutes(rts);
      const oppList = opps?.opportunities || [];
      setOpportunities(oppList);
      if (dels && Array.isArray(dels)) setDeliveries(dels);

      // Track known IDs so manual refresh doesn't trigger new opportunity alerts
      oppList.forEach(o => knownOppIdsRef.current.add(o.id));
      isInitialLoadRef.current = false;

      if (stats) setAnalytics(stats);
      setSelectedOpp(prev => (prev && oppList.some(o => o.id === prev.id) ? prev : (oppList.length > 0 ? oppList[0] : null)));
    } catch (e: any) {
      console.error(e);
      setFeedback({ text: e.message || 'Failed to load commuter data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // 1. Fetch commuter opportunities immediately when the dashboard loads
    loadData().then(() => {
      // Start 5-second polling cycle
      if (isMountedRef.current && !document.hidden) {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        pollTimerRef.current = setTimeout(pollOpportunities, 5000);
      }
    });

    // 7. Pause polling when the browser tab is hidden and resume when it becomes visible
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
        pollOpportunities();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 6 & 10. Stop polling when commuter logs out or unmounts, clean up timers and listeners
    return () => {
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    };
  }, [loadData, pollOpportunities]);

  const handleToggleRoute = async (id: number) => {
    try {
      const res = await api.toggleCommuterRoute(id);
      setRoutes(routes.map(r => r.id === id ? { ...r, is_active: res.is_active } : r));
      loadData();
    } catch (err: any) {
      setFeedback({ text: err.message, type: 'error' });
    }
  };

  const handleDeleteRoute = async (id: number) => {
    if (!confirm('Are you sure you want to remove this commuter route?')) return;
    try {
      await api.deleteCommuterRoute(id);
      setFeedback({ text: 'Route removed successfully', type: 'success' });
      loadData();
    } catch (err: any) {
      setFeedback({ text: err.message, type: 'error' });
    }
  };

  const [routeModalError, setRouteModalError] = useState<string | null>(null);

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setRouteModalError(null);

    if (!newRoute.start_location?.trim() || !newRoute.start_lat || !newRoute.start_lng) {
      setRouteModalError('Both start (origin) and destination locations with valid coordinates are required.');
      return;
    }
    if (!newRoute.destination?.trim() || !newRoute.dest_lat || !newRoute.dest_lng) {
      setRouteModalError('Both start (origin) and destination locations with valid coordinates are required.');
      return;
    }

    try {
      await api.createCommuterRoute(newRoute);
      setShowCreateRouteModal(false);
      setFeedback({ text: 'Commuter route registered! Searching for compatible packages...', type: 'success' });
      loadData();
    } catch (err: any) {
      setRouteModalError(err.message || 'Failed to register route');
    }
  };

  const handleAcceptMatch = async (matchId: number) => {
    try {
      const res = await api.acceptMatch(matchId);
      setFeedback({
        text: `Match accepted! Delivery #${res.delivery_id} initiated. Head over to the OTP Station when at pickup.`,
        type: 'success'
      });
      loadData();
    } catch (err: any) {
      setFeedback({ text: err.message, type: 'error' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Commuter Pooling Portal</h1>
          <p className="text-xs text-slate-400 mt-1">
            Monetize your regular daily journey by carrying packages along your natural path.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              const next = !showGuide;
              setShowGuide(next);
              try {
                if (!next) localStorage.setItem('routepool_guide_commuter_dismissed', 'true');
                else localStorage.removeItem('routepool_guide_commuter_dismissed');
              } catch {}
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              showGuide
                ? 'bg-cyan-950/50 border-cyan-700/60 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Getting Started Guide"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Guide</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh Opportunities"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateRouteModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Commute Route</span>
          </button>
        </div>
      </div>

      {/* Role-Specific Getting Started Guide */}
      {showGuide && (
        <RoleGuidePanel
          role="commuter"
          onDismiss={() => {
            setShowGuide(false);
            try {
              localStorage.setItem('routepool_guide_commuter_dismissed', 'true');
            } catch {}
          }}
        />
      )}

      {feedback && (
        <div className={`p-3 rounded-xl text-xs flex items-center justify-between ${
          feedback.type === 'success' ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' : 'bg-red-950/60 border border-red-800 text-red-300'
        }`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Total Rewards Earned</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">₹{analytics?.total_rewards_earned_inr ?? 41.25}</div>
          <div className="text-[11px] text-slate-500 mt-1">Direct wallet earnings</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Reliability Score</div>
          <div className="text-2xl font-bold text-white mt-1">{analytics?.reliability_score ?? 98.0}%</div>
          <div className="text-[11px] text-emerald-400 mt-1">High trust profile</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Extra Detour Travelled</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">+{analytics?.estimated_extra_distance_km ?? 0.7} km</div>
          <div className="text-[11px] text-slate-500 mt-1">Total detour across completed jobs</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Active Opportunities</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{opportunities.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Matches within your max detour</div>
        </div>
      </div>

      {/* Active Deliveries in Progress */}
      {(() => {
        const activeDeliveries = deliveries.filter(d => ['PICKUP_PENDING', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status));
        if (activeDeliveries.length === 0) return null;

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span>Active Deliveries In Progress</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  {activeDeliveries.length} Active
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeDeliveries.map((del) => {
                const pLat = del.pickup_lat ?? del.match_detail?.package_detail?.pickup_lat;
                const pLng = del.pickup_lng ?? del.match_detail?.package_detail?.pickup_lng;
                const dLat = del.dest_lat ?? del.match_detail?.package_detail?.dest_lat;
                const dLng = del.dest_lng ?? del.match_detail?.package_detail?.dest_lng;

                return (
                  <div
                    key={del.id}
                    className="p-4 rounded-xl bg-slate-900 border border-emerald-500/50 shadow-lg shadow-emerald-950/20 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center shrink-0">
                          <PackageIcon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{del.package_name}</span>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                              {del.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            Vendor: <strong className="text-slate-200">{del.vendor_business}</strong>
                            <span className="mx-1.5">·</span>
                            <span>Delivery #{del.id}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base font-extrabold text-emerald-400">₹{del.offered_reward}</div>
                        <div className="text-[10px] text-slate-500">Reward</div>
                      </div>
                    </div>

                    {/* Pickup & Destination Navigation Rows */}
                    <div className="space-y-2 text-xs">
                      {/* Pickup Address + Navigation */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0"></span>
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Pickup Location</span>
                            <span className="text-slate-200 truncate block font-medium" title={del.pickup_location}>{del.pickup_location}</span>
                          </div>
                        </div>
                        {typeof pLat === 'number' && typeof pLng === 'number' && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${pLat},${pLng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded px-2.5 py-1 inline-flex items-center gap-1.5 shrink-0 transition-colors font-medium shadow-sm"
                          >
                            <span>🧭 Navigate to Pickup</span>
                          </a>
                        )}
                      </div>

                      {/* Destination Address + Navigation */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-rose-400 mt-1 shrink-0"></span>
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-rose-400 block">Destination Drop-off</span>
                            <span className="text-slate-200 truncate block font-medium" title={del.destination}>{del.destination}</span>
                          </div>
                        </div>
                        {typeof dLat === 'number' && typeof dLng === 'number' && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${dLat},${dLng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded px-2.5 py-1 inline-flex items-center gap-1.5 shrink-0 transition-colors font-medium shadow-sm"
                          >
                            <span>🧭 Navigate to Drop-off</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Status helper banner */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        {!del.pickup_verified
                          ? '🟡 Collect parcel from vendor & verify Pickup OTP at station'
                          : '🟢 In transit! Deliver to destination & verify Drop-off OTP'}
                      </span>
                      <span className="font-semibold text-cyan-400">
                        {!del.pickup_verified ? 'Step 1: Pickup Handover' : 'Step 2: Recipient Handover'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Main Grid: Opportunities & Route Management */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Delivery Opportunities Near Your Route</span>
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  {opportunities.length} Available
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40" title="Automatic real-time polling every 5 seconds">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                  </span>
                  <span>Live (5s)</span>
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Packages awaiting pickup along your registered path</p>
            </div>
          </div>

          {/* Real-time Opportunity Notification */}
          {newOppNotice && (
            <div
              role="status"
              aria-live="polite"
              className="p-3.5 rounded-xl bg-cyan-950/80 border border-cyan-500/60 shadow-lg shadow-cyan-950/50 text-cyan-100 text-xs flex items-center justify-between transition-all duration-300"
            >
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">
                    {newOppNotice.count === 1 ? 'New delivery opportunity available!' : `${newOppNotice.count} new delivery opportunities available!`}
                  </span>
                  <span className="text-[10px] font-bold text-slate-950 bg-cyan-400 px-2 py-0.5 rounded-full shadow-sm">
                    +{newOppNotice.count} New
                  </span>
                </div>
              </div>
              <button
                onClick={() => setNewOppNotice(null)}
                className="p-1 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-900/40 transition-colors cursor-pointer"
                title="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
              Scanning active commuter corridors...
            </div>
          ) : opportunities.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/30 border border-slate-800 text-center text-xs text-slate-400">
              No packages currently matching your routes. When local vendors create deliveries near your path, they will automatically appear here!
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.map(opp => {
                const isSelected = selectedOpp?.id === opp.id;
                const isHighlighted = highlightedOppIds.has(opp.id);
                return (
                  <div
                    key={opp.id}
                    onClick={() => setSelectedOpp(opp)}
                    className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                      isHighlighted
                        ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-950/60'
                        : isSelected
                        ? 'bg-slate-900 border-cyan-500/80 shadow-lg shadow-cyan-950/30'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <PackageIcon className="w-4 h-4 text-cyan-400" />
                          <span>{opp.package_detail?.package_name || 'Delivery Parcel'}</span>
                          {isHighlighted && (
                            <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide bg-cyan-400 text-slate-950 rounded-full animate-pulse shadow-sm">
                              New Opportunity
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Vendor: <strong className="text-slate-200">{opp.vendor_business_name}</strong>
                          <span className="mx-1.5">·</span>
                          <span>{opp.package_detail?.weight} kg</span>
                          <span className="mx-1.5">·</span>
                          <span className="capitalize">{opp.package_detail?.size}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-extrabold text-emerald-400">₹{opp.commuter_earnings}</div>
                        <div className="text-[10px] text-slate-500">Your Reward</div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Corridor</span>
                        <span className="text-slate-300 truncate block">{opp.route_detail?.route_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Detour</span>
                        <span className="text-amber-400 font-bold block">+{opp.estimated_detour} km</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Match Score</span>
                        <span className="text-cyan-400 font-bold block">{opp.final_score}% ({opp.match_level})</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-slate-400">
                          Pickup: <span className="text-slate-300">{opp.package_detail?.pickup_location}</span>
                        </span>
                        {typeof opp.package_detail?.pickup_lat === 'number' && typeof opp.package_detail?.pickup_lng === 'number' && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${opp.package_detail.pickup_lat},${opp.package_detail.pickup_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded px-2.5 py-1 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Navigate to Pickup in Google Maps"
                          >
                            <span>🧭 Navigate to Pickup</span>
                          </a>
                        )}
                      </div>
                      {opp.status === 'ACCEPTED' ? (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Accepted / Ready for Pickup
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptMatch(opp.id);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept & Carry (₹{opp.commuter_earnings})</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Registered Commuter Routes */}
          <div className="pt-6 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bike className="w-4 h-4 text-cyan-400" />
                <span>Your Registered Commuter Corridors</span>
              </h3>
              <span className="text-xs text-slate-400">{routes.length} active routes</span>
            </div>

            <div className="space-y-2">
              {routes.map(r => (
                <div key={r.id} className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-100 flex items-center gap-2">
                      <span>{r.route_name}</span>
                      <span className="text-[10px] text-slate-400 capitalize bg-slate-800 px-1.5 py-0.5 rounded">
                        {r.travel_mode.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                      <span>{r.start_location} → {r.destination}</span>
                      <span>·</span>
                      <span>{r.departure_time} - {r.arrival_time}</span>
                      <span>·</span>
                      <span>Max detour: <strong>{r.max_detour}km</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleRoute(r.id)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                      title={r.is_active ? 'Pause route' : 'Activate route'}
                    >
                      {r.is_active ? (
                        <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1">Active</span>
                      ) : (
                        <span className="text-slate-500 font-semibold text-xs">Paused</span>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteRoute(r.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove route"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Detour Inspection Map */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            {(() => {
              const activeRoute = routes.find(r => r.is_active) || (routes.length > 0 ? routes[0] : null);

              return (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Route & Detour Inspection</h3>
                    {selectedOpp ? (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                        Detour: +{selectedOpp.estimated_detour} km
                      </span>
                    ) : activeRoute ? (
                      <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-full">
                        Registered Corridor
                      </span>
                    ) : null}
                  </div>

                  {!showCreateRouteModal ? (
                    <RouteMap
                      startLat={selectedOpp?.route_detail?.start_lat || activeRoute?.start_lat || 17.4116}
                      startLng={selectedOpp?.route_detail?.start_lng || activeRoute?.start_lng || 78.4611}
                      startLabel={selectedOpp?.route_detail?.start_location || activeRoute?.start_location || 'Khairatabad'}
                      destLat={selectedOpp?.route_detail?.dest_lat || activeRoute?.dest_lat || 17.4375}
                      destLng={selectedOpp?.route_detail?.dest_lng || activeRoute?.dest_lng || 78.4482}
                      destLabel={selectedOpp?.route_detail?.destination || activeRoute?.destination || 'Ameerpet'}
                      waypoints={selectedOpp?.route_detail?.intermediate_points || activeRoute?.intermediate_points || []}
                      pickupLat={selectedOpp?.package_detail?.pickup_lat}
                      pickupLng={selectedOpp?.package_detail?.pickup_lng}
                      pickupLabel={selectedOpp?.package_detail?.pickup_location}
                      dropLat={selectedOpp?.package_detail?.dest_lat}
                      dropLng={selectedOpp?.package_detail?.dest_lng}
                      dropLabel={selectedOpp?.package_detail?.destination}
                      detourKm={selectedOpp?.estimated_detour}
                      className="h-64 w-full rounded-xl overflow-hidden border border-slate-800"
                    />
                  ) : (
                    <div className="h-64 w-full rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-center text-xs text-slate-500">
                      <span>Map paused while route registration is active</span>
                    </div>
                  )}

                  {selectedOpp ? (
                    <div className="space-y-3">
                      {/* Commuter Opportunity Pickup & Drop-off Navigation Points */}
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                          <span className="font-semibold text-white flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Waypoints & Navigation</span>
                          </span>
                          <span className="text-[10px] text-slate-400">Google Maps</span>
                        </div>

                        {/* Pickup Address & Navigation Action */}
                        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Pickup Location</span>
                            <span className="text-slate-200 truncate block font-medium" title={selectedOpp.package_detail?.pickup_location}>
                              {selectedOpp.package_detail?.pickup_location || 'Vendor Pickup Point'}
                            </span>
                          </div>
                          {typeof selectedOpp.package_detail?.pickup_lat === 'number' && typeof selectedOpp.package_detail?.pickup_lng === 'number' && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOpp.package_detail.pickup_lat},${selectedOpp.package_detail.pickup_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded px-2.5 py-1 inline-flex items-center gap-1.5 shrink-0 transition-colors font-medium shadow-sm hover:text-cyan-300"
                              title="Navigate to Pickup in Google Maps"
                            >
                              <span>🧭</span>
                              <span>Navigate to Pickup</span>
                            </a>
                          )}
                        </div>

                        {/* Destination Address & Navigation Action */}
                        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-rose-400 block">Destination Drop-off</span>
                            <span className="text-slate-200 truncate block font-medium" title={selectedOpp.package_detail?.destination}>
                              {selectedOpp.package_detail?.destination || 'Client Destination Point'}
                            </span>
                          </div>
                          {typeof selectedOpp.package_detail?.dest_lat === 'number' && typeof selectedOpp.package_detail?.dest_lng === 'number' && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOpp.package_detail.dest_lat},${selectedOpp.package_detail.dest_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded px-2.5 py-1 inline-flex items-center gap-1.5 shrink-0 transition-colors font-medium shadow-sm hover:text-cyan-300"
                              title="Navigate to Drop-off in Google Maps"
                            >
                              <span>🧭</span>
                              <span>Navigate to Drop-off</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Normal Travel Distance:</span>
                          <span className="text-slate-200 font-semibold">{selectedOpp.normal_distance} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total with Package Detour:</span>
                          <span className="text-slate-200 font-semibold">{selectedOpp.delivery_distance} km</span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-slate-800/80">
                          <span className="text-slate-300 font-medium">Marginal Additional Travel:</span>
                          <span className="text-emerald-400 font-bold">+{selectedOpp.estimated_detour} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300 font-medium">Net Commuter Reward:</span>
                          <span className="text-white font-bold">₹{selectedOpp.commuter_earnings}</span>
                        </div>
                      </div>

                      {selectedOpp.status === 'PROPOSED' && (
                        <button
                          onClick={() => handleAcceptMatch(selectedOpp.id)}
                          className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                        >
                          <span>Accept Delivery Request</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Active Routine Corridor:</span>
                        <span className="text-cyan-400 font-bold truncate max-w-[200px] text-right">
                          {activeRoute?.route_name || 'Daily Transit Corridor'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Schedule:</span>
                        <span className="text-slate-200">
                          {activeRoute ? `${activeRoute.departure_time} ➔ ${activeRoute.arrival_time}` : '08:30 ➔ 09:15'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Max Detour Threshold:</span>
                        <span className="text-slate-200">
                          {activeRoute ? `+${activeRoute.max_detour} km` : '+1.5 km'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/80 leading-relaxed">
                        Your registered commuter corridor is active on the map above. When vendors create deliveries near your path, select any opportunity on the left to inspect detour waypoints.
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Modal: Register Commuter Route */}
      {showCreateRouteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-xs text-slate-200 relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Register Commute Journey</h3>
                <p className="text-[11px] text-slate-400">Define your regular routine to receive compatible delivery opportunities across Hyderabad</p>
              </div>
              <button onClick={() => setShowCreateRouteModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <CustomSelect
                label="Quick Corridor Presets (Hyderabad)"
                value=""
                placeholder="Choose a popular route preset or customize below..."
                accentColor="cyan"
                onChange={(val) => {
                  const idx = parseInt(val);
                  if (!isNaN(idx)) {
                    const p = HYDERABAD_ROUTES_PRESET[idx];
                    setNewRoute({
                      ...newRoute,
                      route_name: p.name,
                      start_location: p.start,
                      start_lat: p.startLat,
                      start_lng: p.startLng,
                      destination: p.dest,
                      dest_lat: p.destLat,
                      dest_lng: p.destLng,
                      departure_time: p.dep,
                      arrival_time: p.arr,
                      max_detour: p.maxDetour,
                      travel_mode: p.mode
                    });
                  }
                }}
                options={HYDERABAD_ROUTES_PRESET.map((p, idx) => ({
                  value: String(idx),
                  label: p.name,
                  badge: `${p.mode.replace('_', ' ')} · ${p.dep}-${p.arr}`,
                  description: `${p.start} ➔ ${p.dest} (Max Detour: ${p.maxDetour}km)`
                }))}
              />
            </div>

            <form onSubmit={handleCreateRoute} className="space-y-4">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Route Name</label>
                <input
                  type="text"
                  required
                  value={newRoute.route_name}
                  onChange={(e) => setNewRoute({ ...newRoute, route_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:border-cyan-500 outline-none"
                />
              </div>

              {/* Reusable Location Picker */}
              <LocationPicker
                pickupLabel="Commute Start (Origin)"
                destLabel="Commute Destination (Drop-off)"
                pickupValue={{
                  location: newRoute.start_location,
                  lat: newRoute.start_lat,
                  lng: newRoute.start_lng,
                }}
                destValue={{
                  location: newRoute.destination,
                  lat: newRoute.dest_lat,
                  lng: newRoute.dest_lng,
                }}
                onChange={({ pickup, destination }) => {
                  setRouteModalError(null);
                  setNewRoute(prev => ({
                    ...prev,
                    start_location: pickup.location,
                    start_lat: pickup.lat,
                    start_lng: pickup.lng,
                    destination: destination.location,
                    dest_lat: destination.lat,
                    dest_lng: destination.lng,
                  }));
                }}
                accentColor="cyan"
                error={routeModalError}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Departure Time</label>
                  <input
                    type="time"
                    required
                    value={newRoute.departure_time}
                    onChange={(e) => setNewRoute({ ...newRoute, departure_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:border-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Arrival Time</label>
                  <input
                    type="time"
                    required
                    value={newRoute.arrival_time}
                    onChange={(e) => setNewRoute({ ...newRoute, arrival_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <CustomSelect
                    label="Travel Mode"
                    value={newRoute.travel_mode}
                    accentColor="cyan"
                    onChange={(val) => setNewRoute({ ...newRoute, travel_mode: val as any })}
                    options={[
                      {
                        value: 'two_wheeler',
                        label: 'Motorcycle / Scooter',
                        badge: 'Fastest',
                        description: 'Nimble navigation through peak Hyderabad rush traffic'
                      },
                      {
                        value: 'car',
                        label: 'Personal Car',
                        badge: 'High Capacity',
                        description: 'Spacious trunk capacity & weatherproof parcel transport'
                      },
                      {
                        value: 'metro_walking',
                        label: 'Metro Transit & Walking',
                        badge: 'Eco Corridor',
                        description: 'Hyderabad Metro (Red/Blue/Green line) + short stroll'
                      },
                      {
                        value: 'bicycle',
                        label: 'Bicycle / EV Cycle',
                        badge: 'Zero Carbon',
                        description: 'Hyperlocal clean transport for short neighborhood hops'
                      }
                    ]}
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Max Acceptable Detour (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    max="5.0"
                    required
                    value={newRoute.max_detour}
                    onChange={(e) => setNewRoute({ ...newRoute, max_detour: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:border-cyan-500 outline-none no-spinners"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Max Package Weight (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1.0"
                    max="10.0"
                    value={newRoute.max_package_weight}
                    onChange={(e) => setNewRoute({ ...newRoute, max_package_weight: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:border-cyan-500 outline-none no-spinners"
                  />
                </div>
                <div>
                  <CustomSelect
                    label="Max Package Size"
                    value={newRoute.max_package_size}
                    accentColor="cyan"
                    onChange={(val) => setNewRoute({ ...newRoute, max_package_size: val as any })}
                    options={[
                      {
                        value: 'small',
                        label: 'Small Parcel',
                        badge: '< 20cm',
                        description: 'Fits inside everyday office backpack or sling bag'
                      },
                      {
                        value: 'medium',
                        label: 'Medium Parcel',
                        badge: '< 40cm',
                        description: 'Fits standard courier tote or two-wheeler footboard'
                      },
                      {
                        value: 'large',
                        label: 'Large Parcel',
                        badge: '< 60cm',
                        description: 'Requires car boot or rear carrier space'
                      }
                    ]}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateRouteModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  Save Route Corridor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
