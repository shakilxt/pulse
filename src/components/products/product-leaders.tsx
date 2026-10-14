import { Trophy } from "lucide-react";
import type { ProductLeader } from "@/lib/products";

/** The period's best performers across the whole catalogue: one ruled strip, a card per measure. */
export function ProductLeaders({ leaders }: { leaders: readonly ProductLeader[] }) {
  return (
    <section aria-labelledby="leaders-title" data-pending-region="" className="lg:col-span-12">
      <h2 id="leaders-title" className="sr-only">
        Top performers
      </h2>
      {leaders.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-5 py-4 text-sm text-ink-muted">
          No product sold anything in this period, so there are no top performers to show.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
          {leaders.map((leader) => (
            <li key={leader.id} className="flex flex-col bg-surface p-4 sm:p-5">
              <p className="flex items-center gap-1.5 text-sm font-medium text-ink-muted">
                <Trophy aria-hidden className="size-3.5 text-gold-ink" />
                {leader.label}
              </p>
              <p className="mt-2 truncate text-base font-semibold text-ink">
                {leader.row.name}
                <span className="sr-only">, {leader.row.category}</span>
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-ink tabular">{leader.value}</p>
              <p className="mt-auto pt-2 text-xs text-ink-muted">{leader.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
