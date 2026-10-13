/**
 * The transaction history view: search, status and date filters, sorting and
 * pagination, all read from the URL and applied on the server.
 */

import { TRANSACTION_STATUSES, type Dataset } from "@/types/domain";
import { isWithinRange } from "./dates";
import { type PageResult, matchesSearch, paginate, sortRows, tokenize } from "./filters";
import {
  ALL_DATES,
  type DateFilterState,
  PARAM,
  type SearchParamsRecord,
  type SortState,
  parseDateFilterParams,
  parseEnumParam,
  parsePageParam,
  parseSearchParam,
  parseSortParam,
} from "./search-params";
import { type TransactionRow, toTransactionRow, transactionLookups } from "./transaction-rows";

export const TRANSACTIONS_PAGE_SIZE = 15;

export const TRANSACTION_SORT_KEYS = ["date", "customer", "amount"] as const;
export type TransactionSortKey = (typeof TRANSACTION_SORT_KEYS)[number];
export const TRANSACTION_DEFAULT_SORT: SortState<TransactionSortKey> = { key: "date", direction: "desc" };

/** How each sort reads in the table caption: "sorted by date, newest first". */
export const TRANSACTION_SORT_LABELS: Record<TransactionSortKey, { label: string; asc: string; desc: string }> = {
  date: { label: "date", asc: "oldest first", desc: "newest first" },
  customer: { label: "customer", asc: "A to Z", desc: "Z to A" },
  amount: { label: "amount", asc: "smallest first", desc: "largest first" },
};

/** Every order a narrow screen can pick from its sort menu, where the sortable columns are hidden. */
export const TRANSACTION_SORT_OPTIONS = [
  { value: "date.desc", label: "Newest first" },
  { value: "date.asc", label: "Oldest first" },
  { value: "amount.desc", label: "Largest amount" },
  { value: "amount.asc", label: "Smallest amount" },
  { value: "customer.asc", label: "Customer, A to Z" },
  { value: "customer.desc", label: "Customer, Z to A" },
] as const satisfies ReadonlyArray<{ value: `${TransactionSortKey}.${"asc" | "desc"}`; label: string }>;

export const TRANSACTION_STATUS_FILTERS = ["all", ...TRANSACTION_STATUSES] as const;
export type TransactionStatusFilter = (typeof TRANSACTION_STATUS_FILTERS)[number];

export interface TransactionQuery {
  search: string;
  status: TransactionStatusFilter;
  dates: DateFilterState;
  sort: SortState<TransactionSortKey>;
  page: number;
}

export function parseTransactionQuery(params: SearchParamsRecord, dataset: Pick<Dataset, "span">): TransactionQuery {
  return {
    search: parseSearchParam(params[PARAM.query]),
    status: parseEnumParam(params[PARAM.status], TRANSACTION_STATUS_FILTERS, "all"),
    dates: parseDateFilterParams(params, dataset.span),
    sort: parseSortParam(params[PARAM.sort], TRANSACTION_SORT_KEYS, TRANSACTION_DEFAULT_SORT),
    page: parsePageParam(params[PARAM.page]),
  };
}

/** True while any filter narrows the rows. Sorting reorders them and does not count. */
export function isTransactionQueryFiltered(query: TransactionQuery): boolean {
  return query.search !== "" || query.status !== "all" || query.dates.preset !== ALL_DATES;
}

/** The fields a search looks in. IDs also match without their hyphen ("tx100231"). */
function searchFields(row: TransactionRow): string[] {
  return [
    row.id,
    row.id.replace("-", ""),
    row.customerId,
    row.customerName,
    row.customerEmail,
    row.productName,
    row.paymentMethodLabel,
  ];
}

function sortValue(row: TransactionRow, key: TransactionSortKey): string | number {
  switch (key) {
    // IDs follow the ledger order, so they break same-day ties chronologically.
    case "date":
      return `${row.date} ${row.id}`;
    case "customer":
      return row.customerName;
    case "amount":
      return row.amountMinor;
  }
}

export interface TransactionList {
  query: TransactionQuery;
  page: PageResult<TransactionRow>;
  /** Rows per status under the current search and dates, so the status menu can preview each choice. */
  statusCounts: Record<TransactionStatusFilter, number>;
  /** Value of the completed transactions among all filtered rows, not just this page. */
  completedMinor: number;
  /** Every transaction in the dataset, for "12 of 7,984". */
  totalCount: number;
  filtered: boolean;
}

export function listTransactions(dataset: Dataset, query: TransactionQuery): TransactionList {
  const lookups = transactionLookups(dataset);
  const tokens = tokenize(query.search);

  const statusCounts: Record<TransactionStatusFilter, number> = { all: 0, completed: 0, pending: 0, refunded: 0, failed: 0 };
  const matches: TransactionRow[] = [];
  let completedMinor = 0;

  for (const transaction of dataset.transactions) {
    if (!isWithinRange(transaction.date, query.dates.range)) continue;
    const row = toTransactionRow(transaction, lookups);
    if (!matchesSearch(searchFields(row), tokens)) continue;
    statusCounts.all += 1;
    statusCounts[row.status] += 1;
    if (query.status !== "all" && row.status !== query.status) continue;
    matches.push(row);
    if (row.status === "completed") completedMinor += row.amountMinor;
  }

  const sorted = sortRows(matches, (row) => sortValue(row, query.sort.key), query.sort.direction, (row) => row.id);
  return {
    query,
    page: paginate(sorted, query.page, TRANSACTIONS_PAGE_SIZE),
    statusCounts,
    completedMinor,
    totalCount: dataset.transactions.length,
    filtered: isTransactionQueryFiltered(query),
  };
}
