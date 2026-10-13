import { DateRangePicker } from "@/components/filters/date-range-picker";
import { QuerySegmentedControl } from "@/components/filters/query-segmented-control";
import { type ComparisonMode, type DateRange, type RangePreset, defaultComparisonMode } from "@/lib/dates";
import { formatDateRange } from "@/lib/formatters";
import { missingComparison } from "@/lib/summaries";
import { type DateRangeState, PARAM } from "@/lib/search-params";

const COMPARISON_OPTIONS = [
  { value: "previous-period", label: "Previous period" },
  { value: "previous-year", label: "Same period last year" },
] as const satisfies ReadonlyArray<{ value: ComparisonMode; label: string }>;

interface AnalyticsToolbarProps {
  state: DateRangeState;
  bounds: DateRange;
  defaultPreset: RangePreset;
  /** The comparison period, or null when it reaches outside the data. */
  comparisonRange: DateRange | null;
}

/** The two choices that scope every figure on the page, in one row above the charts. */
export function AnalyticsToolbar({ state, bounds, defaultPreset, comparisonRange }: AnalyticsToolbarProps) {
  return (
    <section
      aria-label="Report period"
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 lg:col-span-12"
    >
      <DateRangePicker value={state} bounds={bounds} defaultPreset={defaultPreset} className="sm:min-w-64" />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span aria-hidden className="text-sm text-ink-muted">
          Compare with
        </span>
        <QuerySegmentedControl
          label="Compare with"
          param={PARAM.compare}
          options={COMPARISON_OPTIONS}
          value={state.comparison}
          defaultValue={defaultComparisonMode(state.preset)}
        />
      </div>
      <p data-pending-region="" className="text-sm text-ink-muted tabular sm:ml-auto" aria-live="polite">
        {comparisonRange ? (
          <>
            Comparing with <span className="font-medium text-ink">{formatDateRange(comparisonRange)}</span>
          </>
        ) : (
          <>No data for {missingComparison(state.comparison)}. Figures are shown without a comparison.</>
        )}
      </p>
    </section>
  );
}
