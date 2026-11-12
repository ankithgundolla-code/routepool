import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Store,
  Bike,
  Route,
  Package as PackageIcon,
  CheckCircle2,
  DollarSign,
  Leaf,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { AdminAnalytics, Delivery, Transaction, Package } from '../types';
import { api } from '../services/api';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminAnalytics | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'deliveries' | 'transactions' | 'packages'>('deliveries');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [adminStats, dels, txs, pkgs] = await Promise.all([
        api.getAdminAnalytics(),
        api.getDeliveries(),
        api.getTransactions(),
        api.getPackages(),
      ]);
      setStats(adminStats);
      setDeliveries(dels);
      setTransactions(txs);
      setPackages(pkgs);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-purple-400 mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Platform Administration & Operations</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">RoutePool System Monitor</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time audit log of corridor deliveries, financial clearinghouse, and environmental ledger.
          </p>
        </div>
        <button
          onClick={loadAdminData}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Operations</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Total Registered Users</div>
          <div className="text-2xl font-bold text-white mt-1">{stats?.total_users ?? 6}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats?.vendors_count ?? 2} vendors · {stats?.commuters_count ?? 3} commuters
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Gross Transaction Vol.</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">₹{stats?.gross_transaction_volume ?? 150}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Platform Fees: ₹{stats?.platform_fee_revenue ?? 37.5}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Avoided Distance</div>
          <div className="text-2xl font-bold text-teal-400 mt-1">{stats?.total_distance_saved_km ?? 164.2} km</div>
          <div className="text-[11px] text-slate-500 mt-1">Displaced courier transport</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Total CO₂ Reduced</div>
          <div className="text-2xl font-bold text-sky-400 mt-1">{stats?.total_co2_saved_kg ?? 23.6} kg</div>
          <div className="text-[11px] text-slate-500 mt-1">@ 0.144 kg/km factor</div>
        </div>
      </div>

      {/* Sub Tabs: Deliveries, Transactions, Packages */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('deliveries')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'deliveries' ? 'bg-slate-800 text-purple-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Deliveries ({deliveries.length})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'transactions' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Financial Ledger ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'packages' ? 'bg-slate-800 text-sky-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Packages Pool ({packages.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Tab 1: Deliveries Table */}
        {activeTab === 'deliveries' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Delivery ID</th>
                  <th className="py-2.5 px-3">Package</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Commuter</th>
                  <th className="py-2.5 px-3">Pickup OTP</th>
                  <th className="py-2.5 px-3">Delivery OTP</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {deliveries
                  .filter(d => d.package_name.toLowerCase().includes(searchQuery.toLowerCase()) || d.commuter_name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(d => (
                    <tr key={d.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-mono font-medium text-slate-400">#{d.id}</td>
                      <td className="py-3 px-3 font-medium text-white">{d.package_name}</td>
                      <td className="py-3 px-3 text-slate-300">{d.vendor_business}</td>
                      <td className="py-3 px-3 text-slate-300">{d.commuter_name}</td>
                      <td className="py-3 px-3 font-mono text-amber-400">{d.pickup_otp}</td>
                      <td className="py-3 px-3 font-mono text-teal-400">{d.delivery_otp}</td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-white">₹{d.offered_reward}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Transactions Table */}
        {activeTab === 'transactions' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Tx ID</th>
                  <th className="py-2.5 px-3">Package Handover</th>
                  <th className="py-2.5 px-3">Vendor Total</th>
                  <th className="py-2.5 px-3">Commuter Payout (75%)</th>
                  <th className="py-2.5 px-3">Platform Fee (25%)</th>
                  <th className="py-2.5 px-3">Date / Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions
                  .filter(tx => tx.package_name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-mono font-medium text-slate-400">TX-{tx.id}</td>
                      <td className="py-3 px-3 font-medium text-white">{tx.package_name}</td>
                      <td className="py-3 px-3 font-bold text-slate-200">₹{tx.vendor_amount}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">₹{tx.commuter_reward}</td>
                      <td className="py-3 px-3 font-bold text-purple-400">₹{tx.platform_fee}</td>
                      <td className="py-3 px-3 text-[11px] text-slate-500">
                        {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Packages Pool Table */}
        {activeTab === 'packages' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Pkg ID</th>
                  <th className="py-2.5 px-3">Package Title</th>
                  <th className="py-2.5 px-3">Weight & Size</th>
                  <th className="py-2.5 px-3">Pickup</th>
                  <th className="py-2.5 px-3">Destination</th>
                  <th className="py-2.5 px-3">Offered Reward</th>
                  <th className="py-2.5 px-3">Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {packages
                  .filter(p => p.package_name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-mono font-medium text-slate-400">PKG-{p.id}</td>
                      <td className="py-3 px-3 font-medium text-white">{p.package_name}</td>
                      <td className="py-3 px-3 text-slate-300">{p.weight}kg · {p.size}</td>
                      <td className="py-3 px-3 text-slate-300 truncate max-w-[150px]">{p.pickup_location}</td>
                      <td className="py-3 px-3 text-slate-300 truncate max-w-[150px]">{p.destination}</td>
                      <td className="py-3 px-3 font-bold text-white">₹{p.offered_reward}</td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
