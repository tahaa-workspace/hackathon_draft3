import {
  ArrowRight,
  CheckCircle2,
  Eye,
  FileText,
  KeyRound,
  Lock,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  UserRoundCheck,
} from "lucide-react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

export default function HeroSection({
  isAuthenticated,
  onPrimary,
  onSignIn,
}) {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const smoothX = useSpring(pointerX, {
    stiffness: 130,
    damping: 18,
  });

  const smoothY = useSpring(pointerY, {
    stiffness: 130,
    damping: 18,
  });

  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-8, 8]);
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [8, -8]);

  const handlePointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();

    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <section className="landing-hero">
      <div className="landing-grid-overlay" />
      <div className="landing-orb landing-orb-one" />
      <div className="landing-orb landing-orb-two" />
      <div className="landing-orb landing-orb-three" />

      <div className="relative mx-auto grid min-h-[calc(100vh-72px)] max-w-7xl items-center gap-16 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative z-10"
        >
          <div className="landing-kicker">
            <Sparkles size={14} />
            Secure your digital legacy today
          </div>

          <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-[-0.04em] text-ink-900 sm:text-5xl lg:text-[66px] lg:leading-[1.06]">
            Protect what matters.
            <span className="landing-gradient-text ml-2 inline-block">
              Pass it on with control.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-8 text-ink-500 sm:text-lg">
            Organize important documents in one secure vault, create trusted
            beneficiaries, and decide exactly who can access each part of your
            digital legacy.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onPrimary}
              className="landing-primary-button landing-primary-button-lg"
            >
              {isAuthenticated ? "Open Dashboard" : "Create Your Vault"}
              <ArrowRight size={17} />
            </button>

            {!isAuthenticated && (
              <button
                type="button"
                onClick={onSignIn}
                className="landing-secondary-button"
              >
                Sign In
              </button>
            )}
          </div>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
            <TrustItem text="Protected authentication" />
            <TrustItem text="Role-based permissions" />
            <TrustItem text="Controlled vault access" />
          </div>
        </motion.div>

        <div
          className="landing-hero-stage"
          onPointerMove={handlePointerMove}
          onPointerLeave={resetPointer}
        >
          <motion.div
            style={{
              rotateX,
              rotateY,
              transformPerspective: 1400,
            }}
            className="landing-vault-card"
          >
            <div className="landing-card-glow" />

            <motion.div
              className="landing-floating-card landing-floating-card-left"
              animate={{ y: [0, -14, 0], rotate: [-4, 2, -4] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <FileText size={24} className="text-brand-600" />
              <div>
                <p className="text-[11px] font-semibold text-ink-800">
                  Property Agreement
                </p>
                <p className="text-[9px] text-ink-400">Encrypted vault item</p>
              </div>
            </motion.div>

            <motion.div
              className="landing-floating-card landing-floating-card-right"
              animate={{ y: [0, 12, 0], rotate: [4, -2, 4] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            >
              <KeyRound size={22} className="text-accent-gold" />
              <div>
                <p className="text-[11px] font-semibold text-ink-800">
                  Controlled Access
                </p>
                <p className="text-[9px] text-ink-400">Owner decides</p>
              </div>
            </motion.div>

            <div className="landing-vault-surface">
              <div className="flex items-center justify-between border-b border-ink-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-violet text-white shadow-lg shadow-brand-600/20">
                    <Shield size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-ink-900">
                      Next Gen Vault
                    </p>
                    <p className="text-[11px] text-ink-400">Owner Dashboard</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-semibold text-green-700">
                  <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_0_4px_rgba(74,222,128,0.14)]" />
                  Secure
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <MiniStat icon={FileText} value="12" label="Documents" />
                <MiniStat icon={Users} value="3" label="Trusted" />
                <MiniStat icon={ShieldCheck} value="100%" label="Protected" />
              </div>

              <div className="mt-5 rounded-2xl border border-ink-100 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-ink-900">
                      Secure Vault
                    </p>
                    <p className="mt-1 text-[10px] text-ink-400">
                      Protected documents
                    </p>
                  </div>

                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
                    <Lock size={14} />
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  <DemoDocument
                    title="Property Agreement"
                    category="Property"
                    access="2 trusted"
                  />
                  <DemoDocument
                    title="Insurance Policy"
                    category="Insurance"
                    access="1 trusted"
                  />
                  <DemoDocument
                    title="Financial Records"
                    category="Financial"
                    access="Private"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50 to-accent-cyan/10 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
                  <UserRoundCheck size={16} />
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-brand-900">
                    Access stays controlled
                  </p>
                  <p className="mt-0.5 text-[10px] text-brand-700">
                    Each beneficiary sees only the documents you assign.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="landing-floor-shadow" />
        </div>
      </div>
    </section>
  );
}

function TrustItem({ text }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-ink-500">
      <CheckCircle2 size={15} className="text-green-500" />
      {text}
    </div>
  );
}

function MiniStat({ icon: Icon, value, label }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white/90 p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-brand-600" />
        <span className="text-sm font-bold text-ink-900">{value}</span>
      </div>
      <p className="mt-1 text-[10px] text-ink-400">{label}</p>
    </div>
  );
}

function DemoDocument({ title, category, access }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50/70 px-3 py-2.5 transition duration-300 hover:-translate-y-0.5 hover:border-brand-100 hover:bg-brand-50/60">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
        <FileText size={15} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-ink-800">
          {title}
        </p>
        <p className="mt-0.5 text-[9px] text-ink-400">{category}</p>
      </div>

      <div className="flex items-center gap-1 text-[9px] font-medium text-brand-700">
        <Eye size={10} />
        {access}
      </div>
    </div>
  );
}
