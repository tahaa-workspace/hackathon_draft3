import { problems } from "../../data/landingData";
import Reveal from "./Reveal";

export default function ProblemSection() {
  return (
    <section id="problem" className="relative overflow-hidden bg-ink-950 py-24 text-white">
      <div className="landing-dark-glow" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-300">
              The Problem
            </p>

            <h2 className="mt-4 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
              Important information becomes hardest to find when families need
              it most.
            </h2>

            <p className="mt-6 max-w-xl text-sm leading-7 text-ink-300">
              Financial records, insurance papers, property documents and other
              critical information are often scattered across devices, cloud
              accounts, emails and physical folders.
            </p>

            <p className="mt-4 max-w-xl text-sm leading-7 text-ink-300">
              The challenge is not only storing files. It is organizing them
              before an unexpected situation and ensuring the right people can
              access the right information.
            </p>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2">
            {problems.map((problem, index) => {
              const Icon = problem.icon;

              return (
                <Reveal key={problem.title} delay={index * 0.08}>
                  <article className="group h-full rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-brand-400/30 hover:bg-white/[0.07]">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.07] text-brand-300">
                        <Icon size={18} />
                      </div>

                      <span className="text-xs font-bold text-brand-300/70">
                        {problem.number}
                      </span>
                    </div>

                    <h3 className="mt-5 text-sm font-semibold text-white">
                      {problem.title}
                    </h3>

                    <p className="mt-2 text-xs leading-6 text-ink-400">
                      {problem.text}
                    </p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
