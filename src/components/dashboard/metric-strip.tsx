import type { DashboardMetric } from "@/types/domain";
import { changeDigits, formatMetricValue } from "@/lib/formatters";
import type { CurrencyCode } from "@/lib/money";
import { type MetricId, changeSentiment, getMetricDefinition, isMetricId, metricChange } from "@/lib/metrics";
import { ChangeBadge } from "./change-badge";
import { MetricInfo } from "./metric-info";


/** The four headline KPIs as one ruled strip: a supporting summary, not a wall of cards. */
export function MetricStrip({ metrics, currency }: { metrics: readonly DashboardMetric[]; currency: CurrencyCode }) {
  return (
    <section aria-labelledby="kpi-title" data-pending-region="" className="lg:col-span-12">
      <h2 id="kpi-title" className="sr-only">
        Key metrics
      </h2>
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        {metrics.map((metric) =>
          isMetricId(metric.id) ? (
            <li key={metric.id} className="bg-surface">
              <MetricCard metric={metric} id={metric.id} currency={currency} />
            </li>
          ) : null,
        )}
      </ul>
    </section>
  );
}

function MetricCard({ metric, id, currency }: { metric: DashboardMetric; id: MetricId; currency: CurrencyCode }) {
  const definition = getMetricDefinition(id);
  const change = metricChange(metric);
  const digits = changeDigits(metric.format);
  return (
    <article aria-labelledby={`kpi-${metric.id}`} className="flex h-full flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 id={`kpi-${metric.id}`} className="text-sm font-medium text-ink-muted">
          {metric.label}
        </h3>
        <MetricInfo label={metric.label} description={definition.description} />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular sm:text-[28px]">
        {formatMetricValue(metric.value, metric.format, currency)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <ChangeBadge change={change} sentiment={changeSentiment(change, definition.polarity)} digits={digits} />
        <span className="text-xs text-ink-muted">{metric.comparisonLabel}</span>
      </div>
      <p className="mt-auto pt-3 text-xs text-ink-muted tabular">
        {metric.previousValue === null
          ? "No data for the comparison period"
          : `Previously ${formatMetricValue(metric.previousValue, metric.format, currency)}`}
      </p>
    </article>
  );
}
