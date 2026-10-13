/**
 * The overview dashboard's view model. One function reads the dataset for the
 * chosen period and returns exactly what the page draws, so every widget is
 * computed from the same summaries and the page itself holds no business logic.
 */

import type { Dataset, DashboardMetric, ProductCategory } from "@/types/domain";
import {
  type CategoryRevenue,
  type Comparison,
  type PeriodSummary,
  categoryBreakdown,
  productPerformance,
  sourceBreakdown,
  summarizeComparison,
  summarizePeriod,
  transactionsInRange,
} from "./aggregations";
import { percentChange, roundSharesTo100, safeRatio } from "./calculations";
import {
  type AcquisitionTrendPoint,
  type CashflowPoint,
  type RevenueTrendPoint,
  acquisitionTrend,
  bucketNoun,
  cashflowSeries,
  peakPoint,
  revenueTrend,
  seriesFrame,
} from "./chart-series";
import type { DateRange, Granularity, IsoDate } from "./dates";
import { formatDateRange, formatInteger, formatMoney, formatPercent } from "./formatters";
import { OVERVIEW_METRICS, buildMetric, describeComparison, metricChange } from "./metrics";
import { sortRows } from "./filters";
import type { DateRangeState } from "./search-params";
import { type TransactionRow, toTransactionRow, transactionLookups } from "./transaction-rows";

export const RECENT_TRANSACTION_LIMIT = 6;
export const TOP_PRODUCT_LIMIT = 5;
/** Paired revenue and expense bars need room; beyond this many points they group more coarsely. */
export const CASHFLOW_MAX_POINTS = 16;

export interface CategoryShare extends CategoryRevenue {
  /** Whole percentages that add up to 100 across categories. */
  sharePercent: number;
}

export interface SourceShare {
  id: string;
  name: string;
  visitors: number;
  conversions: number;
  conversionRate: number | null;
  sharePercent: number;
}

export interface TopProduct {
  id: string;
  name: string;
  category: ProductCategory;
  revenueMinor: number;
  orders: number;
  unitsSold: number;
  /** Fraction of the period's revenue. */
  share: number;
}


export interface Overview {
  range: DateRange;
  granularity: Granularity;
  comparison: Comparison;
  comparisonLabel: string;
  dataThrough: IsoDate;
  current: PeriodSummary;
  metrics: DashboardMetric[];
  greeting: { salutation: string; summary: string };
  revenue: { points: RevenueTrendPoint[]; summary: string };
  cashflow: { points: CashflowPoint[]; granularity: Granularity; summary: string };
  acquisition: { points: AcquisitionTrendPoint[]; sources: SourceShare[]; summary: string };
  categories: CategoryShare[];
  topProducts: TopProduct[];
  recentTransactions: TransactionRow[];
}

