import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  Bell,
  Briefcase,
  ChevronRight,
  FileSearch2,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Shield,
  User,
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
  const [unread, setUnread] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [recent, setRecent] = useState([]);

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

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="group flex items-center gap-3 rounded-xl px-1 py-1 text-left"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-ink-100">
            <img
              src="/nextgen-vault-logo.png"
              alt="NextGen Vault"
              className="h-11 w-11 object-contain"
            />
          </div>

          <div className="hidden flex-col leading-tight sm:flex">
            <span className="text-[15px] font-bold tracking-[-0.02em] text-ink-900">
              NextGen Vault
            </span>
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">
              Digital Asset Custody
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          {user.role === 'USER' && (
            <>
              <button
                type="button"
                onClick={() => navigate('/legacy-access')}
                className="hidden items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 lg:inline-flex"
              >
                <Archive size={16} />
                Legacy Access
              </button>
              <button
                type="button"
                onClick={() => navigate('/legal-assistance')}
                className="hidden items-center gap-2 rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 xl:inline-flex"
              >
                <Briefcase size={16} />
                Legal Assistance
              </button>
            </>
          )}

          {user.role === 'LAWYER' && (
            <button
              type="button"
              onClick={() => navigate('/lawyer/consultations')}
              className="hidden items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 lg:inline-flex"
            >
              <Briefcase size={16} />
              Consultations
            </button>
          )}

          {user.role === 'ADMIN' && (
            <>
              <button
                type="button"
                onClick={() => navigate('/admin/records')}
                className="hidden items-center gap-2 rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 xl:inline-flex"
              >
                <Archive size={16} />
                Records
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/audit-logs')}
                className="hidden items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 lg:inline-flex"
              >
                <FileSearch2 size={16} />
                Audit Logs
              </button>
            </>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={toggleNotifications}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-ink-100 bg-white text-ink-600 shadow-sm transition hover:bg-brand-50 hover:text-brand-700"
              title="Notifications"
            >
              <Bell size={17} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white">
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
                    className="text-xs font-semibold text-indigo-600"
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
                        className={"block w-full px-4 py-3 text-left hover:bg-slate-50 " + (!item.isRead ? "bg-indigo-50/50" : "")}
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

          <button
            type="button"
            onClick={() => navigate(homeForRole(user.role))}
            className="group hidden items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 md:inline-flex"
          >
            <LayoutDashboard size={16} />
            Dashboard
            <ChevronRight size={15} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="group hidden items-center gap-3 rounded-xl border border-ink-100 bg-white px-3 py-2 text-left shadow-sm sm:flex"
            title="Open profile"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <RoleIcon size={15} />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-xs font-semibold text-ink-800">{meta.label}</p>
              <p className="max-w-[130px] truncate text-xs text-ink-400">@{user.username}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/change-password')}
            className="hidden items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50 lg:inline-flex"
          >
            <KeyRound size={16} />
            Password
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={16} />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </div>
      </div>

      <div className="border-t border-ink-100 bg-white/70 md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6">
          <button type="button" onClick={() => navigate('/')} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink-600">
            <Home size={14} /> Home
          </button>
          <button type="button" onClick={() => navigate(homeForRole(user.role))} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink-600">
            <LayoutDashboard size={14} /> Dashboard
          </button>
          {user.role === 'USER' && (
            <>
              <button type="button" onClick={() => navigate('/legacy-access')} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink-600">
                <Archive size={14} /> Legacy Access
              </button>
              <button type="button" onClick={() => navigate('/legal-assistance')} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink-600">
                <Briefcase size={14} /> Legal Assistance
              </button>
            </>
          )}
          {user.role === 'LAWYER' && (
            <button type="button" onClick={() => navigate('/lawyer/consultations')} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink-600">
              <Briefcase size={14} /> Consultations
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
