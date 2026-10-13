import { AcquisitionChart } from "@/components/charts/acquisition-chart";
import { ChartFrame } from "@/components/charts/chart-frame";
import { bucketNoun } from "@/lib/chart-series";
import { formatInteger, formatMetricValue, formatPercent } from "@/lib/formatters";
import type { Overview } from "@/lib/overview";
import { ShareBar } from "./share-bar";

export function AcquisitionPanel({ overview }: { overview: Overview }) {
  const { points, sources, summary } = overview.acquisition;
  const { newCustomers, conversionRate } = overview.current;

  return (
    <ChartFrame
      id="acquisition"
      title="Customer acquisition"
      description={`New customers per ${bucketNoun(overview.granularity)}`}
      className="lg:col-span-5"
      aside={
        <div className="text-right">
          <p className="text-xs text-ink-muted">New customers</p>
          <p className="text-xl font-semibold text-ink tabular">{formatInteger(newCustomers)}</p>
          <p className="text-xs text-ink-muted tabular">{formatMetricValue(conversionRate, "percentage", overview.currency)} conversion</p>
        </div>
      }
      summary={summary}
      plotClassName="h-44 sm:h-48"
      footer={<SourceList sources={sources} />}
      table={{
        caption: `New customers per ${bucketNoun(overview.granularity)}`,
        columns: [
          { label: "Period" },
          { label: "New customers", align: "end" },
          { label: "Visitors", align: "end" },
          { label: "Conversion", align: "end" },
        ],
        rows: points.map((point) => ({
          key: point.date,
          cells: [
            point.label,
            formatInteger(point.newCustomers),
            formatInteger(point.visitors),
            formatMetricValue(point.conversionRate, "percentage", overview.currency),
          ],
        })),
      }}
    >
      <AcquisitionChart points={points} label="New customers chart" />
    </ChartFrame>
  );
}

function SourceList({ sources }: { sources: Overview["acquisition"]["sources"] }) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className="text-sm font-medium text-ink">By acquisition channel</h3>
      <table className="mt-2 w-full text-sm tabular">
        <caption className="sr-only">New customers by acquisition channel</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Channel</th>
            <th scope="col">Share of new customers</th>
            <th scope="col">New customers</th>
            <th scope="col" className="hidden sm:table-cell">
              Channel conversion rate
            </th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id}>
              <th scope="row" className="w-[38%] py-1.5 pr-3 text-left font-normal text-ink">
                {source.name}
              </th>
              <td className="py-1.5 pr-3">
                <span className="flex items-center gap-2">
                  <ShareBar fraction={source.sharePercent / 100} />
                  <span className="w-9 shrink-0 text-right text-ink-muted">{source.sharePercent}%</span>
                </span>
              </td>
              <td className="py-1.5 pr-3 text-right font-medium text-ink">{formatInteger(source.conversions)}</td>
              <td className="hidden py-1.5 text-right text-xs text-ink-muted sm:table-cell">
                {source.conversionRate === null ? "—" : formatPercent(source.conversionRate, 2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
