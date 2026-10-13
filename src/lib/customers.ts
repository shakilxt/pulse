/**
 * The customer directory: search, status filter, sorting and pagination,
 * read from the URL and applied on the server, plus the recent activity the
 * detail drawer shows for each visible customer.
 */

import { ACTIVE_WINDOW_DAYS } from "@/data/generate";
import type { Customer, CustomerStatus, Dataset } from "@/types/domain";
import { type DateRange, addDays } from "./dates";
import { type PageResult, matchesSearch, paginate, sortRows, tokenize } from "./filters";
import {
  PARAM,
  type SearchParamsRecord,
  type SortState,
  parseEnumParam,
  parsePageParam,
  parseSearchParam,
  parseSortParam,
} from "./search-params";
import { type TransactionRow, toTransactionRow, transactionLookups } from "./transaction-rows";

export const CUSTOMERS_PAGE_SIZE = 15;
/** How many of a customer's latest transactions the drawer lists. */
export const RECENT_ACTIVITY_LIMIT = 5;

export const CUSTOMER_SORT_KEYS = ["name", "joined", "orders", "spend", "lastOrder"] as const;
export type CustomerSortKey = (typeof CUSTOMER_SORT_KEYS)[number];
export const CUSTOMER_DEFAULT_SORT: SortState<CustomerSortKey> = { key: "spend", direction: "desc" };

export const CUSTOMER_SORT_LABELS: Record<CustomerSortKey, { label: string; asc: string; desc: string }> = {
  name: { label: "name", asc: "A to Z", desc: "Z to A" },
  joined: { label: "first purchase", asc: "earliest first", desc: "latest first" },
  orders: { label: "orders", asc: "fewest first", desc: "most first" },
  spend: { label: "total spend", asc: "lowest first", desc: "highest first" },
  lastOrder: { label: "last order", asc: "earliest first", desc: "latest first" },
};

/** Every order a narrow screen can pick from its sort menu, where the sortable columns are hidden. */
export const CUSTOMER_SORT_OPTIONS = [
  { value: "spend.desc", label: "Highest spend" },
  { value: "spend.asc", label: "Lowest spend" },
  { value: "orders.desc", label: "Most orders" },
  { value: "orders.asc", label: "Fewest orders" },
  { value: "joined.desc", label: "Newest customers" },
  { value: "joined.asc", label: "Longest-standing" },
  { value: "lastOrder.desc", label: "Latest order" },
  { value: "lastOrder.asc", label: "Longest since last order" },
  { value: "name.asc", label: "Name, A to Z" },
  { value: "name.desc", label: "Name, Z to A" },
] as const satisfies ReadonlyArray<{ value: `${CustomerSortKey}.${"asc" | "desc"}`; label: string }>;

export const CUSTOMER_STATUS_FILTERS = ["all", "active", "inactive"] as const satisfies ReadonlyArray<
  CustomerStatus | "all"
>;
export type CustomerStatusFilter = (typeof CUSTOMER_STATUS_FILTERS)[number];

export interface CustomerQuery {
  search: string;
  status: CustomerStatusFilter;
  sort: SortState<CustomerSortKey>;
  page: number;
}

export function parseCustomerQuery(params: SearchParamsRecord): CustomerQuery {
  return {
    search: parseSearchParam(params[PARAM.query]),
    status: parseEnumParam(params[PARAM.status], CUSTOMER_STATUS_FILTERS, "all"),
    sort: parseSortParam(params[PARAM.sort], CUSTOMER_SORT_KEYS, CUSTOMER_DEFAULT_SORT),
    page: parsePageParam(params[PARAM.page]),
  };
}

export function isCustomerQueryFiltered(query: CustomerQuery): boolean {
  return query.search !== "" || query.status !== "all";
}

export interface CustomerRow extends Customer {
  channelName: string;
  /** Total spend ÷ completed orders; null before a first completed order. */
  averageOrderMinor: number | null;
}

/** The detail drawer's extra context for one customer. */
export interface CustomerActivity {
  /** Newest first, every status. */
  recent: TransactionRow[];
  /** All of the customer's transactions, every status. */
  transactionCount: number;
}

function searchFields(customer: Customer): string[] {
  return [customer.id, customer.id.replace("-", ""), customer.name, customer.email];
}

function sortValue(row: CustomerRow, key: CustomerSortKey): string | number | null {
  switch (key) {
    case "name":
      return row.name;
    case "joined":
      return row.joinedAt;
    case "orders":
      return row.orderCount;
    case "spend":
      return row.totalSpendMinor;
    case "lastOrder":
      return row.lastOrderAt;
  }
}

export interface CustomerList {
  query: CustomerQuery;
  page: PageResult<CustomerRow>;
  /** Activity for the customers on this page only, keyed by customer ID. */
  activity: Record<string, CustomerActivity>;
  statusCounts: Record<CustomerStatusFilter, number>;
  totalCount: number;
  filtered: boolean;
  /** The days a purchase must fall in for a customer to count as active. */
  activeWindow: DateRange;
}

export function listCustomers(dataset: Dataset, query: CustomerQuery): CustomerList {
  const tokens = tokenize(query.search);
  const channelNames = new Map(dataset.channels.map((channel) => [channel.id, channel.name]));
  const statusCounts: Record<CustomerStatusFilter, number> = { all: 0, active: 0, inactive: 0 };
  const matches: CustomerRow[] = [];

  for (const customer of dataset.customers) {
    if (!matchesSearch(searchFields(customer), tokens)) continue;
    statusCounts.all += 1;
    statusCounts[customer.status] += 1;
    if (query.status !== "all" && customer.status !== query.status) continue;
    matches.push({
      ...customer,
      channelName: channelNames.get(customer.acquisitionSourceId) ?? customer.acquisitionSourceId,
      averageOrderMinor: customer.orderCount > 0 ? Math.round(customer.totalSpendMinor / customer.orderCount) : null,
    });
  }

  const sorted = sortRows(matches, (row) => sortValue(row, query.sort.key), query.sort.direction, (row) => row.id);
  const page = paginate(sorted, query.page, CUSTOMERS_PAGE_SIZE);
  return {
    query,
    page,
    activity: customerActivity(dataset, page.rows.map((row) => row.id)),
    statusCounts,
    totalCount: dataset.customers.length,
    filtered: isCustomerQueryFiltered(query),
    activeWindow: { from: addDays(dataset.span.to, -(ACTIVE_WINDOW_DAYS - 1)), to: dataset.span.to },
  };
}

/** Recent transactions for a handful of customers, in one pass over the ledger. */
export function customerActivity(dataset: Dataset, customerIds: readonly string[]): Record<string, CustomerActivity> {
  const wanted = new Set(customerIds);
  const byCustomer = new Map<string, Dataset["transactions"]>();
  for (const transaction of dataset.transactions) {
    if (!wanted.has(transaction.customerId)) continue;
    const list = byCustomer.get(transaction.customerId) ?? [];
    list.push(transaction);
    byCustomer.set(transaction.customerId, list);
  }
  const lookups = transactionLookups(dataset);
  return Object.fromEntries(
    customerIds.map((id) => {
      // The ledger is in date order, so the newest are at the end.
      const transactions = byCustomer.get(id) ?? [];
      const recent = transactions
        .slice(-RECENT_ACTIVITY_LIMIT)
        .reverse()
        .map((transaction) => toTransactionRow(transaction, lookups));
      return [id, { recent, transactionCount: transactions.length }];
    }),
  );
}
