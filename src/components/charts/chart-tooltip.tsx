import type { ReactNode } from "react";
import { type SeriesMark, SeriesKey } from "./series-key";

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
  mark?: SeriesMark;
  /** Secondary text under the row, such as the comparison bucket's dates. */
  detail?: string;
}

interface ChartTooltipCardProps {
  title: string;
  rows: readonly TooltipRow[];
  footer?: ReactNode;
}

/** One readout for every series at the hovered point. Values lead; names follow in muted ink. */
export function ChartTooltipCard({ title, rows, footer }: ChartTooltipCardProps) {
  return (
    <div className="min-w-44 rounded-lg border border-line bg-surface-raised px-3 py-2.5 text-xs shadow-pop">
      <p className="mb-2 font-medium text-ink-muted">{title}</p>
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-start gap-2">
            {row.color && row.mark ? <SeriesKey color={row.color} mark={row.mark} className="mt-[7px]" /> : null}
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-4">
                <span className="text-ink-muted">{row.label}</span>
                <span className="text-sm font-semibold text-ink tabular">{row.value}</span>
              </span>
              {row.detail ? <span className="block text-ink-muted tabular">{row.detail}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      {footer ? <div className="mt-2 border-t border-line pt-2 text-ink-muted">{footer}</div> : null}
    </div>
  );
}
