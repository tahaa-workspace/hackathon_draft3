import { features } from "../../data/landingData";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import SpotlightCard from "./SpotlightCard";

const TONE_CLASSES = {
  blue: "from-brand-500/18 to-brand-50 text-brand-700",
  violet: "from-accent-violet/18 to-purple-50 text-accent-violet",
  cyan: "from-accent-cyan/20 to-cyan-50 text-cyan-700",
  green: "from-accent-mint/18 to-green-50 text-emerald-700",
  amber: "from-accent-gold/20 to-amber-50 text-amber-700",
  rose: "from-rose-400/20 to-rose-50 text-rose-700",
};

export default function FeaturesSection() {
  return (
    <section id="features" className="landing-color-section py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The Solution"
          title="More than cloud storage."
          description="Next Gen Vault combines secure organization, trusted beneficiaries and controlled access inside one Digital Legacy platform."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <Reveal key={feature.title} delay={index * 0.06}>
                <SpotlightCard className="h-full">
                  <article className="relative z-10 h-full p-6">
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${
                          TONE_CLASSES[feature.tone]
                        } shadow-sm`}
                      >
                        <Icon size={20} />
                      </div>

                      <span className="text-xs font-bold text-ink-200">
                        0{index + 1}
                      </span>
                    </div>

                    <h3 className="mt-5 text-base font-semibold text-ink-900">
                      {feature.title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-ink-500">
                      {feature.description}
                    </p>
                  </article>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
