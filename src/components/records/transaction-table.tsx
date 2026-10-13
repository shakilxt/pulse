import { DateFilter } from "@/components/filters/date-filter";
import { FilterMenu, type FilterOption } from "@/components/filters/filter-menu";
import { SearchInput } from "@/components/filters/search-input";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Pagination } from "@/components/tables/pagination";
import { RecordDrawer, RecordDrawerTrigger } from "@/components/tables/record-drawer";
import { STATUS_META, StatusBadge } from "@/components/tables/status-badge";
import { TableToolbar } from "@/components/tables/table-toolbar";
import type { DateRange } from "@/lib/dates";
import { formatDate, formatInteger, formatMoney } from "@/lib/formatters";
import { PARAM, hrefWithParams, nextSort, serializeSort, sortToParam } from "@/lib/search-params";
import type { TransactionRow } from "@/lib/transaction-rows";
import {
  TRANSACTION_DEFAULT_SORT,
  TRANSACTION_SORT_LABELS,
  TRANSACTION_SORT_OPTIONS,
  TRANSACTION_STATUS_FILTERS,
  type TransactionList,
  type TransactionSortKey,
  type TransactionStatusFilter,
} from "@/lib/transactions";
import { NoMatchingRecords, RecordsView } from "./records-view";
import { transactionPanel } from "./transaction-details";

const PATH = "/transactions";

const COLUMNS: DataTableColumn<TransactionRow, TransactionSortKey>[] = [
  {
    id: "id",
    header: "Transaction",
    rowHeader: true,
    cell: (row) => (
      <>
        <RecordDrawerTrigger id={row.id} label={`View transaction ${row.id}`} className="font-mono text-[13px]">
          {row.id}
        </RecordDrawerTrigger>
        {/* Narrow screens fold the hidden columns into the row header. */}
        <span className="block max-w-44 truncate text-xs font-normal text-ink-muted sm:hidden">{row.customerName}</span>
        <span className="block text-xs font-normal whitespace-nowrap text-ink-muted md:hidden">{formatDate(row.date)}</span>
      </>
    ),
  },
  {
    id: "customer",
    header: "Customer",
    sortKey: "customer",
    hideBelow: "sm",
    cell: (row) => (
      <>
        <span className="block max-w-52 truncate">{row.customerName}</span>
        <span className="block max-w-52 truncate text-xs text-ink-muted">{row.customerEmail}</span>
      </>
    ),
  },
  {
    id: "date",
    header: "Date",
    sortKey: "date",
    initialDirection: "desc",
    hideBelow: "md",
    cell: (row) => <span className="whitespace-nowrap">{formatDate(row.date)}</span>,
  },
  {
    id: "product",
    header: "Product",
    hideBelow: "wide",
    cell: (row) => <span className="block max-w-48 truncate">{row.productName}</span>,
  },
  {
    id: "method",
    header: "Payment method",
    hideBelow: "lg",
    cell: (row) => <span className="whitespace-nowrap text-ink-muted">{row.paymentMethodLabel}</span>,
  },
  { id: "status", header: "Status", hideBelow: "sm", cell: (row) => <StatusBadge status={row.status} /> },
  {
    id: "amount",
    header: "Amount",
    sortKey: "amount",
    initialDirection: "desc",
    align: "end",
    cell: (row) => (
      <span className="flex flex-col items-end gap-1">
        <span className="font-medium whitespace-nowrap tabular">{formatMoney(row.amountMinor)}</span>
        <StatusBadge status={row.status} className="sm:hidden" />
      </span>
    ),
  },
];

interface TransactionTableProps {
  list: TransactionList;
  /** The current query string, so links keep every other parameter. */
  search: string;
  bounds: DateRange;
}

/** The transaction history: filters, a summary of the filtered rows, the table, its drawers and pagination. */
export function TransactionTable({ list, search, bounds }: TransactionTableProps) {
  const { query, page, statusCounts } = list;
  const resetHref = hrefWithParams(PATH, search, {
    [PARAM.query]: null,
    [PARAM.status]: null,
    [PARAM.range]: null,
    [PARAM.from]: null,
    [PARAM.to]: null,
    [PARAM.page]: null,
  });
  const sortLabel = TRANSACTION_SORT_LABELS[query.sort.key];
  const statusOptions: FilterOption<TransactionStatusFilter>[] = TRANSACTION_STATUS_FILTERS.map((status) => {
    const meta = status === "all" ? null : STATUS_META[status];
    return {
      value: status,
      label: meta?.label ?? "All",
      icon: meta ? <meta.icon aria-hidden /> : undefined,
      count: formatInteger(statusCounts[status]),
    };
  });
  const sortOption =
    TRANSACTION_SORT_OPTIONS.find((option) => option.value === serializeSort(query.sort))?.value ?? "date.desc";
  const panels = Object.fromEntries(page.rows.map((row) => [row.id, transactionPanel(row)]));

  return (
    <RecordsView
      label="Transactions"
      toolbar={
        <TableToolbar
          search={
            <SearchInput
              value={query.search}
              label="Search transactions"
              placeholder="Search ID, customer, product or payment"
            />
          }
          filters={
            <>
              <FilterMenu
                label="Status"
                param={PARAM.status}
                options={statusOptions}
                value={query.status}
                defaultValue="all"
                className="max-sm:flex-1"
              />
              <DateFilter value={query.dates} bounds={bounds} className="max-sm:flex-1" />
              {/* The date and customer columns are hidden below md, so their sorts move into a menu. */}
              <FilterMenu
                label="Sort"
                param={PARAM.sort}
                highlightActive={false}
                options={TRANSACTION_SORT_OPTIONS}
                value={sortOption}
                defaultValue={serializeSort(TRANSACTION_DEFAULT_SORT)}
                className="max-sm:flex-1 md:hidden"
              />
            </>
          }
          resetHref={resetHref}
          filtersActive={list.filtered}
        />
      }
      summary={
        <>
          <p>
            <span className="font-semibold text-ink">{formatInteger(page.totalRows)}</span>{" "}
            {list.filtered ? `of ${formatInteger(list.totalCount)} ` : ""}
            {page.totalRows === 1 ? "transaction" : "transactions"}
          </p>
          <p>
            Completed value <span className="font-semibold text-ink">{formatMoney(list.completedMinor, { whole: true })}</span>
          </p>
        </>
      }
      pagination={
        <Pagination
          page={page}
          noun="transactions"
          pageHref={(target) => hrefWithParams(PATH, search, { [PARAM.page]: target === 1 ? null : String(target) })}
        />
      }
    >
      <RecordDrawer panels={panels} noun="transaction">
        <DataTable
          caption={`Transactions sorted by ${sortLabel.label}, ${sortLabel[query.sort.direction]}${list.filtered ? ", filtered" : ""}`}
          columns={COLUMNS}
          rows={page.rows}
          getRowId={(row) => row.id}
          sort={query.sort}
          sortHref={(key, initial) =>
            hrefWithParams(PATH, search, {
              [PARAM.sort]: sortToParam(nextSort(query.sort, key, initial), TRANSACTION_DEFAULT_SORT),
              [PARAM.page]: null,
            })
          }
          empty={
            <NoMatchingRecords
              noun="transactions"
              hint="Try another search term, choose a different status or widen the dates."
              resetHref={resetHref}
            />
          }
        />
      </RecordDrawer>
    </RecordsView>
  );
}
