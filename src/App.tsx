/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, PlatformOverview } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { VendorDashboard } from './components/VendorDashboard';
import { CommuterDashboard } from './components/CommuterDashboard';
import { OtpVerificationStation } from './components/OtpVerificationStation';
import { AdminDashboard } from './components/AdminDashboard';
import { Compass } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const p = window.location.pathname.toLowerCase();
    return p === '/admin' ? '/admin-portal' : (p || '/');
  });
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);

  // Client-side navigation handler
  const navigate = (path: string, replace = false) => {
    let target = path.toLowerCase();
    if (target === '/admin') target = '/admin-portal';
    if (replace) {
      window.history.replaceState({}, '', target);
    } else {
      window.history.pushState({}, '', target);
    }
    setCurrentPath(target);
    window.scrollTo(0, 0);
  };

  // Synchronize browser history (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      let p = window.location.pathname.toLowerCase();
      if (p === '/admin') p = '/admin-portal';
      setCurrentPath(p || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Initialize session from backend on page load / refresh
  useEffect(() => {
    initApp();

    const handleAuthExpired = () => {
      handleLogout();
    };
    window.addEventListener('routepool_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('routepool_auth_expired', handleAuthExpired);
  }, []);

  const initApp = async () => {
    try {
      const [user, stats] = await Promise.all([
        api.getProfile(),
        api.getPlatformOverview()
      ]);
      setCurrentUser(user);
      setOverview(stats);

      let initialPath = window.location.pathname.toLowerCase();
      if (initialPath === '/admin') initialPath = '/admin-portal';

      // Enforce initial route guards
      if (!user) {
        if (initialPath !== '/' && initialPath !== '/auth') {
          navigate('/auth', true);
        } else {
          navigate(initialPath || '/', true);
        }
      } else {
        // Authenticated session restored
        if (initialPath === '/' || initialPath === '/auth') {
          if (user.role === 'vendor') navigate('/vendor', true);
          else if (user.role === 'commuter') navigate('/commuter', true);
          else if (user.role === 'admin') navigate('/admin-portal', true);
        } else if (user.role === 'vendor' && initialPath === '/commuter') {
          navigate('/vendor', true);
        } else if (user.role === 'commuter' && initialPath === '/vendor') {
          navigate('/commuter', true);
        } else if (user.role !== 'admin' && (initialPath === '/admin-portal' || initialPath === '/admin')) {
          navigate(user.role === 'vendor' ? '/vendor' : '/commuter', true);
        } else {
          navigate(initialPath, true);
        }
      }
    } catch (e) {
      console.error('App init error:', e);
      navigate('/', true);
    } finally {
      setLoading(false);
    }
  };

  // Route guards for any subsequent path / user changes
  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      if (currentPath !== '/' && currentPath !== '/auth') {
        navigate('/auth', true);
      }
    } else {
      if (currentPath === '/auth') {
        if (currentUser.role === 'vendor') navigate('/vendor', true);
        else if (currentUser.role === 'commuter') navigate('/commuter', true);
        else if (currentUser.role === 'admin') navigate('/admin-portal', true);
      } else if (currentUser.role === 'vendor' && currentPath === '/commuter') {
        navigate('/vendor', true);
      } else if (currentUser.role === 'commuter' && currentPath === '/vendor') {
        navigate('/commuter', true);
      } else if (currentUser.role !== 'admin' && (currentPath === '/admin-portal' || currentPath === '/admin')) {
        navigate(currentUser.role === 'vendor' ? '/vendor' : '/commuter', true);
      }
    }
  }, [currentPath, currentUser, loading]);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'vendor') navigate('/vendor');
    else if (user.role === 'commuter') navigate('/commuter');
    else if (user.role === 'admin') navigate('/admin-portal');
    else navigate('/');
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    navigate('/', true);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/50 animate-bounce mb-4">
          <Compass className="w-7 h-7 text-slate-950 font-black" />
        </div>
        <div className="text-sm font-semibold tracking-wide text-emerald-400">Loading RoutePool Engine...</div>
        <div className="text-xs text-slate-500 mt-1">Initializing geospatial corridors & algorithms</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Global Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        currentPath={currentPath}
        navigate={navigate}
        onLogout={handleLogout}
      />

      {/* Main View Container */}
      <main className="flex-1 w-full flex flex-col min-w-0">
        {/* Route: /auth */}
        {currentPath === '/auth' && (
          <AuthPage
            onAuthSuccess={handleAuthSuccess}
            navigate={navigate}
          />
        )}

        {/* Route: / (Public Landing Page) */}
        {currentPath === '/' && (
          <LandingPage
            overview={overview}
            navigate={navigate}
          />
        )}

        {/* Route: /vendor (Protected Vendor Dashboard) */}
        {currentPath === '/vendor' && currentUser?.role === 'vendor' && (
          <VendorDashboard />
        )}

        {/* Route: /commuter (Protected Commuter Dashboard) */}
        {currentPath === '/commuter' && currentUser?.role === 'commuter' && (
          <CommuterDashboard />
        )}

        {/* Route: /admin-portal or /admin (Protected Admin Dashboard) */}
        {(currentPath === '/admin-portal' || currentPath === '/admin') && currentUser?.role === 'admin' && (
          <AdminDashboard />
        )}

        {/* Route: /otp-station (Protected Verification Station) */}
        {currentPath === '/otp-station' && currentUser && (
          <OtpVerificationStation userRole={currentUser.role} />
        )}
      </main>
    </div>
  );
}
