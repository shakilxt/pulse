import type { DashboardMetric } from "@/types/domain";
import { ChangeBadge } from "@/components/dashboard/change-badge";
import { MetricInfo } from "@/components/dashboard/metric-info";
import { Panel } from "@/components/dashboard/panel";
import { changeDigits, formatDateRange, formatMetricValue } from "@/lib/formatters";
import { changeSentiment, getMetricDefinition, isMetricId, metricChange } from "@/lib/metrics";
import type { DateRange } from "@/lib/dates";

interface PeriodComparisonProps {
  metrics: readonly DashboardMetric[];
  range: DateRange;
  comparisonRange: DateRange | null;
  comparisonLabel: string;
  className?: string;
}

/** Summary statistics for every measure: this period beside the comparison, with the change in each. */
export function PeriodComparison({ metrics, range, comparisonRange, comparisonLabel, className }: PeriodComparisonProps) {
  return (
    <Panel
      id="comparison"
      title="Period comparison"
      description={comparisonRange ? `${formatDateRange(range)} ${comparisonLabel}` : `${formatDateRange(range)}, no comparison data`}
      className={className}
    >
      <div className="relative -mx-5 mt-4 overflow-x-auto sm:-mx-6">
        <table className="w-full text-sm tabular">
          <caption className="sr-only">Each measure for the period, the comparison period and the change</caption>
          <thead className="text-xs text-ink-muted">
            <tr className="border-b border-line">
              <th scope="col" className="py-2 pr-3 pl-5 text-left font-medium sm:pl-6">
                Measure
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                This period
              </th>
              <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell lg:hidden min-[90rem]:table-cell">
                Comparison
              </th>
              <th scope="col" className="py-2 pr-5 pl-3 text-right font-medium sm:pr-6">
                Change
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {metrics.map((metric) => {
              if (!isMetricId(metric.id)) return null;
              const definition = getMetricDefinition(metric.id);
              const change = metricChange(metric);
              return (
                <tr key={metric.id}>
                  <th scope="row" className="py-2.5 pr-3 pl-5 text-left font-normal text-ink sm:pl-6">
                    <span className="flex items-center gap-1">
                      {metric.label}
                      <MetricInfo label={metric.label} description={definition.description} />
                    </span>
                  </th>
                  <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap text-ink">
                    {formatMetricValue(metric.value, metric.format)}
                  </td>
                  <td className="hidden px-3 py-2.5 text-right whitespace-nowrap text-ink-muted sm:table-cell lg:hidden min-[90rem]:table-cell">
                    {formatMetricValue(metric.previousValue, metric.format)}
                  </td>
                  <td className="py-2.5 pr-5 pl-3 text-right sm:pr-6">
                    <ChangeBadge
                      change={change}
                      sentiment={changeSentiment(change, definition.polarity)}
                      digits={changeDigits(metric.format)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-muted">
        Green marks a move in the right direction: costs and refunds falling count as good news. Conversion changes are in
        percentage points.
      </p>
    </Panel>
  );
}
