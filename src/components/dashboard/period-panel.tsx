import { DateRangePicker } from "@/components/filters/date-range-picker";
import { type DateRange, type RangePreset, rangeLength } from "@/lib/dates";
import { formatDate, formatDateRange, formatInteger } from "@/lib/formatters";
import type { DateRangeState } from "@/lib/search-params";

interface PeriodPanelProps {
  state: DateRangeState;
  bounds: DateRange;
  defaultPreset: RangePreset;
  comparisonRange: DateRange | null;
}

/** The date range that scopes every figure on the page, and what it is compared with. */
export function PeriodPanel({ state, bounds, defaultPreset, comparisonRange }: PeriodPanelProps) {
  const days = rangeLength(state.range);
  return (
    <section
      aria-labelledby="period-title"
      className="flex flex-col rounded-xl border border-line bg-surface p-5 sm:p-6 md:flex-row md:items-start md:gap-8 lg:col-span-4 lg:flex-col lg:gap-0"
    >
      <div className="md:w-72 md:shrink-0 lg:w-full">
        <h2 id="period-title" className="text-xs font-medium tracking-[0.18em] text-gold-ink uppercase">
          Reporting period
        </h2>
        <DateRangePicker value={state} bounds={bounds} defaultPreset={defaultPreset} className="mt-3 w-full" />
      </div>
      <dl className="mt-5 grid flex-1 gap-3 text-sm md:mt-0 lg:mt-5">
        <div className="flex justify-between gap-4 border-b border-line pb-3">
          <dt className="text-ink-muted">Compared with</dt>
          <dd className="text-right font-medium text-ink tabular">
            {comparisonRange ? formatDateRange(comparisonRange) : "No earlier data"}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-line pb-3">
          <dt className="text-ink-muted">Length</dt>
          <dd className="font-medium text-ink tabular">{days === 1 ? "1 day" : `${formatInteger(days)} days`}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Data through</dt>
          <dd className="font-medium text-ink tabular">{formatDate(bounds.to)}</dd>
        </div>
      </dl>
      <p className="mt-auto pt-5 text-xs leading-relaxed text-ink-muted md:hidden lg:block">
        Illustrative demo data for a fictional studio. No real customers or payments.
      </p>
    </section>
  );
}
