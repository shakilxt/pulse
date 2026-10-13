import { Receipt } from "lucide-react";
import { Panel, PanelLink } from "@/components/dashboard/panel";
import { ShareBar } from "@/components/dashboard/share-bar";
import { StatusBadge } from "@/components/tables/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { StatusVolume } from "@/lib/analytics";
import { formatDecimal, formatInteger, formatMoney } from "@/lib/formatters";
import type { CurrencyCode } from "@/lib/money";

interface TransactionVolumeProps {
  rows: readonly StatusVolume[];
  total: number;
  summary: string;
  currency: CurrencyCode;
  className?: string;
}

/** Every charge in the period by outcome, so orders can be read against failures and refunds. */
export function TransactionVolume({ rows, total, summary, currency, className }: TransactionVolumeProps) {
  return (
    <Panel
      id="volume"
      title="Transaction volume"
      description="Charges attempted in the period, by outcome"
      action={<PanelLink href="/transactions" label="View all transactions">View all</PanelLink>}
      className={className}
    >
      <p className="mt-4 flex items-baseline gap-2">
        <span className="text-[32px] leading-none font-semibold tracking-tight text-ink tabular">{formatInteger(total)}</span>
        <span className="text-sm text-ink-muted">{total === 1 ? "charge" : "charges"}</span>
      </p>
      {total === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No charges in this period"
          description="Choose a longer date range to see transaction outcomes."
          className="py-8"
        />
      ) : (
        <table className="mt-4 w-full text-sm tabular">
          <caption className="sr-only">Charges by status: count, share of all charges and value</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Status</th>
              <th scope="col">Share of charges</th>
              <th scope="col">Charges</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.status}>
                <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                  <StatusBadge status={row.status} />
                </th>
                <td className="w-full py-2.5 pr-3">
                  <span className="flex items-center gap-2">
                    <ShareBar fraction={row.sharePercent / 100} size="sm" />
                    <span className="w-11 shrink-0 text-right text-xs text-ink-muted">{formatDecimal(row.sharePercent)}%</span>
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right font-medium text-ink">{formatInteger(row.count)}</td>
                <td className="py-2.5 text-right whitespace-nowrap text-ink-muted">{formatMoney(row.amountMinor, currency, { whole: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">{summary}</p>
    </Panel>
  );
}
