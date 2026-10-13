/**
 * Range queries over the dataset. Every chart, KPI, breakdown and report reads
 * through these functions, so a figure shown in two places is always computed
 * the same way.
 *
 * Daily totals are precomputed once into prefix sums, which makes any range
 * total an O(1) lookup; only distinct-customer counts scan the ledger.
 */

import type {
  AcquisitionSource,
  Dataset,
  ProductCategory,
  ProductPerformance,
  RevenueDataPoint,
  Transaction,
} from "@/types/domain";
import { safeRatio } from "./calculations";
import {
  type ComparisonMode,
  type DateBucket,
  type DateRange,
  type IsoDate,
  clampRange,
  diffDays,
  getComparisonRange,
} from "./dates";
import { averageMinor } from "./money";

type TotalField =
  | "revenueMinor"
  | "orders"
  | "unitsSold"
  | "refundsMinor"
  | "refundCount"
  | "failedCount"
  | "pendingCount"
  | "expensesMinor"
  | "newCustomers"
  | "visitors";

/** Additive totals for a range: summing two adjacent ranges gives the combined range. */
export type PeriodTotals = Record<TotalField, number>;

export interface PeriodSummary extends PeriodTotals {
  range: DateRange;
  profitMinor: number;
  /** Distinct customers with at least one completed order in the range. */
  activeCustomers: number;
  /** New customers ÷ visitors; null without visitors. */
  conversionRate: number | null;
  averageOrderValueMinor: number | null;
}

interface DatasetIndex {
  span: DateRange;
  totals: Record<TotalField, Float64Array>;
  sourceVisitors: Map<string, Float64Array>;
  sourceConversions: Map<string, Float64Array>;
  productRevenue: Map<string, Float64Array>;
  productOrders: Map<string, Float64Array>;
  productUnits: Map<string, Float64Array>;
  productViews: Map<string, Float64Array>;
}

const indexes = new WeakMap<Dataset, DatasetIndex>();

/** Builds a record with one entry per total field, keeping the field names type-checked. */
function byField<V>(build: (field: TotalField) => V): Record<TotalField, V> {
  return {
    revenueMinor: build("revenueMinor"),
    orders: build("orders"),
    unitsSold: build("unitsSold"),
    refundsMinor: build("refundsMinor"),
    refundCount: build("refundCount"),
    failedCount: build("failedCount"),
    pendingCount: build("pendingCount"),
    expensesMinor: build("expensesMinor"),
    newCustomers: build("newCustomers"),
    visitors: build("visitors"),
  };
}

/** Turns daily values into prefix sums: sums[i] is the total of days before i. */
function toPrefixSums(daily: Float64Array): Float64Array {
  const sums = new Float64Array(daily.length + 1);
  for (let i = 0; i < daily.length; i++) sums[i + 1] = (sums[i] ?? 0) + (daily[i] ?? 0);
  return sums;
}

