import { useNavigate } from 'react-router-dom';
import {
  Shield,
  User,
  Users,
  LogOut,
  KeyRound,
  LayoutDashboard,
  Home,
  ChevronRight,
  Briefcase,
  Scale,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { homeForRole } from './ProtectedRoute';

const ROLE_META = {
  ADMIN: { label: 'Administrator', Icon: Shield },
  OWNER: { label: 'Owner', Icon: User },
  BENEFICIARY: { label: 'Beneficiary', Icon: Users },
  LAWYER: { label: 'Lawyer', Icon: Briefcase },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const meta = ROLE_META[user.role] || ROLE_META.BENEFICIARY;
  const RoleIcon = meta.Icon;

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const goToDashboard = () => navigate(homeForRole(user.role));
  const goToHome = () => navigate('/');
  const goToPassword = () => navigate('/change-password');
  const goToLegacyClaims = () => navigate('/admin/legacy-claims');

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={goToHome}
          className="group flex items-center gap-3 rounded-xl px-1 py-1 text-left transition duration-200 hover:-translate-y-0.5"
          title="Go to home"
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md transition duration-200 group-hover:scale-105 group-hover:shadow-lg">
            <Shield size={19} />
            <span className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-sm font-bold text-ink-900 transition group-hover:text-brand-700">Digital Legacy</span>
            <span className="text-xs font-medium text-ink-400">Secure Legacy Management</span>
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          {user.role === 'ADMIN' && (
            <button
              type="button"
              onClick={goToLegacyClaims}
              className="group hidden items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 lg:inline-flex"
            >
              <Scale size={16} /> Legacy Claims
            </button>
          )}

          <button
            type="button"
            onClick={goToDashboard}
            className="group hidden items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lg md:inline-flex"
          >
            <LayoutDashboard size={16} className="transition group-hover:scale-110" />
            Dashboard
            <ChevronRight size={15} className="transition duration-200 group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={goToDashboard}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm transition hover:scale-105 hover:bg-brand-700 md:hidden"
            title="Dashboard"
          >
            <LayoutDashboard size={17} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="group hidden items-center gap-3 rounded-xl border border-ink-100 bg-white px-3 py-2 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50/60 hover:shadow-md sm:flex"
            title="Open profile"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition duration-200 group-hover:bg-brand-100 group-hover:scale-105">
              <RoleIcon size={15} />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-xs font-semibold text-ink-800 transition group-hover:text-brand-800">{meta.label}</p>
              <p className="max-w-[130px] truncate text-xs text-ink-400 transition group-hover:text-brand-600">@{user.username}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={goToPassword}
            className="group inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-ink-600 transition duration-200 hover:-translate-y-0.5 hover:border-ink-100 hover:bg-white hover:text-ink-900 hover:shadow-sm"
            title="Change password"
          >
            <KeyRound size={16} className="transition group-hover:scale-110" />
            <span className="hidden lg:inline">Password</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="group inline-flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2.5 text-sm font-medium text-ink-600 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600 hover:shadow-sm"
          >
            <LogOut size={16} className="transition group-hover:translate-x-0.5" />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </div>
      </div>

      <div className="border-t border-ink-100 bg-white/70 md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6">
          <button type="button" onClick={goToHome} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 hover:text-brand-700">
            <Home size={14} /> Home
          </button>
          <button type="button" onClick={goToDashboard} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 hover:text-brand-700">
            <LayoutDashboard size={14} /> Dashboard
          </button>
          {user.role === 'ADMIN' && (
            <button type="button" onClick={goToLegacyClaims} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 hover:text-brand-700">
              <Scale size={14} /> Legacy Claims
            </button>
          )}
          <button type="button" onClick={goToPassword} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 hover:text-brand-700">
            <KeyRound size={14} /> Password
          </button>
        </div>
      </div>
    </header>
  );
}