/** Greeting for the demo's fixed clock (an ISO timestamp, read in UTC). */
export function salutationFor(isoTimestamp: string): string {
  const hour = new Date(isoTimestamp).getUTCHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** "over the last 30 days", "so far this year", "in the period Sep 10 – 24, 2026". */
export function describePeriod(state: DateRangeState): string {
  switch (state.preset) {
    case "7d":
      return "over the last 7 days";
    case "30d":
      return "over the last 30 days";
    case "90d":
      return "over the last 90 days";
    case "12m":
      return "over the last 12 months";
    case "ytd":
      return "so far this year";
    case "custom":
      return state.range.from === state.range.to
        ? `on ${formatDateRange(state.range)}`
        : `in the period ${formatDateRange(state.range)}`;
  }
}

/** Changes that round to 0.0% read as "in line" rather than "rose 0.0%". */
function isNegligible(relativeChange: number): boolean {
  return Math.abs(relativeChange) < 0.0005;
}

/** "the previous 30 days" from "vs previous 30 days". */
function comparisonPeriod(comparisonLabel: string): string {
  return `the ${comparisonLabel.replace(/^vs\s+/, "")}`;
}

/** "6.3% more than the previous 30 days", or null when there is nothing to compare. */
function revenueComparisonPhrase(current: number, previous: number | null, comparisonLabel: string): string | null {
  const change = percentChange(current, previous);
  if (change.kind === "unavailable") return null;
  if (change.kind === "new") return `up from no revenue in ${comparisonPeriod(comparisonLabel)}`;
  if (isNegligible(change.value)) return `in line with ${comparisonPeriod(comparisonLabel)}`;
  const amount = formatPercent(Math.abs(change.value));
  return `${amount} ${change.value > 0 ? "more" : "less"} than ${comparisonPeriod(comparisonLabel)}`;
}

function greetingSummary(
  workspaceName: string,
  state: DateRangeState,
  current: PeriodSummary,
  previous: PeriodSummary | null,
  comparisonLabel: string,
  leader: TopProduct | undefined,
): string {
  const period = describePeriod(state);
  if (current.orders === 0) {
    return `${workspaceName} recorded no completed orders ${period}. Try a longer date range.`;
  }
  const orders = current.orders === 1 ? "1 completed order" : `${formatInteger(current.orders)} completed orders`;
  const comparison = revenueComparisonPhrase(current.revenueMinor, previous?.revenueMinor ?? null, comparisonLabel);
  const first = `${workspaceName} earned ${formatMoney(current.revenueMinor, { whole: true })} from ${orders} ${period}${comparison ? `, ${comparison}` : ""}.`;
  return leader ? `${first} ${leader.name} led sales.` : first;
}

function revenueSummary(
  points: readonly RevenueTrendPoint[],
  granularity: Granularity,
  metric: DashboardMetric | undefined,
): string {
  const peak = peakPoint(points, (point) => point.revenueMinor);
  if (!metric || metric.value === null || metric.value === 0 || !peak) return "No revenue was recorded in this period.";
  const total = formatMoney(metric.value, { whole: true });
  const change = metricChange(metric);
  const trend =
    change.kind === "unavailable"
      ? `Revenue totalled ${total}. There is no comparison data for the previous period.`
      : change.kind === "relative" && !isNegligible(change.value)
        ? `Revenue ${change.value > 0 ? "rose" : "fell"} ${formatPercent(Math.abs(change.value))} to ${total} ${metric.comparisonLabel}.`
        : change.kind === "new"
          ? `Revenue totalled ${total}, up from none ${metric.comparisonLabel}.`
          : `Revenue totalled ${total}, in line ${metric.comparisonLabel}.`;
  if (points.length <= 1) return trend;
  return `${trend} The strongest ${bucketNoun(granularity)} was ${peak.label}, with ${formatMoney(peak.revenueMinor, { whole: true })}.`;
}

function cashflowSummary(points: readonly CashflowPoint[], current: PeriodSummary, granularity: Granularity): string {
  const expenses = formatMoney(current.expensesMinor, { whole: true });
  const profit = formatMoney(Math.abs(current.profitMinor), { whole: true });
  const margin = safeRatio(current.profitMinor, current.revenueMinor);
  const result =
    current.profitMinor >= 0
      ? `Expenses were ${expenses}, leaving a net profit of ${profit}${margin === null ? "" : ` (${formatPercent(margin)} margin)`}.`
      : `Expenses were ${expenses}, a net loss of ${profit}.`;
  if (points.length <= 1) return result;
  const ahead = points.filter((point) => point.profitMinor > 0).length;
  return `${result} Revenue exceeded expenses in ${ahead} of ${points.length} ${bucketNoun(granularity)}s.`;
}

function acquisitionSummary(current: PeriodSummary, sources: readonly SourceShare[]): string {
  if (current.newCustomers === 0) return "No new customers joined in this period.";
  const customers = current.newCustomers === 1 ? "1 new customer" : `${formatInteger(current.newCustomers)} new customers`;
  const rate = current.conversionRate === null ? "" : `, a ${formatPercent(current.conversionRate, 2)} conversion rate`;
  const leader = peakPoint(sources, (source) => source.conversions);
  const lead = leader ? ` ${leader.name} brought the most (${leader.sharePercent}%).` : "";
  return `${customers} from ${formatInteger(current.visitors)} visitors${rate}.${lead}`;
}

export function buildOverview(dataset: Dataset, state: DateRangeState, workspaceName: string): Overview {
  const { range } = state;
  const frame = seriesFrame(range);
  const current = summarizePeriod(dataset, range);
  const comparison = summarizeComparison(dataset, range, state.comparison);
  const comparisonLabel = describeComparison(state.preset, range, state.comparison);
  const metrics = OVERVIEW_METRICS.map((id) => buildMetric(id, current, comparison.summary, comparisonLabel));

  const products = productPerformance(dataset, range).filter((product) => product.revenueMinor > 0);
  const topProducts: TopProduct[] = sortRows(products, (product) => product.revenueMinor, "desc", (product) => product.id)
    .slice(0, TOP_PRODUCT_LIMIT)
    .map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      revenueMinor: product.revenueMinor,
      orders: product.orders,
      unitsSold: product.unitsSold,
      share: safeRatio(product.revenueMinor, current.revenueMinor) ?? 0,
    }));

  const categoryRows = categoryBreakdown(dataset, range);
  const categoryPercents = roundSharesTo100(categoryRows.map((row) => row.revenueMinor));
  const categories = categoryRows.map((row, index) => ({ ...row, sharePercent: categoryPercents[index] ?? 0 }));

  const sourceRows = sourceBreakdown(dataset, range);
  const sourcePercents = roundSharesTo100(sourceRows.map((row) => row.conversions));
  const sources = sourceRows.map((row, index) => ({
    id: row.id,
    name: row.name,
    visitors: row.visitors,
    conversions: row.conversions,
    conversionRate: safeRatio(row.conversions, row.visitors),
    sharePercent: sourcePercents[index] ?? 0,
  }));

  const lookups = transactionLookups(dataset);
  const recentTransactions = transactionsInRange(dataset, range)
    .slice(-RECENT_TRANSACTION_LIMIT)
    .reverse()
    .map((transaction) => toTransactionRow(transaction, lookups));

  const revenuePoints = revenueTrend(dataset, frame, state.comparison);
  const cashflowFrame = seriesFrame(range, { maxPoints: CASHFLOW_MAX_POINTS });
  const cashflowPoints = cashflowSeries(dataset, cashflowFrame);

  return {
    range,
    granularity: frame.granularity,
    comparison,
    comparisonLabel,
    dataThrough: dataset.span.to,
    current,
    metrics,
    greeting: {
      salutation: salutationFor(dataset.now),
      summary: greetingSummary(workspaceName, state, current, comparison.summary, comparisonLabel, topProducts[0]),
    },
    revenue: {
      points: revenuePoints,
      summary: revenueSummary(revenuePoints, frame.granularity, metrics[0]),
    },
    cashflow: {
      points: cashflowPoints,
      granularity: cashflowFrame.granularity,
      summary: cashflowSummary(cashflowPoints, current, cashflowFrame.granularity),
    },
    acquisition: {
      points: acquisitionTrend(dataset, frame),
      sources,
      summary: acquisitionSummary(current, sources),
    },
    categories,
    topProducts,
    recentTransactions,
  };
}
