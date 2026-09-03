import {
  CheckCircle2,
  FileText,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import { motion } from "framer-motion";

export default function AuthBrandPanel() {
  return (
    <aside className="auth-brand-panel">

      <div className="auth-brand-grid" />

      <div className="auth-brand-glow auth-brand-glow-one" />
      <div className="auth-brand-glow auth-brand-glow-two" />


      {/* Top logo */}
      <div className="relative z-10 flex items-center gap-3">

        <div className="auth-logo-box">
          <ShieldCheck size={21} />
        </div>

        <div>
          <p className="text-base font-bold text-white">
            Digital Legacy
          </p>

          <p className="text-xs text-brand-200">
            Next Gen Vault
          </p>
        </div>

      </div>


      {/* Main content */}
      <div className="relative z-10 my-auto max-w-xl">

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.65,
          }}
        >

          <div className="auth-brand-kicker">
            <LockKeyhole size={13} />
            Secure Digital Legacy
          </div>

          <h2 className="mt-6 max-w-lg text-4xl font-bold leading-[1.13] tracking-[-0.035em] text-white xl:text-5xl">
            Your legacy.
            <br />

            <span className="auth-brand-gradient-text">
              Protected today.
            </span>

            <br />

            Available to the right people.
          </h2>

          <p className="mt-6 max-w-lg text-sm leading-7 text-brand-100/80">
            Securely organize important documents,
            create trusted beneficiaries, and
            control exactly who receives access.
          </p>

        </motion.div>


        {/* Interactive vault visual */}
        <div className="relative mt-10 max-w-lg">

          <motion.div
            initial={{
              opacity: 0,
              scale: 0.94,
              y: 18,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            transition={{
              delay: 0.2,
              duration: 0.7,
            }}
            className="auth-vault-preview"
          >

            {/* Top */}
            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="auth-mini-logo">
                  <ShieldCheck size={16} />
                </div>

                <div>
                  <p className="text-xs font-semibold text-white">
                    Secure Vault
                  </p>

                  <p className="text-[9px] text-brand-200">
                    Protected documents
                  </p>
                </div>

              </div>


              <div className="auth-online-badge">
                <span className="auth-online-dot" />
                Protected
              </div>

            </div>


            {/* Vault documents */}
            <div className="mt-5 space-y-2">

              <VaultItem
                icon={FileText}
                title="Property Documents"
                access="Shared with 2"
              />

              <VaultItem
                icon={FileText}
                title="Insurance Records"
                access="Shared with 1"
              />

              <VaultItem
                icon={KeyRound}
                title="Private Information"
                access="Owner only"
              />

            </div>


            {/* Access notification */}
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.055] p-3">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-400/10 text-green-300">
                <UserRoundCheck size={15} />
              </div>

              <div>
                <p className="text-[10px] font-semibold text-white">
                  Access controlled
                </p>

                <p className="mt-0.5 text-[9px] text-brand-200">
                  Only authorized beneficiaries
                  can view assigned documents.
                </p>
              </div>

            </div>

          </motion.div>


          {/* Floating shield */}
          <motion.div
            animate={{
              y: [0, -10, 0],
              rotate: [-4, 3, -4],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="auth-floating-security"
          >
            <LockKeyhole size={20} />
          </motion.div>

        </div>


        {/* Trust points */}
        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3">

          <TrustPoint text="Secure authentication" />
          <TrustPoint text="Role-based access" />
          <TrustPoint text="Controlled permissions" />

        </div>

      </div>


      {/* Bottom */}
      <div className="relative z-10 flex items-center justify-between text-[10px] text-brand-200/70">

        <span>
          Secure Legacy Management
        </span>

        <span>
          Next Gen Vault
        </span>

      </div>

    </aside>
  );
}


function VaultItem({
  icon: Icon,
  title,
  access,
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.045] p-3 transition duration-300 hover:translate-x-1 hover:bg-white/[0.075]">

      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.08] text-brand-200">
        <Icon size={14} />
      </div>

      <div className="min-w-0 flex-1">

        <p className="truncate text-[10px] font-semibold text-white">
          {title}
        </p>

        <p className="mt-0.5 text-[9px] text-brand-200/70">
          {access}
        </p>

      </div>

      <CheckCircle2
        size={13}
        className="text-green-300"
      />

    </div>
  );
}


function TrustPoint({
  text,
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-medium text-brand-100">

      <CheckCircle2
        size={12}
        className="text-green-300"
      />

      {text}

    </div>
  );
}