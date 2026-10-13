import { Users } from "lucide-react";
import { ChangeBadge } from "@/components/dashboard/change-badge";
import { Panel } from "@/components/dashboard/panel";
import { ShareBar } from "@/components/dashboard/share-bar";
import { EmptyState } from "@/components/ui/empty-state";
import type { ChannelRow } from "@/lib/analytics";
import { percentChange } from "@/lib/calculations";
import { formatInteger, formatPercent } from "@/lib/formatters";
import { changeSentiment } from "@/lib/metrics";

interface ChannelBreakdownProps {
  rows: readonly ChannelRow[];
  summary: string;
  comparisonLabel: string;
  hasComparison: boolean;
  className?: string;
}

/**
 * New customers by acquisition channel. Five channels are more than the chart
 * palette can tell apart, so this is a ranked table with share bars rather
 * than a stacked chart.
 */
export function ChannelBreakdown({ rows, summary, comparisonLabel, hasComparison, className }: ChannelBreakdownProps) {
  const visitors = rows.reduce((total, row) => total + row.visitors, 0);
  const ranked = [...rows].sort((a, b) => b.conversions - a.conversions || a.name.localeCompare(b.name));

  return (
    <Panel
      id="channels"
      title="Acquisition channels"
      description="Where new customers came from, and how well each channel converts visitors"
      className={className}
    >
      {visitors === 0 ? (
        <EmptyState
          icon={Users}
          title="No visitors in this period"
          description="Choose a longer date range to compare channels."
          className="py-10"
        />
      ) : (
        <div className="relative -mx-5 mt-4 overflow-x-auto sm:-mx-6">
          <table className="w-full text-sm tabular">
            <caption className="sr-only">New customers, visitors and conversion rate by acquisition channel</caption>
            <thead className="text-xs text-ink-muted">
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-3 pl-5 text-left font-medium sm:pl-6">
                  Channel
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  New customers
                </th>
                <th scope="col" className="hidden px-3 py-2 text-left font-medium md:table-cell lg:hidden min-[90rem]:table-cell">
                  <span className="sr-only">Share of new customers</span>
                  <span aria-hidden>Share</span>
                </th>
                <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                  Visitors
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium max-sm:pr-5">
                  Conversion
                </th>
                {hasComparison ? (
                  <th scope="col" className="hidden py-2 pr-5 pl-3 text-right font-medium sm:table-cell sm:pr-6">
                    Change<span className="sr-only"> in new customers {comparisonLabel}</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ranked.map((row) => {
                const change = percentChange(row.conversions, row.previousConversions);
                return (
                  <tr key={row.id}>
                    <th scope="row" className="py-2.5 pr-3 pl-5 text-left font-normal whitespace-nowrap text-ink sm:pl-6">
                      {row.name}
                    </th>
                    <td className="px-3 py-2.5 text-right font-medium text-ink">
                      {formatInteger(row.conversions)}
                      <span className="ml-1.5 text-xs font-normal text-ink-muted md:hidden lg:inline min-[90rem]:hidden">{row.sharePercent}%</span>
                    </td>
                    <td className="hidden w-[28%] px-3 py-2.5 md:table-cell lg:hidden min-[90rem]:table-cell">
                      <span className="flex items-center gap-2">
                        <ShareBar fraction={row.sharePercent / 100} />
                        <span className="w-9 shrink-0 text-right text-xs text-ink-muted">{row.sharePercent}%</span>
                      </span>
                    </td>
                    <td className="hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">{formatInteger(row.visitors)}</td>
                    <td className="px-3 py-2.5 text-right text-ink max-sm:pr-5">
                      {row.conversionRate === null ? "—" : formatPercent(row.conversionRate, 2)}
                    </td>
                    {hasComparison ? (
                      <td className="hidden py-2.5 pr-5 pl-3 text-right sm:table-cell sm:pr-6">
                        <ChangeBadge change={change} sentiment={changeSentiment(change, "higher-is-better")} />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">{summary}</p>
    </Panel>
  );
}
