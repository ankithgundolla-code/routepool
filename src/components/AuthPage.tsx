import React, { useState } from 'react';
import {
  Compass,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Store,
  Bike,
  ShieldAlert,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthPageProps {
  onAuthSuccess: (user: User) => void;
  navigate: (path: string) => void;
  initialRole?: UserRole;
  initialMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onAuthSuccess,
  navigate,
  initialRole = 'vendor',
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [role, setRole] = useState<'vendor' | 'commuter'>(initialRole === 'admin' ? 'vendor' : initialRole);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (mode === 'login') {
      const cleanEmail = email.trim();
      const cleanPassword = password;
      if (!cleanEmail) {
        setErrorMessage('Email address is required to sign in.');
        return;
      }
      if (!cleanPassword) {
        setErrorMessage('Password is required.');
        return;
      }
      setLoading(true);
      try {
        const res = await api.login({ email: cleanEmail, password: cleanPassword });
        onAuthSuccess(res.user);
      } catch (err: any) {
        setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
      } finally {
        setLoading(false);
      }
    } else {
      const cleanName = name.trim();
      const cleanEmail = email.trim();
      const cleanPassword = password;
      if (!cleanName || cleanName.length < 2) {
        setErrorMessage('Full name is required (minimum 2 characters).');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        setErrorMessage('Enter a valid email address (e.g. user@example.com).');
        return;
      }
      if (!cleanPassword || cleanPassword.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (cleanPassword !== passwordConfirm) {
        setErrorMessage('Passwords do not match. Please verify both password fields.');
        return;
      }
      setLoading(true);
      try {
        const res = await api.register({
          name: cleanName,
          email: cleanEmail,
          phone: phone.trim() || undefined,
          password: cleanPassword,
          password_confirm: passwordConfirm,
          role,
          business_name: role === 'vendor' ? businessName.trim() : undefined,
          business_address: role === 'vendor' ? businessAddress.trim() : undefined,
        });
        onAuthSuccess(res.user);
      } catch (err: any) {
        setErrorMessage(err.message || 'Registration failed. Please verify your details.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDemoLogin = async (demoRole: 'vendor' | 'commuter' | 'admin') => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await api.demoLogin(demoRole);
      onAuthSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (roleType: 'vendor' | 'commuter' | 'admin') => {
    setEmail(`demo_${roleType}@routepool.local`);
    setPassword('demopassword123');
    setMode('login');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative selection:bg-emerald-500 selection:text-slate-950">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(16,185,129,0.12),rgba(255,255,255,0))] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/50 group-hover:scale-105 transition-transform">
              <Compass className="w-6 h-6 text-slate-950 font-black" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-bold text-2xl tracking-tight text-white">
                  Route<span className="text-emerald-400">Pool</span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-400/90 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                  Auth Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 -mt-0.5">Hyperlocal Package Pooling Platform</p>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="mb-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Public Overview</span>
          </button>
        </div>

        {/* Main Auth Card */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"></div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'login' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'register' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                {/* Role selection toggle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Registering As:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('vendor')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        role === 'vendor'
                          ? 'bg-emerald-950/70 border-emerald-500/70 text-emerald-300 shadow-sm shadow-emerald-950/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Store className="w-4 h-4" />
                      <span>Vendor / Merchant</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('commuter')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        role === 'commuter'
                          ? 'bg-cyan-950/70 border-cyan-500/70 text-cyan-300 shadow-sm shadow-cyan-950/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Bike className="w-4 h-4" />
                      <span>Daily Commuter</span>
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={role === 'vendor' ? 'Sri Krishna Electronics' : 'Rajesh Sharma'}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number (Optional)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Vendor-specific fields */}
                {role === 'vendor' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Business / Store Name</label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Khairatabad Component Depot"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Store / Hub Location</label>
                      <input
                        type="text"
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        placeholder="e.g. Khairatabad Circle, Hyderabad"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Confirm Password (Registration Only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
            >
              {loading ? (
                <span>Connecting to Django...</span>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to RoutePool' : 'Create Account & Enter Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* College Evaluation: One-Click Demo Access Section */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Evaluation Demo Access
              </span>
              <span className="text-[10px] text-slate-400 font-normal ml-auto">One-Click</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              For grading and evaluation, instantly access pre-seeded Hyderabad transit corridor accounts without passwords:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              <button
                type="button"
                onClick={() => handleDemoLogin('vendor')}
                disabled={loading}
                className="py-2 px-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Demo Vendor</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('commuter')}
                disabled={loading}
                className="py-2 px-2.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Demo Commuter</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                disabled={loading}
                className="py-2 px-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/50 text-purple-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Demo Admin</span>
              </button>
            </div>

            {/* Fast Credential Fill */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
              <span>Or autofill credentials:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('vendor')}
                  className="hover:text-emerald-400 hover:underline cursor-pointer"
                >
                  Vendor
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('commuter')}
                  className="hover:text-cyan-400 hover:underline cursor-pointer"
                >
                  Commuter
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('admin')}
                  className="hover:text-purple-400 hover:underline cursor-pointer"
                >
                  Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
