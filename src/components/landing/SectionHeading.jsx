import Reveal from "./Reveal";

export default function SectionHeading({
  eyebrow,
  title,
  description,
  light = false,
}) {
  return (
    <Reveal className="mx-auto max-w-3xl text-center">
      <p
        className={`text-xs font-bold uppercase tracking-[0.22em] ${
          light ? "text-brand-300" : "text-brand-600"
        }`}
      >
        {eyebrow}
      </p>

      <h2
        className={`mt-4 text-3xl font-bold tracking-tight sm:text-4xl ${
          light ? "text-white" : "text-ink-900"
        }`}
      >
        {title}
      </h2>

      <p
        className={`mx-auto mt-5 max-w-2xl text-sm leading-7 ${
          light ? "text-ink-300" : "text-ink-500"
        }`}
      >
        {description}
      </p>
    </Reveal>
  );
}
