import { ReceiptText } from "lucide-react";
import { transactionPanel } from "@/components/records/transaction-details";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { RecordDrawer, RecordDrawerTrigger } from "@/components/tables/record-drawer";
import { StatusBadge } from "@/components/tables/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatMoney } from "@/lib/formatters";
import type { CurrencyCode } from "@/lib/money";
import type { TransactionRow } from "@/lib/transaction-rows";
import { Panel, PanelLink } from "./panel";

const columnsFor = (currency: CurrencyCode): DataTableColumn<TransactionRow>[] => [
  {
    id: "id",
    header: "Transaction",
    rowHeader: true,
    cell: (row) => (
      <>
        <RecordDrawerTrigger id={row.id} label={`View transaction ${row.id}`} className="font-mono text-[13px]">
          {row.id}
        </RecordDrawerTrigger>
        <span className="block text-xs font-normal text-ink-muted sm:hidden">{row.customerName}</span>
      </>
    ),
  },
  {
    id: "customer",
    header: "Customer",
    hideBelow: "sm",
    cell: (row) => <span className="block max-w-48 truncate">{row.customerName}</span>,
  },
  { id: "product", header: "Product", hideBelow: "xl", cell: (row) => row.productName },
  { id: "date", header: "Date", hideBelow: "md", cell: (row) => <span className="whitespace-nowrap">{formatDate(row.date)}</span> },
  { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  {
    id: "amount",
    header: "Amount",
    align: "end",
    cell: (row) => <span className="font-medium tabular">{formatMoney(row.amountMinor, currency)}</span>,
  },
];

/** The latest transactions dated inside the period, newest first, each opening a detail drawer. */
export function RecentTransactions({ rows, currency }: { rows: readonly TransactionRow[]; currency: CurrencyCode }) {
  const panels = Object.fromEntries(rows.map((row) => [row.id, transactionPanel(row, currency)]));
  return (
    <Panel
      id="recent-transactions"
      title="Recent transactions"
      description="Latest activity in this period, every status included"
      className="lg:col-span-8"
      action={
        <PanelLink href="/transactions" label="View all transactions">
          View all
        </PanelLink>
      }
    >
      <div className="-mx-3 mt-4">
        <RecordDrawer panels={panels} noun="transaction">
          <DataTable
            caption="Most recent transactions in the selected period"
            columns={columnsFor(currency)}
            rows={rows}
            getRowId={(row) => row.id}
            empty={
              <EmptyState
                icon={ReceiptText}
                title="No transactions in this period"
                description="Choose a longer date range to see recent activity."
              />
            }
          />
        </RecordDrawer>
      </div>
    </Panel>
  );
}
