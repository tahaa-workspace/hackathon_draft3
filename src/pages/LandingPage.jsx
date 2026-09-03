import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";

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
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/20">
              <Shield size={17} />
            </div>

            <div>
              <p className="text-sm font-bold text-ink-900">Digital Legacy</p>
              <p className="text-xs text-ink-400">Next Gen Vault</p>
            </div>
          </div>

          <p className="text-xs text-ink-400">
            Secure Legacy Management Platform
          </p>
        </div>
      </footer>

      <ScrollToTopButton />
    </div>
  );
}
