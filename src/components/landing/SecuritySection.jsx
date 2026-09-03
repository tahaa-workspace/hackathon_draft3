import {
  Activity,
  ArrowDown,
  Cloud,
  Database,
  Fingerprint,
  ShieldCheck,
} from "lucide-react";

import { securityPoints } from "../../data/landingData";
import Reveal from "./Reveal";

export default function SecuritySection() {
  return (
    <section id="security" className="landing-security-section py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-600">
            Security by design
          </p>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Sensitive documents deserve more than a public file link.
          </h2>

          <p className="mt-6 max-w-xl text-sm leading-7 text-ink-500">
            Authentication, authorization, structured application data and file
            storage are separated so document requests can pass through
            controlled backend access.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {securityPoints.map((point) => {
              const Icon = point.icon;

              return (
                <div
                  key={point.title}
                  className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-xl"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-accent-cyan/15 text-brand-700">
                    <Icon size={18} />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-ink-900">
                    {point.title}
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-ink-500">
                    {point.description}
                  </p>
                </div>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="landing-architecture-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-ink-900">
                  Protected Architecture
                </p>
                <p className="mt-1 text-xs text-ink-400">Secure request flow</p>
              </div>

              <Activity size={18} className="text-green-500" />
            </div>

            <div className="mt-7 space-y-3">
              <ArchitectureRow
                icon={Fingerprint}
                title="Authentication"
                text="JWT protected session"
                tone="brand"
              />

              <ArchitectureArrow />

              <ArchitectureRow
                icon={ShieldCheck}
                title="Authorization"
                text="Role and permission validation"
                tone="violet"
              />

              <ArchitectureArrow />

              <div className="grid gap-3 sm:grid-cols-2">
                <ArchitectureRow
                  icon={Database}
                  title="MongoDB"
                  text="Users, metadata and permissions"
                  tone="cyan"
                />

                <ArchitectureRow
                  icon={Cloud}
                  title="Cloud Storage"
                  text="Protected document assets"
                  tone="green"
                />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ArchitectureRow({ icon: Icon, title, text, tone }) {
  const toneClasses = {
    brand: "from-brand-100 to-brand-50 text-brand-700",
    violet: "from-purple-100 to-purple-50 text-accent-violet",
    cyan: "from-cyan-100 to-cyan-50 text-cyan-700",
    green: "from-green-100 to-green-50 text-emerald-700",
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white/85 p-4 shadow-sm">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${toneClasses[tone]}`}
      >
        <Icon size={17} />
      </div>

      <div>
        <p className="text-xs font-semibold text-ink-800">{title}</p>
        <p className="mt-0.5 text-[10px] text-ink-400">{text}</p>
      </div>
    </div>
  );
}

function ArchitectureArrow() {
  return (
    <div className="flex justify-center">
      <ArrowDown size={16} className="text-brand-300" />
    </div>
  );
}
