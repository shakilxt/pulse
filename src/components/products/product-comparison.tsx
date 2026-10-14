import { SearchX } from "lucide-react";
import { ChartFrame } from "@/components/charts/chart-frame";
import { ChartLegend } from "@/components/charts/series-key";
import { QuerySegmentedControl } from "@/components/filters/query-segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
import { formatChange, formatDateRange, formatInteger, formatMoney, formatPercent } from "@/lib/formatters";
import { comparisonSeriesName } from "@/lib/metrics";
import type { CurrencyCode } from "@/lib/money";
import {
  PRODUCT_CHART_METRICS,
  PRODUCT_CHART_METRIC_LABELS,
  type ProductChartMetric,
  type ProductPerformanceView,
} from "@/lib/products";
import { PARAM } from "@/lib/search-params";

const METRIC_OPTIONS = PRODUCT_CHART_METRICS.map((metric) => ({ value: metric, label: PRODUCT_CHART_METRIC_LABELS[metric] }));

function formatValue(value: number | null, metric: ProductChartMetric, currency: CurrencyCode): string {
  if (value === null) return "—";
  switch (metric) {
    case "revenue":
      return formatMoney(value, currency, { whole: true });
    case "units":
      return formatInteger(value);
    case "conversion":
      return formatPercent(value, 2);
  }
}

/**
 * Products ranked by one measure as horizontal bars, with a tick where each
 * stood in the comparison period. Drawn in HTML so long names wrap on phones;
 * every value is printed beside its bar, so nothing depends on hovering.
 */
export function ProductComparison({ view }: { view: ProductPerformanceView }) {
  const { chart, currency, comparison } = view;
  const { metric, bars } = chart;
  const hasComparison = comparison.summary !== null;
  const comparisonName = comparisonSeriesName(view.query.dates.comparison);
  const scale = Math.max(0, ...bars.map((bar) => Math.max(bar.value, hasComparison ? (bar.previousValue ?? 0) : 0)));
  const width = (value: number) => `${scale > 0 ? (value / scale) * 100 : 0}%`;
  const metricLabel = PRODUCT_CHART_METRIC_LABELS[metric];
  const scope = view.filtered ? `${bars.length} of ${view.totalCount} products` : `All ${view.totalCount} products`;

  return (
    <ChartFrame
      id="product-comparison"
      title="Product comparison"
      deferPlot={false}
      description={`${scope}, ranked by ${metricLabel.toLowerCase()}, ${formatDateRange(view.range)}`}
      className="lg:col-span-12"
      aside={
        <QuerySegmentedControl
          label="Rank products by"
          param={PARAM.metric}
          options={METRIC_OPTIONS}
          value={metric}
          defaultValue="revenue"
          size="sm"
        />
      }
      legend={
        bars.length > 0 ? (
          <ChartLegend
            items={[
              { label: "This period", color: "var(--chart-1)", mark: "bar" },
              ...(hasComparison
                ? [{ label: comparisonName, color: "var(--ink)", mark: "line" as const, detail: formatDateRange(comparison.range) }]
                : []),
            ]}
          />
        ) : undefined
      }
      summary={chart.summary}
      plotClassName="min-h-24"
      table={{
        caption: `Products ranked by ${metricLabel.toLowerCase()}`,
        columns: [
          { label: "Product" },
          { label: metricLabel, align: "end" },
          ...(hasComparison ? [{ label: comparisonName, align: "end" as const }, { label: "Change", align: "end" as const }] : []),
        ],
        rows: bars.map((bar) => ({
          key: bar.id,
          cells: [
            bar.name,
            formatValue(bar.value, metric, currency),
            ...(hasComparison ? [formatValue(bar.previousValue, metric, currency), formatChange(bar.change)] : []),
          ],
        })),
      }}
    >
      {bars.length === 0 ? (
        <EmptyState icon={SearchX} title="No products match the search" description="Clear the search to compare every product." />
      ) : (
        <ol className="space-y-1" aria-label={`Products by ${metricLabel.toLowerCase()}`}>
          {bars.map((bar, index) => (
            <li
              key={bar.id}
              className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-md px-1 py-1.5 hover:bg-surface-sunken/60 sm:grid-cols-[1.25rem_minmax(9rem,13rem)_minmax(0,1fr)_6.5rem]"
            >
              <span aria-hidden className="text-xs font-semibold text-gold-ink tabular">
                {index + 1}
              </span>
              <span className="min-w-0 truncate text-sm text-ink">{bar.name}</span>
              <span className="col-start-2 col-end-4 row-start-2 sm:col-start-3 sm:col-end-4 sm:row-start-1">
                <span aria-hidden className="relative block h-3 rounded-full bg-surface-sunken">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-chart-1" style={{ width: width(bar.value) }} />
                  {hasComparison && bar.previousValue !== null ? (
                    <span
                      className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-ink ring-2 ring-surface"
                      style={{ left: width(bar.previousValue) }}
                    />
                  ) : null}
                </span>
              </span>
              <span className="col-start-3 row-start-1 text-right text-sm leading-tight sm:col-start-4">
                <span className="block font-semibold text-ink tabular">{formatValue(bar.value, metric, currency)}</span>
                {hasComparison ? (
                  <span className="block text-xs text-ink-muted tabular">
                    <span className="sr-only">{comparisonName}: </span>
                    was {formatValue(bar.previousValue, metric, currency)}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      )}
    </ChartFrame>
  );
}
