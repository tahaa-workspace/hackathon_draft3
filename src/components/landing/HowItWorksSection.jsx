import { ChevronRight } from "lucide-react";
import { steps } from "../../data/landingData";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Simple Flow"
          title="From registration to controlled access."
          description="A clear journey takes users from identity verification to secure beneficiary access."
        />

        <div className="relative mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="absolute left-[9%] right-[9%] top-[31px] hidden h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent lg:block" />

          {steps.map((step, index) => (
            <Reveal key={step.number} delay={index * 0.08}>
              <article className="group relative z-10 h-full">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-100 bg-gradient-to-br from-white to-brand-50 text-sm font-bold text-brand-700 shadow-lg shadow-brand-600/10 transition duration-300 group-hover:-translate-y-1 group-hover:rotate-3 group-hover:shadow-xl">
                  {step.number}
                </div>

                <h3 className="mt-6 text-base font-semibold text-ink-900">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-ink-500">
                  {step.description}
                </p>

                {index < steps.length - 1 && (
                  <ChevronRight
                    size={16}
                    className="absolute -right-3 top-6 hidden text-brand-300 lg:block"
                  />
                )}
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
