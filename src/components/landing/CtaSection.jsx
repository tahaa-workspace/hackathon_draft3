import {
  ArrowRight,
  CheckCircle2,
  Shield,
} from "lucide-react";
import Reveal from "./Reveal";

export default function CtaSection({
  isAuthenticated,
  onPrimary,
}) {
  return (
    <section className="relative overflow-hidden bg-white py-24">
      <div className="landing-cta-glow" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="landing-cta-card">
            <div className="landing-cta-grid" />

            <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_0.7fr] lg:items-center">
              <div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
                  <Shield size={25} />
                </div>

                <h2 className="mt-7 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Prepare your digital legacy before it is needed.
                </h2>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-ink-300">
                  Organize important documents, create trusted beneficiaries
                  and stay in control of who can access your information.
                </p>

                <button
                  type="button"
                  onClick={onPrimary}
                  className="landing-light-button mt-8"
                >
                  {isAuthenticated
                    ? "Open Dashboard"
                    : "Create Your Secure Vault"}

                  <ArrowRight size={17} />
                </button>
              </div>

              <div className="grid gap-3">
                <DifferenceItem text="Verified Owner accounts" />
                <DifferenceItem text="Owner-created beneficiaries" />
                <DifferenceItem text="Document-level permissions" />
                <DifferenceItem text="Protected vault access" />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function DifferenceItem({ text }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-400/10 text-green-300">
        <CheckCircle2 size={14} />
      </div>

      <span className="text-sm font-medium text-white">{text}</span>
    </div>
  );
}
