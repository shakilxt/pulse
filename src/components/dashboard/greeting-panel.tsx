import type { ReactNode } from "react";
import { Landscape } from "@/components/brand/landscape";

interface GreetingPanelProps {
  salutation: string;
  firstName: string;
  /** "Wednesday, September 30, 2026 · Demo workspace". */
  eyebrow: string;
  /** One or two sentences about the chosen period; streamed in with the data. */
  summary: ReactNode;
}

/**
 * The editorial opening of the overview: a misty coastline under an ivory wash,
 * a serif greeting and a plain-language summary computed from the data.
 */
export function GreetingPanel({ salutation, firstName, eyebrow, summary }: GreetingPanelProps) {
  return (
    <section
      aria-labelledby="greeting-title"
      className="relative isolate flex min-h-56 overflow-hidden rounded-xl border border-line bg-surface lg:col-span-8"
    >
      <div aria-hidden className="absolute inset-0 -z-10">
        <Landscape fade="soft" className="opacity-90" />
        <div className="absolute inset-0 bg-surface/70 sm:bg-transparent sm:bg-linear-to-r sm:from-surface sm:from-35% sm:via-surface/85 sm:via-55% sm:to-surface/10" />
      </div>
      <div className="flex max-w-xl flex-col justify-end p-6 sm:p-8">
        <p className="text-xs font-medium tracking-[0.18em] text-gold-ink uppercase">{eyebrow}</p>
        <h1 id="greeting-title" className="mt-3 font-serif text-[40px] leading-[1.02] font-medium tracking-tight text-ink sm:text-5xl">
          <span className="sr-only">Overview. </span>
          {salutation}, {firstName}.
        </h1>
        <div className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-muted">{summary}</div>
      </div>
    </section>
  );
}
