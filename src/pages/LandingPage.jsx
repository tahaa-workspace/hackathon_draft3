import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { homeForRole } from "../components/ProtectedRoute";

import LandingNavbar from "../components/landing/LandingNavbar";
import HeroSection from "../components/landing/HeroSection";
import ProblemSection from "../components/landing/ProblemSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import HowItWorksSection from "../components/landing/HowItWorksSection";
import SecuritySection from "../components/landing/SecuritySection";
import CtaSection from "../components/landing/CtaSection";
import ScrollToTopButton from "../components/landing/ScrollToTopButton";

import "../styles/landing.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const goToDashboard = () => {
    if (user) {
      navigate(homeForRole(user.role));
    }
  };

  const handlePrimaryAction = () => {
    if (isAuthenticated && user) {
      goToDashboard();
      return;
    }

    navigate("/register");
  };

  return (
    <div className="landing-shell">
      <LandingNavbar
        user={user}
        isAuthenticated={isAuthenticated}
        onHome={() => navigate("/")}
        onSignIn={() => navigate("/login")}
        onRegister={() => navigate("/register")}
        onDashboard={goToDashboard}
      />

      <main>
        <HeroSection
          isAuthenticated={isAuthenticated}
          onPrimary={handlePrimaryAction}
          onSignIn={() => navigate("/login")}
        />

        <ProblemSection />
        <FeaturesSection />
        <HowItWorksSection />
        <SecuritySection />

        <CtaSection
          isAuthenticated={isAuthenticated}
          onPrimary={handlePrimaryAction}
        />
      </main>

      <footer className="border-t border-ink-100 bg-white/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-ink-100">
              <img
                src="/nextgen-vault-logo.png"
                alt="NextGen Vault"
                className="h-9 w-9 object-contain"
              />
            </div>

            <div>
              <p className="text-sm font-bold text-ink-900">
                NextGen Vault
              </p>

              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
                Digital Asset Custody
              </p>
            </div>
          </button>

          <div className="flex items-center gap-5 text-xs text-ink-400">
            <button
              type="button"
              onClick={() => navigate("/about")}
              className="font-semibold transition hover:text-brand-700"
            >
              About Us
            </button>

            <span>
              Secure Legacy Management Platform
            </span>
          </div>
        </div>
      </footer>

      <ScrollToTopButton />
    </div>
  );
}