import { ChartFrame } from "@/components/charts/chart-frame";
import { CHART_COLORS } from "@/components/charts/chart-theme";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ChartLegend } from "@/components/charts/series-key";
import { bucketNoun } from "@/lib/chart-series";
import { formatDateRange, formatMetricValue } from "@/lib/formatters";
import { changeSentiment, getMetricDefinition, metricChange } from "@/lib/metrics";
import type { Overview } from "@/lib/overview";
import { ChangeBadge } from "./change-badge";

export function RevenuePanel({ overview }: { overview: Overview }) {
  const { points, summary } = overview.revenue;
  const metric = overview.metrics.find((item) => item.id === "revenue");
  const change = metric ? metricChange(metric) : null;
  const comparison = overview.comparison.summary ? overview.comparison.range : null;

  return (
    <ChartFrame
      id="revenue"
      title="Revenue"
      description={`Completed orders per ${bucketNoun(overview.granularity)}, ${formatDateRange(overview.range)}`}
      className="lg:col-span-8"
      aside={
        metric ? (
          <div className="text-right">
            <p className="text-[32px] leading-none font-semibold tracking-tight text-ink tabular">
              {formatMetricValue(metric.value, metric.format)}
            </p>
            {change ? (
              <p className="mt-2 flex items-center justify-end gap-2 text-xs text-ink-muted">
                <ChangeBadge change={change} sentiment={changeSentiment(change, getMetricDefinition("revenue").polarity)} />
                {metric.comparisonLabel}
              </p>
            ) : null}
          </div>
        ) : null
      }
      legend={
        <ChartLegend
          items={[
            { label: "This period", color: CHART_COLORS.primary, mark: "line" },
            ...(comparison
              ? [{ label: "Previous period", color: CHART_COLORS.neutral, mark: "dashed" as const, detail: formatDateRange(comparison) }]
              : []),
            ...(points.length > 1 ? [{ label: "Peak", color: CHART_COLORS.highlight, mark: "dot" as const }] : []),
          ]}
        />
      }
      summary={summary}
      plotClassName="h-64 sm:h-80"
      table={{
        caption: `Revenue per ${bucketNoun(overview.granularity)}`,
        columns: [
          { label: "Period" },
          { label: "Revenue", align: "end" },
          ...(comparison ? [{ label: "Previous period", align: "end" as const }, { label: "Compared with" }] : []),
        ],
        rows: points.map((point) => ({
          key: point.date,
          cells: [
            point.label,
            formatMetricValue(point.revenueMinor, "currency"),
            ...(comparison
              ? [
                  point.previousRevenueMinor === null ? "—" : formatMetricValue(point.previousRevenueMinor, "currency"),
                  point.previousLabel ?? "—",
                ]
              : []),
          ],
        })),
      }}
    >
      <RevenueChart points={points} label="Revenue chart" />
    </ChartFrame>
  );
}
