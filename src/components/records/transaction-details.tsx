import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RecordPanel } from "@/components/tables/record-drawer";
import { StatusBadge } from "@/components/tables/status-badge";
import { formatDate, formatMoney } from "@/lib/formatters";
import type { TransactionRow } from "@/lib/transaction-rows";

const STATUS_NOTES: Record<TransactionRow["status"], string> = {
  completed: "Counted in revenue for the day it was placed.",
  pending: "Awaiting settlement. Not yet counted in revenue.",
  refunded: "Refunded to the customer. Excluded from revenue and reported as a refund.",
  failed: "The charge did not go through. Excluded from revenue.",
};

/** The detail drawer for one transaction. Illustrative only: no payment is processed. */
export function transactionPanel(row: TransactionRow): RecordPanel {
  return {
    eyebrow: <span className="font-mono text-xs tracking-wide">{row.id}</span>,
    title: formatMoney(row.amountMinor),
    description: `${row.productName} for ${row.customerName}`,
    content: (
      <div className="space-y-6 text-sm">
        <div>
          <StatusBadge status={row.status} />
          <p className="mt-2 text-ink-muted">{STATUS_NOTES[row.status]}</p>
        </div>
        <dl className="divide-y divide-line rounded-lg border border-line">
          <DetailRow label="Date">{formatDate(row.date, "long")}</DetailRow>
          <DetailRow label="Product">
            {row.productName}
            {row.quantity > 1 ? <span className="text-ink-muted"> × {row.quantity}</span> : null}
          </DetailRow>
          <DetailRow label="Customer">
            <span className="block">{row.customerName}</span>
            <span className="block text-ink-muted">{row.customerEmail}</span>
          </DetailRow>
          <DetailRow label="Payment method">{row.paymentMethodLabel}</DetailRow>
          <DetailRow label="Amount">
            <span className="font-semibold tabular">{formatMoney(row.amountMinor)}</span>
          </DetailRow>
        </dl>
        <Link
          href={`/customers?q=${encodeURIComponent(row.customerId)}`}
          className="inline-flex items-center gap-1 rounded-sm font-medium text-accent-ink hover:underline hover:underline-offset-4"
        >
          View customer {row.customerId}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
        <p className="text-xs leading-relaxed text-ink-muted">Demo record. No real payment was processed.</p>
      </div>
    ),
  };
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 px-4 py-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  );
}