function getIndex(dataset: Dataset): DatasetIndex {
  const cached = indexes.get(dataset);
  if (cached) return cached;

  const length = diffDays(dataset.span.from, dataset.span.to) + 1;
  const dayIndex = (date: IsoDate) => diffDays(dataset.span.from, date);
  const daily = () => new Float64Array(length);
  const keyed = (ids: readonly string[]) => new Map(ids.map((id) => [id, daily()]));

  const totals = byField(() => daily());
  const sourceIds = dataset.channels.map((channel) => channel.id);
  const productIds = dataset.products.map((product) => product.id);
  const sourceVisitors = keyed(sourceIds);
  const sourceConversions = keyed(sourceIds);
  const productRevenue = keyed(productIds);
  const productOrders = keyed(productIds);
  const productUnits = keyed(productIds);
  const productViews = keyed(productIds);

  const add = (series: Float64Array | undefined, date: IsoDate, amount: number) => {
    const index = dayIndex(date);
    if (series && index >= 0 && index < length) series[index] = (series[index] ?? 0) + amount;
  };

  for (const transaction of dataset.transactions) {
    const { date, amountMinor, productId, quantity } = transaction;
    switch (transaction.status) {
      case "completed":
        add(totals.revenueMinor, date, amountMinor);
        add(totals.orders, date, 1);
        add(totals.unitsSold, date, quantity);
        add(productRevenue.get(productId), date, amountMinor);
        add(productOrders.get(productId), date, 1);
        add(productUnits.get(productId), date, quantity);
        break;
      case "refunded":
        add(totals.refundsMinor, date, amountMinor);
        add(totals.refundCount, date, 1);
        break;
      case "failed":
        add(totals.failedCount, date, 1);
        break;
      case "pending":
        add(totals.pendingCount, date, 1);
        break;
    }
  }
  for (const customer of dataset.customers) {
    add(totals.newCustomers, customer.joinedAt, 1);
    add(sourceConversions.get(customer.acquisitionSourceId), customer.joinedAt, 1);
  }
  for (const row of dataset.traffic) {
    add(totals.visitors, row.date, row.visitors);
    add(sourceVisitors.get(row.sourceId), row.date, row.visitors);
  }
  for (const row of dataset.productViews) add(productViews.get(row.productId), row.date, row.views);
  for (const row of dataset.expenses) add(totals.expensesMinor, row.date, row.amountMinor);

  const prefixAll = (map: Map<string, Float64Array>) =>
    new Map([...map].map(([id, series]) => [id, toPrefixSums(series)]));

  const index: DatasetIndex = {
    span: dataset.span,
    totals: byField((field) => toPrefixSums(totals[field])),
    sourceVisitors: prefixAll(sourceVisitors),
    sourceConversions: prefixAll(sourceConversions),
    productRevenue: prefixAll(productRevenue),
    productOrders: prefixAll(productOrders),
    productUnits: prefixAll(productUnits),
    productViews: prefixAll(productViews),
  };
  indexes.set(dataset, index);
  return index;
}

/** Sum over the part of `range` that lies inside the data span (zero outside it). */
function rangeSum(index: DatasetIndex, sums: Float64Array | undefined, range: DateRange): number {
  const clamped = clampRange(range, index.span);
  if (!sums || !clamped) return 0;
  const start = diffDays(index.span.from, clamped.from);
  const end = diffDays(index.span.from, clamped.to) + 1;
  return (sums[end] ?? 0) - (sums[start] ?? 0);
}

// ---------------------------------------------------------------------------
// Periods

export function totalsForRange(dataset: Dataset, range: DateRange): PeriodTotals {
  const index = getIndex(dataset);
  return byField((field) => rangeSum(index, index.totals[field], range));
}

