import { motion, useScroll } from "framer-motion";
import {
  ArrowRight,
  LayoutDashboard,
  LogIn,
  UserPlus,
} from "lucide-react";

const ROLE_LABELS = {
  ADMIN: "Administrator",
  OWNER: "Owner",
  BENEFICIARY: "Beneficiary",
  LAWYER: "Lawyer",
};

const NAV_ITEMS = [
  { label: "Problem", href: "/#problem" },
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Security", href: "/#security" },
  { label: "About Us", href: "/about" },
];

export default function LandingNavbar({
  user,
  isAuthenticated,
  onHome,
  onSignIn,
  onRegister,
  onDashboard,
}) {
  const { scrollYProgress } = useScroll();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/70 bg-white/80 shadow-[0_10px_35px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
      <motion.div
        className="absolute inset-x-0 top-0 h-[2px] origin-left bg-gradient-to-r from-brand-500 via-accent-violet to-accent-cyan"
        style={{ scaleX: scrollYProgress }}
      />

      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onHome}
          className="group flex items-center gap-3 text-left"
          aria-label="Go to landing page"
        >
          <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg shadow-brand-600/10 ring-1 ring-ink-100 transition duration-300 group-hover:-translate-y-0.5 group-hover:scale-105">
            <img
              src="/nextgen-vault-logo.png"
              alt="NextGen Vault"
              className="h-10 w-10 object-contain"
            />
            <span className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 transition duration-500 group-hover:opacity-100" />
          </span>

          <span className="leading-tight">
            <span className="block text-[15px] font-bold tracking-[-0.02em] text-ink-900">
              NextGen Vault
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400 sm:block">
              Digital Asset Custody
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 transition duration-200 hover:bg-brand-50 hover:text-brand-700"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated && user ? (
            <>
              <div className="hidden items-center gap-2 rounded-full border border-ink-100 bg-white/80 px-3 py-1.5 shadow-sm sm:flex">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-accent-cyan/20 text-xs font-bold text-brand-700">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </div>

                <div className="pr-1 leading-tight">
                  <p className="max-w-[120px] truncate text-xs font-semibold text-ink-700">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-ink-400">
                    {ROLE_LABELS[user.role] || user.role}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onDashboard}
                className="landing-primary-button"
              >
                <LayoutDashboard size={16} />
                <span className="hidden sm:inline">Dashboard</span>
                <ArrowRight size={15} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onSignIn}
                className="hidden items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-600 transition hover:bg-ink-50 hover:text-ink-900 sm:inline-flex"
              >
                <LogIn size={15} />
                Sign In
              </button>

              <button
                type="button"
                onClick={onRegister}
                className="landing-primary-button"
              >
                <UserPlus size={15} />
                <span className="hidden sm:inline">Create Account</span>
                <ArrowRight size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
