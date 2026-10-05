import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  Files,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Network,
  ShieldCheck,
  Sparkles,
  Target,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { homeForRole } from "../components/ProtectedRoute";
import LandingNavbar from "../components/landing/LandingNavbar";
import ScrollToTopButton from "../components/landing/ScrollToTopButton";

import "../styles/landing.css";
import "../styles/about.css";



const OFFERINGS = [
  {
    icon: LockKeyhole,
    title: "Secure Digital Vault",
    text: "Organize important digital documents and records in one protected environment with controlled access.",
  },
  {
    icon: UserRoundCheck,
    title: "Verified Beneficiaries",
    text: "Create trusted beneficiary accounts with identity documentation and decide who can receive access to selected records.",
  },
  {
    icon: KeyRound,
    title: "Document-Level Permissions",
    text: "Access is assigned record by record, ensuring that a beneficiary only receives the information intended for them.",
  },
  {
    icon: ShieldCheck,
    title: "Identity & Role Security",
    text: "Owner verification, beneficiary identity records, authentication and role-based authorization help protect sensitive workflows.",
  },
  {
    icon: Files,
    title: "Structured Legacy Records",
    text: "Keep assets, liabilities and general documents organized so important information remains understandable and accessible.",
  },
  {
    icon: Network,
    title: "Controlled Legacy Claims",
    text: "Beneficiaries, administrators and legal advisors follow a structured claim, review and additional-information workflow before information is released.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};

export default function AboutUs() {
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
    <div className="landing-shell about-page">
      <LandingNavbar
        user={user}
        isAuthenticated={isAuthenticated}
        onHome={() => navigate("/")}
        onSignIn={() => navigate("/login")}
        onRegister={() => navigate("/register")}
        onDashboard={goToDashboard}
      />

      <main>
        <section className="about-hero">
          <div className="about-hero-grid" />
          <div className="about-hero-glow about-hero-glow-left" />
          <div className="about-hero-glow about-hero-glow-right" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-20 lg:pt-32">
            <div className="about-hero-layout">

              {/* LEFT SIDE */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                transition={{ duration: 0.55 }}
                className="about-hero-content"
              >
                <div className="about-breadcrumb">
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                  >
                    Home
                  </button>

                  <span>/</span>
                  <span>About Us</span>
                </div>

                <div className="mt-8 flex items-center gap-4">
                  <div className="about-hero-logo">
                    <img
                      src="/nextgen-vault-logo.png"
                      alt="NextGen Vault"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-700">
                      NextGen Vault
                    </p>

                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">
                      Digital Legacy Management
                    </p>
                  </div>
                </div>

                <h1 className="mt-7 text-4xl font-bold leading-tight tracking-[-0.04em] text-ink-950 sm:text-5xl lg:text-[3.45rem]">
                  Building a safer way to
                  <span className="landing-gradient-text">
                    {" "}preserve digital legacy.
                  </span>
                </h1>

                <p className="mt-6 max-w-xl text-base leading-8 text-ink-500 sm:text-lg">
                  NextGen Vault helps individuals securely organize important
                  documents, manage trusted beneficiaries and control how
                  sensitive digital information is handed over when it matters.
                </p>

                <div className="about-hero-pills">
                  <span>
                    <ShieldCheck size={15} />
                    Secure Storage
                  </span>

                  <span>
                    <UserRoundCheck size={15} />
                    Trusted Access
                  </span>

                  <span>
                    <Fingerprint size={15} />
                    Controlled Handover
                  </span>
                </div>
              </motion.div>

              {/* RIGHT SIDE IMAGE */}
              <motion.div
                initial={{ opacity: 0, x: 35 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.12,
                  ease: "easeOut",
                }}
                className="about-hero-visual"
              >
                <div className="about-hero-image-glow" />

                <img
                  src="public/about-vault.png"
                  alt="NextGen Vault secure digital legacy platform"
                  className="about-hero-image"
                />
              </motion.div>

            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <motion.article
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="about-purpose-card"
            >
              <div className="about-purpose-icon"><Eye size={22} /></div>
              <p className="about-card-kicker">Our Vision</p>
              <h2>Make digital legacy clear, secure and intentional.</h2>
              <p>
                We envision a future where important digital information does not become inaccessible or confusing during unexpected life events. People should be able to prepare their digital legacy while they are in control of it.
              </p>
            </motion.article>

            <motion.article
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="about-purpose-card"
            >
              <div className="about-purpose-icon"><Target size={22} /></div>
              <p className="about-card-kicker">Our Mission</p>
              <h2>
                Give people control over what they leave behind
                and who can receive it.
              </h2>

              <p>
                Our mission is to provide a secure environment where owners can
                organize important records, establish verified beneficiary
                relationships and define controlled access, while administrators
                and legal advisors support structured legacy claim reviews when
                those records need to be handed over.
              </p>
            </motion.article>
          </div>
        </section>

        <section className="about-section about-offer-section">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

            {/* Heading + Watermark */}
            <div className="about-offer-header">

              {/* LEFT: What We Offer */}
              <div className="about-section-heading">
                <div className="landing-kicker">
                  <Sparkles size={13} />
                  What We Offer
                </div>

                <h2>
                  Practical tools for
                  <span className="landing-gradient-text">
                    {" "}controlled digital legacy management.
                  </span>
                </h2>

                <p>
                  The platform combines secure organization,
                  beneficiary management and controlled access
                  instead of treating legacy planning as simple
                  cloud storage.
                </p>
              </div>

              {/* RIGHT: Watermark */}
              <div
                className="about-offer-watermark"
                aria-hidden="true"
              >
                <div className="about-offer-watermark-glow" />

                <img
                  src="/nextgen-vault-logo.png"
                  alt=""
                />

                <span>NEXTGEN VAULT</span>

                <p>SECURE • ORGANIZE • PROTECT • PASS ON</p>
              </div>

            </div>

            {/* Feature Cards */}
            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {OFFERINGS.map(
                ({ icon: Icon, title, text }, index) => (
                  <motion.article
                    key={title}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{
                      once: true,
                      amount: 0.2,
                    }}
                    variants={fadeUp}
                    transition={{
                      duration: 0.45,
                      delay: index * 0.045,
                    }}
                    className="about-offer-card"
                  >
                    <div className="about-offer-icon">
                      <Icon size={20} />
                    </div>

                    <h3>{title}</h3>

                    <p>{text}</p>
                  </motion.article>
                )
              )}
            </div>

          </div>
        </section>



        <section className="about-section pt-0">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="about-cta">
              <div className="about-cta-grid" />
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-brand-100">
                  <Fingerprint size={13} />
                  Your information. Your people. Your control.
                </div>
                <h2 className="mt-5 text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl">
                  Prepare your digital legacy before it becomes someone else&apos;s uncertainty.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                  Start with a secure account, organize the records that matter and decide who should receive access.
                </p>
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-700 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
                >
                  {isAuthenticated ? "Go to Dashboard" : "Create Account"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-100 bg-white/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <button type="button" onClick={() => navigate("/")} className="flex items-center gap-3 text-left">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-ink-100">
              <img src="/nextgen-vault-logo.png" alt="NextGen Vault" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink-900">NextGen Vault</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">Digital Asset Custody</p>
            </div>
          </button>

          <div className="flex items-center gap-5 text-xs text-ink-400">
            <button type="button" onClick={() => navigate("/")} className="transition hover:text-brand-700">Home</button>
            <span>Secure Legacy Management Platform</span>
          </div>
        </div>
      </footer>

      <ScrollToTopButton />
    </div>
  );
}
