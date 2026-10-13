import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RecordPanel } from "@/components/tables/record-drawer";
import { StatusBadge } from "@/components/tables/status-badge";
import type { CustomerActivity, CustomerRow } from "@/lib/customers";
import { type DateRange, rangeLength } from "@/lib/dates";
import { formatDate, formatDateRange, formatInteger, formatMoney } from "@/lib/formatters";
import type { CurrencyCode } from "@/lib/money";
import { PARAM, hrefWithParams } from "@/lib/search-params";
import { DetailList, DetailRow } from "./detail-list";

function statusNote(row: CustomerRow, activeWindow: DateRange): string {
  const window = `the last ${rangeLength(activeWindow)} days of data (${formatDateRange(activeWindow)})`;
  return row.status === "active" ? `Made a purchase in ${window}.` : `No purchase in ${window}.`;
}

/** The detail drawer for one customer: lifetime figures and their latest transactions. Fictional data. */
export function customerPanel(
  row: CustomerRow,
  activity: CustomerActivity,
  activeWindow: DateRange,
  currency: CurrencyCode,
): RecordPanel {
  const transactionsHref = hrefWithParams("/transactions", "", { [PARAM.query]: row.id });
  const figures = [
    { label: "Total spend", value: formatMoney(row.totalSpendMinor, currency) },
    { label: "Orders", value: formatInteger(row.orderCount) },
    { label: "Average order", value: row.averageOrderMinor === null ? "—" : formatMoney(row.averageOrderMinor, currency) },
  ];

  return {
    eyebrow: <span className="font-mono text-xs tracking-wide">{row.id}</span>,
    title: row.name,
    description: row.email,
    content: (
      <div className="space-y-6 text-sm">
        <div>
          <StatusBadge status={row.status} />
          <p className="mt-2 text-ink-muted">{statusNote(row, activeWindow)}</p>
        </div>

        <dl className="grid grid-cols-3 divide-x divide-line rounded-lg border border-line">
          {figures.map((figure) => (
            <div key={figure.label} className="min-w-0 px-3 py-3 sm:px-4">
              <dt className="text-xs text-ink-muted">{figure.label}</dt>
              <dd className="mt-1 truncate text-base font-semibold text-ink tabular">{figure.value}</dd>
            </div>
          ))}
        </dl>
        <p className="-mt-4 text-xs text-ink-muted">Completed orders only; refunds and failed charges are left out.</p>

        <DetailList>
          <DetailRow label="First purchase">{formatDate(row.joinedAt, "long")}</DetailRow>
          <DetailRow label="Last order">{row.lastOrderAt ? formatDate(row.lastOrderAt, "long") : "No completed order"}</DetailRow>
          <DetailRow label="Acquired through">{row.channelName}</DetailRow>
        </DetailList>

        <section aria-labelledby={`${row.id}-activity`}>
          <h3 id={`${row.id}-activity`} className="text-sm font-semibold text-ink">
            Recent transactions
          </h3>
          {activity.recent.length === 0 ? (
            <p className="mt-2 text-ink-muted">No transactions yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
              {activity.recent.map((transaction) => (
                <li key={transaction.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-ink">{transaction.productName}</p>
                    <p className="mt-0.5 text-xs text-ink-muted tabular">
                      <span className="font-mono">{transaction.id}</span> · {formatDate(transaction.date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-medium text-ink tabular">{formatMoney(transaction.amountMinor, currency)}</span>
                    <StatusBadge status={transaction.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {activity.transactionCount > 0 ? (
            <Link
              href={transactionsHref}
              className="mt-3 inline-flex items-center gap-1 rounded-sm font-medium text-accent-ink hover:underline hover:underline-offset-4"
            >
              {activity.transactionCount === 1
                ? "View this transaction"
                : `View all ${formatInteger(activity.transactionCount)} transactions`}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          ) : null}
        </section>

        <p className="text-xs leading-relaxed text-ink-muted">
          Fictional customer. Email addresses use the reserved example.com domain.
        </p>
      </div>
    ),
  };
}
