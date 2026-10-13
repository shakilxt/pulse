import { Sprout } from "lucide-react";

interface PlannedViewProps {
  phase: number;
  items: string[];
}

/** Temporary Phase 1 scaffold: lists what each route will contain. Removed as views are built. */
export function PlannedView({ phase, items }: PlannedViewProps) {
  return (
    <section
      aria-labelledby="planned-view-title"
      className="mt-8 grid gap-6 rounded-xl border border-dashed border-line-strong/60 bg-surface p-6 sm:p-8 lg:grid-cols-[minmax(0,280px)_1fr]"
    >
      <div>
        <Sprout aria-hidden className="mb-3 size-5 text-gold-ink" strokeWidth={1.75} />
        <h2 id="planned-view-title" className="text-base font-semibold text-ink">
          Planned for this view
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
          This route is part of the navigation scaffold. Its content is built in phase {phase}.
        </p>
      </div>
      <ul className="grid gap-x-8 gap-y-2.5 text-sm text-ink sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex items-baseline gap-2.5">
            <span aria-hidden className="size-1 shrink-0 translate-y-[-3px] rounded-full bg-gold" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