function lowerBound(transactions: readonly Transaction[], date: IsoDate): number {
  let low = 0;
  let high = transactions.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if ((transactions[middle]?.date ?? "") < date) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** Transactions dated inside the range, in ledger order. */
export function transactionsInRange(dataset: Dataset, range: DateRange): Transaction[] {
  const start = lowerBound(dataset.transactions, range.from);
  const end = lowerBound(dataset.transactions, `${range.to}￿`);
  return dataset.transactions.slice(start, end);
}

export function summarizePeriod(dataset: Dataset, range: DateRange): PeriodSummary {
  const totals = totalsForRange(dataset, range);
  const activeCustomers = new Set(
    transactionsInRange(dataset, range)
      .filter((transaction) => transaction.status === "completed")
      .map((transaction) => transaction.customerId),
  ).size;
  return {
    ...totals,
    range,
    profitMinor: totals.revenueMinor - totals.expensesMinor,
    activeCustomers,
    conversionRate: safeRatio(totals.newCustomers, totals.visitors),
    averageOrderValueMinor: averageMinor(totals.revenueMinor, totals.orders),
  };
}

/** True when the dataset covers every day of the range. */
export function isFullyCovered(dataset: Dataset, range: DateRange): boolean {
  return range.from >= dataset.span.from && range.to <= dataset.span.to;
}

export interface Comparison {
  range: DateRange;
  /** Null when the comparison period reaches outside the data, so partial periods are never compared. */
  summary: PeriodSummary | null;
}

export function summarizeComparison(dataset: Dataset, range: DateRange, mode: ComparisonMode): Comparison {
  const comparisonRange = getComparisonRange(range, mode);
  return {
    range: comparisonRange,
    summary: isFullyCovered(dataset, comparisonRange) ? summarizePeriod(dataset, comparisonRange) : null,
  };
}

// ---------------------------------------------------------------------------
// Series

export interface BucketTotals extends PeriodTotals {
  bucket: DateBucket;
}

export function totalsByBucket(dataset: Dataset, buckets: readonly DateBucket[]): BucketTotals[] {
  return buckets.map((bucket) => ({
    bucket,
    ...totalsForRange(dataset, { from: bucket.start, to: bucket.end }),
  }));
}

export function revenueSeries(dataset: Dataset, buckets: readonly DateBucket[]): RevenueDataPoint[] {
  return totalsByBucket(dataset, buckets).map(({ bucket, revenueMinor, expensesMinor, orders }) => ({
    date: bucket.start,
    revenueMinor,
    expensesMinor,
    orders,
  }));
}

export interface AcquisitionPoint {
  date: IsoDate;
  newCustomers: number;
  visitors: number;
  bySource: Record<string, number>;
}

export function acquisitionSeries(dataset: Dataset, buckets: readonly DateBucket[]): AcquisitionPoint[] {
  const index = getIndex(dataset);
  return buckets.map((bucket) => {
    const range = { from: bucket.start, to: bucket.end };
    const bySource = Object.fromEntries(
      dataset.channels.map((channel) => [
        channel.id,
        rangeSum(index, index.sourceConversions.get(channel.id), range),
      ]),
    );
    return {
      date: bucket.start,
      newCustomers: rangeSum(index, index.totals.newCustomers, range),
      visitors: rangeSum(index, index.totals.visitors, range),
      bySource,
    };
  });
}

// ---------------------------------------------------------------------------
// Breakdowns

/** Visitors and new customers per acquisition channel, in catalogue order. */
export function sourceBreakdown(dataset: Dataset, range: DateRange): AcquisitionSource[] {
  const index = getIndex(dataset);
  const rows = dataset.channels.map((channel) => ({
    id: channel.id,
    name: channel.name,
    visitors: rangeSum(index, index.sourceVisitors.get(channel.id), range),
    conversions: rangeSum(index, index.sourceConversions.get(channel.id), range),
  }));
  const totalConversions = rows.reduce((sum, row) => sum + row.conversions, 0);
  return rows.map((row) => ({ ...row, share: safeRatio(row.conversions, totalConversions) ?? 0 }));
}

/** Sales per product for the range, in catalogue order. */
export function productPerformance(dataset: Dataset, range: DateRange): ProductPerformance[] {
  const index = getIndex(dataset);
  return dataset.products.map((product) => {
    const orders = rangeSum(index, index.productOrders.get(product.id), range);
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      unitsSold: rangeSum(index, index.productUnits.get(product.id), range),
      orders,
      revenueMinor: rangeSum(index, index.productRevenue.get(product.id), range),
      conversionRate: safeRatio(orders, rangeSum(index, index.productViews.get(product.id), range)),
    };
  });
}

export interface CategoryRevenue {
  category: ProductCategory;
  revenueMinor: number;
  orders: number;
  /** Fraction of the range's revenue. */
  share: number;
}

/** Revenue per product category, in the order categories first appear in the catalogue. */
export function categoryBreakdown(dataset: Dataset, range: DateRange): CategoryRevenue[] {
  const byCategory = new Map<ProductCategory, { revenueMinor: number; orders: number }>();
  for (const product of productPerformance(dataset, range)) {
    const entry = byCategory.get(product.category) ?? { revenueMinor: 0, orders: 0 };
    entry.revenueMinor += product.revenueMinor;
    entry.orders += product.orders;
    byCategory.set(product.category, entry);
  }
  const total = [...byCategory.values()].reduce((sum, entry) => sum + entry.revenueMinor, 0);
  return [...byCategory].map(([category, entry]) => ({
    category,
    ...entry,
    share: safeRatio(entry.revenueMinor, total) ?? 0,
  }));
}
