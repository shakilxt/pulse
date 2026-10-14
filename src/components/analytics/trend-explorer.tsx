import { LineChart as LineChartIcon } from "lucide-react";
import { ChartDataTable, ChartFigure } from "@/components/charts/chart-frame";
import { CHART_COLORS } from "@/components/charts/chart-theme";
import { ChartLegend } from "@/components/charts/series-key";
import { TrendChart } from "@/components/charts/trend-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { type Analytics, DEFAULT_TREND_METRIC, TREND_METRIC_LABELS } from "@/lib/analytics";
import { bucketNoun } from "@/lib/chart-series";
import { changeDigits, formatDateRange, formatMetricValue } from "@/lib/formatters";
import {
  type TrendMetricId,
  changeSentiment,
  comparisonSeriesName,
  getMetricDefinition,
  metricChange,
} from "@/lib/metrics";
import { MetricTabs, type MetricTabOption } from "./metric-tabs";

const TITLE_ID = "trend-title";
const SUMMARY_ID = "trend-summary";

/**
 * The page's main chart: pick a metric, see it over the period against the
 * comparison, with summary statistics for the same figures alongside.
 */
export function TrendExplorer({ analytics }: { analytics: Analytics }) {
  const { trend, granularity } = analytics;
  const comparison = analytics.comparison.summary ? analytics.comparison.range : null;
  const comparisonName = comparisonSeriesName(analytics.comparisonMode);
  const noun = bucketNoun(granularity);

  const options = analytics.selector.map(({ id, metric }): MetricTabOption<TrendMetricId> => {
    const change = metricChange(metric);
    return {
      value: id,
      label: TREND_METRIC_LABELS[id],
      figure: formatMetricValue(metric.value, metric.format, analytics.currency),
      change,
      sentiment: changeSentiment(change, getMetricDefinition(id).polarity),
      digits: changeDigits(metric.format),
    };
  });

  return (
    <section aria-labelledby={TITLE_ID} className="rounded-xl border border-line bg-surface lg:col-span-12">
      <header className="flex flex-col gap-4 p-5 sm:p-6">
        <div>
          <h2 id={TITLE_ID} className="text-base font-semibold text-ink">
            {trend.label} trend
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Per {noun}, {formatDateRange(analytics.range)}, {analytics.comparisonLabel}. Choose a metric to chart.
          </p>
        </div>
        <MetricTabs options={options} value={trend.metric} defaultValue={DEFAULT_TREND_METRIC} />
      </header>

      <div data-pending-region="trend" className="grid border-t border-line lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col p-5 sm:p-6">
          <ChartLegend
            items={[
              { label: "This period", color: CHART_COLORS.primary, mark: "line" },
              ...(comparison
                ? [{ label: comparisonName, color: CHART_COLORS.neutral, mark: "dashed" as const, detail: formatDateRange(comparison) }]
                : []),
              ...(trend.peakDate ? [{ label: "Peak", color: CHART_COLORS.highlight, mark: "dot" as const }] : []),
            ]}
          />
          {trend.empty ? (
            <figure aria-labelledby={TITLE_ID} aria-describedby={SUMMARY_ID} className="mt-4">
              <EmptyState
                icon={LineChartIcon}
                title={`Nothing to chart for ${trend.label.toLowerCase()}`}
                description="Choose a longer date range or another metric."
                className="h-64 justify-center rounded-lg border border-dashed border-line sm:h-80"
              />
              <figcaption id={SUMMARY_ID} className="mt-4 text-sm leading-relaxed text-ink-muted">
                {trend.summary}
              </figcaption>
            </figure>
          ) : (
            <ChartFigure titleId={TITLE_ID} summaryId={SUMMARY_ID} summary={trend.summary} plotClassName="h-64 sm:h-80">
              <TrendChart
                points={trend.points}
                format={trend.format}
                currency={analytics.currency}
                seriesLabel={trend.label}
                comparisonName={comparisonName}
                variant={trend.variant}
                peakDate={trend.peakDate}
                label={`${trend.label} chart`}
              />
            </ChartFigure>
          )}
          <ChartDataTable
            table={{
              caption: `${trend.label} per ${noun}`,
              columns: [
                { label: "Period" },
                { label: trend.label, align: "end" },
                ...(comparison ? [{ label: comparisonName, align: "end" as const }, { label: "Compared with" }] : []),
              ],
              rows: trend.points.map((point) => ({
                key: point.date,
                cells: [
                  point.label,
                  formatMetricValue(point.value, trend.format, analytics.currency),
                  ...(comparison ? [formatMetricValue(point.previousValue, trend.format, analytics.currency), point.previousLabel ?? "—"] : []),
                ],
              })),
            }}
          />
        </div>

        <aside
          aria-labelledby="trend-stats-title"
          className="border-t border-line bg-surface-sunken/50 p-5 sm:p-6 lg:border-t-0 lg:border-l"
        >
          <h3 id="trend-stats-title" className="text-xs font-medium tracking-[0.18em] text-gold-ink uppercase">
            Summary statistics
          </h3>
          <dl className="mt-4 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-1">
            {trend.stats.map((stat) => (
              <div key={stat.label} className="border-b border-line py-3 first:pt-0 sm:[&:nth-child(2)]:pt-0 lg:[&:nth-child(2)]:pt-3">
                <dt className="text-sm text-ink-muted">{stat.label}</dt>
                <dd className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-lg font-semibold text-ink tabular">{stat.value}</span>
                  {stat.detail ? <span className="text-xs text-ink-muted tabular">{stat.detail}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
          {trend.statsNote ? <p className="mt-3 text-xs leading-relaxed text-ink-muted">{trend.statsNote}</p> : null}
        </aside>
      </div>
    </section>
  );
}
