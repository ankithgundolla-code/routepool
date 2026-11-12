import React, { useState, useEffect } from 'react';
import {
  Compass,
  Store,
  Bike,
  ShieldAlert,
  Bell,
  CheckCircle2,
  KeyRound,
  LogOut,
  Menu,
  X,
  LogIn,
  ArrowRight
} from 'lucide-react';
import { User, AppNotification } from '../types';
import { api } from '../services/api';

interface NavbarProps {
  currentUser: User | null;
  currentPath: string;
  navigate: (path: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentPath,
  navigate,
  onLogout,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const scrollToSection = (id: string) => {
    if (currentPath !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-slate-800 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => {
            if (!currentUser) navigate('/');
            else if (currentUser.role === 'vendor') navigate('/vendor');
            else if (currentUser.role === 'commuter') navigate('/commuter');
            else if (currentUser.role === 'admin') navigate('/admin-portal');
          }}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <Compass className="w-5 h-5 text-slate-950 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">
                Route<span className="text-emerald-400">Pool</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">
              Hyperlocal Package Pooling & Courier Avoidance
            </p>
          </div>
        </div>

        {/* Primary Navigation Tabs (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 text-xs">
          {/* Guest / Public Links */}
          {!currentUser && (
            <>
              <button
                onClick={() => handleNavClick('/')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  currentPath === '/'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="px-3 py-1.5 rounded-lg font-medium text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('simulator')}
                className="px-3 py-1.5 rounded-lg font-medium text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                Simulator
              </button>
            </>
          )}

          {/* Vendor Specific Links */}
          {currentUser?.role === 'vendor' && (
            <>
              <button
                onClick={() => handleNavClick('/vendor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  currentPath === '/vendor'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Vendor Hub</span>
              </button>
              <button
                onClick={() => handleNavClick('/otp-station')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  currentPath === '/otp-station'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>OTP Station</span>
              </button>
            </>
          )}

          {/* Commuter Specific Links */}
          {currentUser?.role === 'commuter' && (
            <>
              <button
                onClick={() => handleNavClick('/commuter')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  currentPath === '/commuter'
                    ? 'bg-slate-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Commuter Hub</span>
              </button>
              <button
                onClick={() => handleNavClick('/otp-station')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  currentPath === '/otp-station'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>OTP Station</span>
              </button>
            </>
          )}

          {/* Admin Specific Links */}
          {currentUser?.role === 'admin' && (
            <>
              <button
                onClick={() => handleNavClick('/admin-portal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  currentPath === '/admin-portal' || currentPath === '/admin'
                    ? 'bg-slate-800 text-purple-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Admin Operations</span>
              </button>
              <button
                onClick={() => handleNavClick('/otp-station')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  currentPath === '/otp-station'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>OTP Station</span>
              </button>
            </>
          )}
        </nav>

        {/* Right Action Island */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Unauthenticated: Sign In / Get Started button */}
          {!currentUser ? (
            <button
              onClick={() => handleNavClick('/auth')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          ) : (
            <>
              {/* Active Role Indicator */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-600/40 text-xs text-emerald-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-slate-400 hidden sm:inline">Role:</span>
                <strong className="text-white capitalize">{currentUser.role}</strong>
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-slate-950 rounded-full text-[10px] font-black flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 text-xs">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800">
                      <span className="font-semibold text-white">Notifications ({unreadCount} new)</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 mt-1">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">No notifications yet</div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-2.5 hover:bg-slate-800/50 rounded-lg transition-colors ${
                              !notif.is_read ? 'bg-slate-800/20' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                              <div>
                                <div className="font-medium text-slate-200">{notif.title}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">{notif.message}</div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User profile / logout */}
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800 text-xs">
                <div className="flex flex-col text-right">
                  <span className="font-medium text-slate-200 truncate max-w-[120px]">
                    {currentUser.name || currentUser.email}
                  </span>
                  <span className="text-[10px] text-emerald-400">
                    Reliability: <strong>{currentUser.reliability_score}%</strong>
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 space-y-1 text-sm">
          {!currentUser ? (
            <>
              <button
                onClick={() => handleNavClick('/')}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                  currentPath === '/' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="w-full text-left px-3 py-2 rounded-lg font-medium text-slate-300 hover:bg-slate-800/60 transition-colors"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('simulator')}
                className="w-full text-left px-3 py-2 rounded-lg font-medium text-slate-300 hover:bg-slate-800/60 transition-colors"
              >
                Simulator
              </button>
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleNavClick('/auth')}
                  className="w-full py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-center block"
                >
                  Sign In / Register
                </button>
              </div>
            </>
          ) : (
            <>
              {currentUser.role === 'vendor' && (
                <button
                  onClick={() => handleNavClick('/vendor')}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                    currentPath === '/vendor'
                      ? 'bg-slate-800 text-emerald-400'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span>Vendor Hub</span>
                </button>
              )}

              {currentUser.role === 'commuter' && (
                <button
                  onClick={() => handleNavClick('/commuter')}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                    currentPath === '/commuter'
                      ? 'bg-slate-800 text-cyan-400'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <Bike className="w-4 h-4 text-cyan-400" />
                  <span>Commuter Hub</span>
                </button>
              )}

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => handleNavClick('/admin-portal')}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                    currentPath === '/admin-portal' || currentPath === '/admin'
                      ? 'bg-slate-800 text-purple-400'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-purple-400" />
                  <span>Admin Operations</span>
                </button>
              )}

              <button
                onClick={() => handleNavClick('/otp-station')}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                  currentPath === '/otp-station'
                    ? 'bg-slate-800 text-amber-400'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>OTP Station</span>
              </button>

              <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {currentUser.name} ({currentUser.role})
                </span>
                <button onClick={onLogout} className="text-red-400 hover:underline cursor-pointer">
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
};
