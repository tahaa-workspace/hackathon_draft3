import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Archive,
  Bell,
  Briefcase,
  ChevronRight,
  FileSearch2,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  User,
  X,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { homeForRole } from './ProtectedRoute';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
} from '../services/legacyService';

const ROLE_META = {
  ADMIN: { label: 'Administrator', Icon: Shield },
  USER: { label: 'User', Icon: User },
  LAWYER: { label: 'Lawyer', Icon: Briefcase },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [unread, setUnread] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recent, setRecent] = useState([]);

  const notifRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;

    const refreshUnread = () => {
      getUnreadNotificationCount()
        .then((data) => setUnread(data.count || 0))
        .catch(() => {});
    };

    refreshUnread();

    const timer = window.setInterval(refreshUnread, 30000);
    window.addEventListener('nextgen:notifications-changed', refreshUnread);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('nextgen:notifications-changed', refreshUnread);
    };
  }, [user]);

  // Close notifications on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const meta = ROLE_META[user.role] || ROLE_META.USER;
  const RoleIcon = meta.Icon;

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const toggleNotifications = async () => {
    const next = !notificationOpen;
    setNotificationOpen(next);
    if (next) {
      try {
        setRecent((await getNotifications()).slice(0, 5));
      } catch {
        setRecent([]);
      }
    }
  };

  const openNotification = async (item) => {
    if (!item.isRead) {
      try {
        await markNotificationRead(item.id);
        setUnread((count) => Math.max(0, count - 1));
        setRecent((items) =>
          items.map((entry) =>
            entry.id === item.id ? { ...entry, isRead: true } : entry
          )
        );
      } catch {}
    }

    setNotificationOpen(false);

    const legacyTypes = new Set([
      'LEGACY_ALLOCATION',
      'LEGACY_CLAIM',
      'ADMIN_REVIEW',
      'LAWYER_REVIEW',
      'LEGACY_APPROVED',
      'LEGACY_REJECTED',
      'LEGACY_UNLOCKED',
      'LEGACY_RELEASE',
    ]);

    if (legacyTypes.has(item.type)) {
      if (user.role === 'ADMIN') {
        navigate('/admin/legacy-claims');
      } else if (user.role === 'LAWYER') {
        navigate('/lawyer');
      } else {
        navigate('/legacy-access');
      }
      return;
    }

    if (item.type === 'LEGAL_REQUEST') {
      navigate(
        user.role === 'LAWYER'
          ? '/lawyer/consultations'
          : '/legal-assistance'
      );
      return;
    }

    navigate('/notifications');
  };

  // Define navigation items per role
  const getNavLinks = () => {
    if (user.role === 'ADMIN') {
      return [
        { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
        { label: 'Legacy Claims', path: '/admin/legacy-claims', icon: FileText },
        { label: 'Legal Requests', path: '/admin/legal-requests', icon: Briefcase },
        { label: 'Audit Logs', path: '/admin/audit-logs', icon: FileSearch2 },
      ];
    }
    if (user.role === 'LAWYER') {
      return [
        { label: 'Dashboard', path: '/lawyer', icon: LayoutDashboard, exact: true },
        { label: 'Consultations', path: '/lawyer/consultations', icon: Briefcase },
      ];
    }
    // Default USER
    return [
      { label: 'Dashboard', path: '/user', icon: LayoutDashboard, exact: true },
      { label: 'Legacy Access', path: '/legacy-access', icon: Archive },
      { label: 'Legal Assistance', path: '/legal-assistance', icon: Briefcase },
    ];
  };

  const navLinks = getNavLinks();

  const isLinkActive = (link) => {
    if (link.exact) {
      return location.pathname === link.path || location.pathname === `${link.path}/`;
    }
    return location.pathname.startsWith(link.path);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 shadow-[0_4px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => navigate(homeForRole(user.role))}
            className="group flex items-center gap-3 rounded-xl p-1 text-left transition hover:opacity-90"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-ink-200/80">
              <img
                src="/nextgen-vault-logo.png"
                alt="NextGen Vault"
                className="h-8 w-8 object-contain"
              />
            </div>

            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-[15px] font-bold tracking-tight text-ink-900">
                NextGen Vault
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">
                Digital Asset Custody
              </span>
            </div>
          </button>

          {/* Primary Navigation Links (Desktop) */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const active = isLinkActive(link);
              const Icon = link.icon;
              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => navigate(link.path)}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-all ${
                    active
                      ? 'border border-brand-200/90 bg-brand-50 font-semibold text-brand-700 shadow-xs'
                      : 'border border-transparent text-ink-600 hover:border-ink-200/60 hover:bg-ink-50 hover:text-ink-900'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-brand-600' : 'text-ink-500'} />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Utility Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={toggleNotifications}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl border text-ink-600 shadow-xs transition hover:bg-brand-50 hover:text-brand-700 ${
                notificationOpen
                  ? 'border-brand-200 bg-brand-50 text-brand-700 ring-2 ring-brand-100'
                  : 'border-ink-200/80 bg-white hover:border-ink-300'
              }`}
              title="Notifications"
            >
              <Bell size={17} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white shadow-xs">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 top-12 z-50 w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <p className="font-semibold text-slate-900">Notifications</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationOpen(false);
                      navigate('/notifications');
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    View all
                  </button>
                </div>

                {recent.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-400">
                    No notifications yet.
                  </p>
                ) : (
                  <div className="max-h-96 divide-y divide-slate-100 overflow-auto">
                    {recent.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => openNotification(item)}
                        className={`block w-full px-4 py-3 text-left transition hover:bg-slate-50 ${
                          !item.isRead ? 'bg-indigo-50/50' : ''
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.message}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="inline-flex h-10 items-center gap-2.5 rounded-xl border border-ink-200/80 bg-white px-3 text-left shadow-xs transition hover:border-ink-300 hover:bg-ink-50"
            title="Open profile"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <RoleIcon size={13} />
            </div>
            <div className="min-w-0 leading-none">
              <span className="block truncate text-xs font-semibold text-ink-800">
                @{user.username}
              </span>
            </div>
            <span className="hidden rounded bg-ink-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-600 lg:inline-block">
              {meta.label}
            </span>
          </button>

          {/* Change Password Button */}
          <button
            type="button"
            onClick={() => navigate('/change-password')}
            className="hidden h-10 items-center gap-2 rounded-xl border border-ink-200/80 bg-white px-3 text-sm font-medium text-ink-600 shadow-xs transition hover:border-ink-300 hover:bg-ink-50 hover:text-ink-900 xl:inline-flex"
            title="Change Password"
          >
            <KeyRound size={15} />
            <span>Password</span>
          </button>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200/70 bg-rose-50/60 px-3 text-sm font-medium text-rose-600 shadow-xs transition hover:border-rose-300 hover:bg-rose-100/70 hover:text-rose-700"
            title="Sign out"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Sign out</span>
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200/80 bg-white text-ink-700 shadow-xs transition hover:bg-ink-50 md:hidden"
            title="Toggle menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-ink-100 bg-white px-4 py-3 shadow-lg md:hidden">
          <div className="flex flex-col gap-1.5">
            {navLinks.map((link) => {
              const active = isLinkActive(link);
              const Icon = link.icon;
              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => {
                    navigate(link.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex h-10 w-full items-center justify-between rounded-xl px-3.5 text-sm font-medium transition ${
                    active
                      ? 'border border-brand-200 bg-brand-50 font-semibold text-brand-700'
                      : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={active ? 'text-brand-600' : 'text-ink-400'} />
                    <span>{link.label}</span>
                  </div>
                  <ChevronRight size={14} className="text-ink-300" />
                </button>
              );
            })}

            <div className="my-1 border-t border-ink-100" />

            <button
              type="button"
              onClick={() => {
                navigate('/change-password');
                setMobileMenuOpen(false);
              }}
              className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3.5 text-sm font-medium text-ink-600 hover:bg-ink-50"
            >
              <KeyRound size={16} className="text-ink-400" />
              <span>Change Password</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
