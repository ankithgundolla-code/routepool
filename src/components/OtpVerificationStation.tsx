import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Package as PackageIcon,
  AlertCircle,
  Truck,
  Leaf,
  DollarSign,
  UserX,
  X
} from 'lucide-react';
import { Delivery } from '../types';
import { api } from '../services/api';

interface OtpVerificationStationProps {
  userRole?: 'vendor' | 'commuter' | 'admin';
}

export const OtpVerificationStation: React.FC<OtpVerificationStationProps> = ({ userRole }) => {
  const [role, setRole] = useState<'vendor' | 'commuter' | 'admin'>(userRole || 'commuter');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [pickupOtpInput, setPickupOtpInput] = useState('');
  const [deliveryOtpInput, setDeliveryOtpInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [settledResult, setSettledResult] = useState<any>(null);

  useEffect(() => {
    if (userRole) {
      setRole(userRole);
    } else {
      api.getProfile().then(user => {
        if (user?.role) setRole(user.role);
      }).catch(() => {});
    }
  }, [userRole]);

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const data = await api.getDeliveries();
      setDeliveries(data);
      if (data.length > 0 && !selectedDelivery) {
        setSelectedDelivery(data[0]);
      } else if (selectedDelivery) {
        const updated = data.find(d => d.id === selectedDelivery.id);
        if (updated) setSelectedDelivery(updated);
      }
    } catch (e: any) {
      console.error(e);
      setStatusMsg({ text: e.message || 'Failed to fetch deliveries', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPickup = async () => {
    if (!selectedDelivery) return;
    try {
      const res = await api.verifyPickupOTP(selectedDelivery.id, pickupOtpInput);
      setStatusMsg({ text: res.detail, type: 'success' });
      setPickupOtpInput('');
      await loadDeliveries();
    } catch (e: any) {
      setStatusMsg({ text: e.message || 'Verification failed', type: 'error' });
    }
  };

  const handleVerifyDelivery = async () => {
    if (!selectedDelivery) return;
    try {
      const res = await api.verifyDeliveryOTP(selectedDelivery.id, deliveryOtpInput);
      setStatusMsg({ text: res.detail, type: 'success' });
      setDeliveryOtpInput('');
      setSettledResult(res);
      await loadDeliveries();
    } catch (e: any) {
      setStatusMsg({ text: e.message || 'Verification failed', type: 'error' });
    }
  };

  const handleCancelDelivery = async () => {
    if (!selectedDelivery) return;
    if (!confirm('Simulate commuter cancellation? The package will revert to SEARCHING and commuter reliability will be penalized.')) return;
    try {
      const res = await api.cancelDelivery(selectedDelivery.id);
      setStatusMsg({ text: res.detail, type: 'success' });
      await loadDeliveries();
    } catch (e: any) {
      setStatusMsg({ text: e.message || 'Failed to cancel delivery', type: 'error' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Dual-OTP Handover Console</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dual-OTP Handover & Verification Station</h1>
          <p className="text-xs text-slate-400 mt-1">
            Simulate physical chain-of-custody transfer between vendor, commuter, and recipient without paid SMS.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {userRole === 'admin' && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold px-2">Role View:</span>
              <button
                onClick={() => setRole('commuter')}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  role === 'commuter'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Commuter View
              </button>
              <button
                onClick={() => setRole('vendor')}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  role === 'vendor'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Vendor View
              </button>
            </div>
          )}
          <button
            onClick={loadDeliveries}
            className="self-start sm:self-auto px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Deliveries</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
          statusMsg.type === 'success' ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' : 'bg-red-950/60 border border-red-800 text-red-300'
        }`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Deliveries ({deliveries.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
              Loading deliveries...
            </div>
          ) : deliveries.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/30 border border-slate-800 text-center text-xs text-slate-400">
              No active delivery matches yet. Accept an opportunity in the <strong>Commuter Hub</strong> to initiate an OTP lifecycle!
            </div>
          ) : (
            <div className="space-y-2">
              {deliveries.map(del => {
                const isSelected = selectedDelivery?.id === del.id;
                return (
                  <div
                    key={del.id}
                    onClick={() => {
                      setSelectedDelivery(del);
                      setSettledResult(null);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-amber-500/80 shadow-lg'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white truncate">{del.package_name}</span>
                      <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/40">
                        {del.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Carrier: <strong className="text-slate-200">{del.commuter_name}</strong>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Reward: ₹{del.offered_reward}</span>
                      <span>Delivery #{del.id}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Interactive OTP Test Console */}
        <div className="lg:col-span-8 space-y-6">
          {selectedDelivery ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <PackageIcon className="w-5 h-5 text-amber-400" />
                    <span>{selectedDelivery.package_name}</span>
                  </h3>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <span>Vendor: <strong className="text-slate-200">{selectedDelivery.vendor_business}</strong></span>
                    <span>·</span>
                    <span>Commuter: <strong className="text-slate-200">{selectedDelivery.commuter_name}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-semibold">
                    State: <strong className="text-emerald-400">{selectedDelivery.status}</strong>
                  </span>
                  {selectedDelivery.status === 'PICKUP_PENDING' && (
                    <button
                      onClick={handleCancelDelivery}
                      className="px-2.5 py-1 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-400 hover:bg-red-900/50 flex items-center gap-1 cursor-pointer"
                      title="Simulate cancellation before pickup"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Simulate Commuter Cancel</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Waypoints & Navigation Bar */}
              {(() => {
                const pLat = selectedDelivery.pickup_lat ?? selectedDelivery.match_detail?.package_detail?.pickup_lat;
                const pLng = selectedDelivery.pickup_lng ?? selectedDelivery.match_detail?.package_detail?.pickup_lng;
                const dLat = selectedDelivery.dest_lat ?? selectedDelivery.match_detail?.package_detail?.dest_lat;
                const dLng = selectedDelivery.dest_lng ?? selectedDelivery.match_detail?.package_detail?.dest_lng;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block">Pickup Location</span>
                        <span className="text-slate-200 truncate block font-medium" title={selectedDelivery.pickup_location}>{selectedDelivery.pickup_location}</span>
                      </div>
                      {typeof pLat === 'number' && typeof pLng === 'number' && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${pLat},${pLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded px-2.5 py-1 inline-flex items-center gap-1.5 shrink-0 transition-colors font-medium shadow-sm hover:text-cyan-300"
                          title="Navigate to Pickup in Google Maps"
                        >
                          <span>🧭 Navigate to Pickup</span>
                        </a>
                      )}
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-rose-400 block">Destination Drop-off</span>
                        <span className="text-slate-200 truncate block font-medium" title={selectedDelivery.destination}>{selectedDelivery.destination}</span>
                      </div>
                      {typeof dLat === 'number' && typeof dLng === 'number' && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${dLat},${dLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded px-2.5 py-1 inline-flex items-center gap-1.5 shrink-0 transition-colors font-medium shadow-sm hover:text-cyan-300"
                          title="Navigate to Drop-off in Google Maps"
                        >
                          <span>🧭 Navigate to Drop-off</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Presentation & Demo Dual-OTP Display Card */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Dual-OTP Handover Codes (Demo / Presentation)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Zero SMS Cost Verification
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card 1: Pickup OTP */}
                  <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/70 shadow-md space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400">Pickup OTP:</span>
                      <span className="font-mono text-base font-black text-white bg-slate-950 px-2.5 py-0.5 rounded border border-amber-600/80 tracking-widest shadow-inner">
                        {selectedDelivery.pickup_otp || '956740'}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-tight">
                      Vendor presents this code to Commuter at pickup
                    </p>
                  </div>

                  {/* Card 2: Delivery OTP */}
                  <div className="p-3.5 rounded-xl bg-teal-950/40 border border-teal-600/70 shadow-md space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-400">Delivery OTP:</span>
                      <span className="font-mono text-base font-black text-white bg-slate-950 px-2.5 py-0.5 rounded border border-teal-600/80 tracking-widest shadow-inner">
                        {selectedDelivery.delivery_otp || '482190'}
                      </span>
                    </div>
                    <p className="text-[11px] text-teal-200/90 leading-tight">
                      Recipient provides this code to Commuter upon arrival
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 1: Pickup OTP Verification */}
              <div className={`p-5 rounded-xl border transition-all ${
                selectedDelivery.pickup_verified
                  ? 'bg-slate-950/40 border-slate-800 opacity-90'
                  : 'bg-slate-950 border-amber-600/50 shadow-md shadow-amber-950/20'
              }`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                      <span>Step 1: Physical Pickup Handover</span>
                      {selectedDelivery.pickup_verified && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {role === 'vendor'
                        ? 'Vendor presents this 6-digit verification code. The commuter inputs it to confirm physical collection.'
                        : 'Vendor presents the Pickup OTP. Commuter types it to verify receipt of physical item.'}
                    </p>
                  </div>

                  {/* Vendor screen display badge */}
                  {(role === 'vendor' || role === 'admin') && (
                    <div className="p-3 rounded-lg bg-slate-900 border border-amber-800/60 text-center shrink-0">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Vendor's Screen Displays</div>
                      <div className="text-xl font-mono font-black text-amber-400 tracking-widest mt-0.5">
                        {selectedDelivery.pickup_otp || '956740'}
                      </div>
                    </div>
                  )}
                </div>

                {/* VENDOR VIEW: Clean Read-Only Card (Never types OTP, no empty/disabled input fields) */}
                {role === 'vendor' ? (
                  !selectedDelivery.pickup_verified ? (
                    <div className="mt-4 pt-4 border-t border-slate-800/80">
                      <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/70 shadow-md space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                            <KeyRound className="w-4 h-4 text-amber-400" />
                            <span>Pickup Verification Code:</span>
                            <span className="font-mono text-base font-black text-white bg-slate-950 px-2.5 py-0.5 rounded border border-amber-600/80 tracking-widest">
                              {selectedDelivery.pickup_otp || '956740'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-900/60 px-2.5 py-0.5 rounded-full border border-amber-700/60">
                            Awaiting Handover
                          </span>
                        </div>
                        <p className="text-xs text-amber-200/90 leading-relaxed">
                          Show this 6-digit code to commuter <strong className="text-white">{selectedDelivery.commuter_name}</strong> when handing over the physical parcel.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Clean In-Transit status badge without any empty/disabled input fields */
                    <div className="mt-3 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between text-xs text-emerald-300">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Pickup verified! Parcel is in transit with <strong className="text-white">{selectedDelivery.commuter_name}</strong>.</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800/60 uppercase tracking-wider">
                        In Transit
                      </span>
                    </div>
                  )
                ) : (
                  /* COMMUTER VIEW: Commuter inputs the 6-digit code received from vendor */
                  !selectedDelivery.pickup_verified ? (
                    <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit Pickup OTP"
                        value={pickupOtpInput}
                        onChange={(e) => setPickupOtpInput(e.target.value)}
                        className="w-full sm:w-64 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono text-center tracking-widest outline-none focus:border-amber-400 text-sm"
                      />
                      <button
                        onClick={handleVerifyPickup}
                        className="w-full sm:w-auto px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify Handover (Transit Start)</span>
                      </button>
                      {selectedDelivery.pickup_otp && (
                        <button
                          onClick={() => setPickupOtpInput(selectedDelivery.pickup_otp)}
                          className="text-[11px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
                        >
                          Auto-fill OTP
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-400 flex items-center gap-1.5 mt-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Pickup verified! Package transitioned to <strong>IN_TRANSIT</strong>.</span>
                    </div>
                  )
                )}
              </div>

              {/* Step 2: Delivery OTP Verification */}
              <div className={`p-5 rounded-xl border transition-all ${
                selectedDelivery.delivery_verified
                  ? 'bg-slate-950/40 border-slate-800 opacity-90'
                  : 'bg-slate-950 border-teal-600/50 shadow-md shadow-teal-950/20'
              }`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider">
                      <span>Step 2: Destination Drop-off & Settlement</span>
                      {selectedDelivery.delivery_verified && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {role === 'vendor'
                        ? 'Recipient verifies final delivery drop-off. Reward and eco-savings are disbursed upon settlement.'
                        : 'Recipient provides the Delivery OTP upon receiving the goods. Commuter submits it to settle payout.'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-teal-800/60 text-center shrink-0">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Recipient's Drop-off OTP</div>
                    <div className="text-xl font-mono font-black text-teal-400 tracking-widest mt-0.5">
                      {selectedDelivery.delivery_otp || '482190'}
                    </div>
                  </div>
                </div>

                {role === 'vendor' ? (
                  !selectedDelivery.delivery_verified ? (
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-teal-400 shrink-0" />
                        <span>Carrier traveling to <strong className="text-white">{selectedDelivery.destination}</strong>. Recipient Drop-off OTP: <strong className="font-mono text-white bg-slate-900 px-2 py-0.5 rounded border border-teal-700/60">{selectedDelivery.delivery_otp || '482190'}</strong></span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-teal-400 bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-800/60 shrink-0">
                        {selectedDelivery.pickup_verified ? 'In Transit' : 'Pending Pickup'}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-3 p-3.5 rounded-xl bg-teal-950/40 border border-teal-700/60 flex items-center justify-between text-xs text-teal-300">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-teal-400" />
                        <span>Delivery confirmed & settled at destination!</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-teal-300 bg-teal-950 px-2.5 py-0.5 rounded-full border border-teal-700/60">
                        Delivered & Settled
                      </span>
                    </div>
                  )
                ) : (
                  !selectedDelivery.delivery_verified ? (
                    <div className="mt-4 pt-4 border-t border-slate-800/80">
                      {!selectedDelivery.pickup_verified && (
                        <p className="text-[11px] text-amber-300/80 mb-2.5 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Tip: Verify Step 1 Pickup OTP first to start transit, then submit the Delivery OTP below to settle.</span>
                        </p>
                      )}
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Enter 6-digit Delivery OTP"
                          value={deliveryOtpInput}
                          onChange={(e) => setDeliveryOtpInput(e.target.value)}
                          className="w-full sm:w-64 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono text-center tracking-widest outline-none focus:border-teal-400 text-sm"
                        />
                        <button
                          onClick={handleVerifyDelivery}
                          className="w-full sm:w-auto px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirm Drop-off & Settle Payout</span>
                        </button>
                        <button
                          onClick={() => setDeliveryOtpInput(selectedDelivery.delivery_otp || '482190')}
                          className="text-[11px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
                        >
                          Auto-fill OTP
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-400 flex items-center gap-1.5 mt-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Delivery successfully completed! Rewards and EcoImpact ledger updated.</span>
                    </div>
                  )
                )}
              </div>

              {/* Settlement Results Card */}
              {(settledResult || selectedDelivery.status === 'DELIVERED') && (
                <div className="p-5 rounded-xl bg-emerald-950/30 border border-emerald-800/60 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Financial & Environmental Settlement Recorded</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Commuter Payout</span>
                      <span className="text-base font-bold text-emerald-400">
                        ₹{settledResult?.payout ?? Math.round(selectedDelivery.offered_reward * 0.75)}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Platform Fee (25%)</span>
                      <span className="text-base font-bold text-slate-200">
                        ₹{Math.round(selectedDelivery.offered_reward * 0.25)}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Avoided Distance</span>
                      <span className="text-base font-bold text-teal-400">
                        {settledResult?.eco_impact?.distance_saved_km ?? selectedDelivery.direct_distance_km} km
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Displaced CO₂</span>
                      <span className="text-base font-bold text-sky-400">
                        {settledResult?.eco_impact?.co2_saved_kg ?? (selectedDelivery.direct_distance_km * 0.144).toFixed(2)} kg
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-slate-900/30 border border-slate-800 text-center text-slate-500 text-xs">
              Select an active delivery from the left panel to test the physical OTP verification workflow
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
