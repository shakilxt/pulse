/**
 * The analytics page's view model. It reads the dataset for the chosen period,
 * comparison and chart metric, and returns exactly what the page draws, with
 * every figure taken from the same summaries as the overview's KPIs.
 */

import { TRANSACTION_STATUSES, type Dataset, type DashboardMetric, type TransactionStatus } from "@/types/domain";
import {
  type Comparison,
  type PeriodSummary,
  summarizeComparison,
  summarizePeriod,
  transactionsInRange,
} from "./aggregations";
import { roundSharesTo100 } from "./calculations";
import {
  type CashflowPoint,
  type TrendPoint,
  bucketNoun,
  cashflowSeries,
  metricTrend,
  peakPoint,
  seriesFrame,
  trendExtremes,
} from "./chart-series";
import { type ComparisonMode, type DateRange, type Granularity, type IsoDate, type RangePreset, rangeLength } from "./dates";
import { formatDateRange, formatDecimal, formatInteger, formatMetricValue, formatMoney, formatPercent } from "./formatters";
import {
  type MetricId,
  type TrendMetricId,
  TREND_METRICS,
  TREND_METRIC_VALUES,
  buildMetric,
  comparisonSeriesName,
  describeComparison,
} from "./metrics";
import type { CurrencyCode } from "./money";
import { CASHFLOW_MAX_POINTS, type SourceShare, sourceShares } from "./overview";
import { type DateRangeState, type SearchParamValue, parseEnumParam } from "./search-params";
import { cashflowSummary, isEmptyTrend, trendSummary } from "./summaries";

/** A longer default than the overview: weekly points over a quarter show trends rather than daily noise. */
export const ANALYTICS_DEFAULT_PRESET: RangePreset = "90d";
export const DEFAULT_TREND_METRIC: TrendMetricId = "revenue";

/** Short names for the chart's metric selector. */
export const TREND_METRIC_LABELS: Record<TrendMetricId, string> = {
  revenue: "Revenue",
  orders: "Orders",
  newCustomers: "New customers",
  conversionRate: "Conversion rate",
};

/** Every measure in the period comparison table, grouped as sales, customers, then costs. */
export const COMPARISON_TABLE_METRICS = [
  "revenue",
  "orders",
  "averageOrderValue",
  "refunds",
  "activeCustomers",
  "newCustomers",
  "visitors",
  "conversionRate",
  "expenses",
  "profit",
] as const satisfies readonly MetricId[];

/** `?metric=` for the trend chart; anything unknown is revenue. */
export function parseTrendMetric(value: SearchParamValue): TrendMetricId {
  return parseEnumParam(value, TREND_METRICS, DEFAULT_TREND_METRIC);
}

/** One line of summary statistics, formatted for display. */
export interface MetricStat {
  label: string;
  value: string;
  detail: string | null;
}

export interface ChannelRow extends SourceShare {
  /** New customers from this channel in the comparison period; null without comparison data. */
  previousConversions: number | null;
}

export interface StatusVolume {
  status: TransactionStatus;
  count: number;
  amountMinor: number;
  /** Share of all charges, to one decimal; the rows add up to 100. */
  sharePercent: number;
}

export interface Analytics {
  /** The display currency every money figure and summary is written in. */
  currency: CurrencyCode;
  range: DateRange;
  granularity: Granularity;
  comparison: Comparison;
  comparisonMode: ComparisonMode;
  comparisonLabel: string;
  dataThrough: IsoDate;
  current: PeriodSummary;
  /** The chartable metrics, in selector order, with their values and changes. */
  selector: Array<{ id: TrendMetricId; metric: DashboardMetric }>;
  trend: {
    metric: TrendMetricId;
    label: string;
    format: DashboardMetric["format"];
    variant: "area" | "line";
    points: TrendPoint[];
    peakDate: IsoDate | null;
    summary: string;
    empty: boolean;
    stats: MetricStat[];
    statsNote: string | null;
  };
  comparisonTable: DashboardMetric[];
  cashflow: { points: CashflowPoint[]; granularity: Granularity; summary: string };
  channels: { rows: ChannelRow[]; summary: string };
  volume: { rows: StatusVolume[]; total: number; summary: string };
}

function trendStats({
  id,
  metric,
  current,
  points,
  granularity,
  comparison,
  mode,
  extremes,
  currency,
}: {
  id: TrendMetricId;
  metric: DashboardMetric;
  current: PeriodSummary;
  points: readonly TrendPoint[];
  granularity: Granularity;
  comparison: Comparison;
  mode: ComparisonMode;
  extremes: ReturnType<typeof trendExtremes>;
  currency: CurrencyCode;
}): MetricStat[] {
  const format = (value: number | null) => formatMetricValue(value, metric.format, currency);
  const sum = TREND_METRIC_VALUES[id].aggregation === "sum";
  const noun = bucketNoun(granularity);
  const stats: MetricStat[] = [];

  if (sum) {
    const days = rangeLength(current.range);
    const average = (metric.value ?? 0) / days;
    stats.push(
      { label: "Total", value: format(metric.value), detail: null },
      {
        label: "Daily average",
        value: metric.format === "currency" ? formatMoney(average, currency, { whole: true }) : formatDecimal(average),
        detail: days === 1 ? "over 1 day" : `over ${formatInteger(days)} days`,
      },
    );
  } else {
    stats.push({
      label: "For the period",
      value: format(metric.value),
      detail: `${formatInteger(current.newCustomers)} new customers from ${formatInteger(current.visitors)} visitors`,
    });
  }

  const { highest, lowest } = extremes;
  if (points.length > 1 && highest && lowest && !isEmptyTrend(id, metric)) {
    stats.push(
      { label: `${sum ? "Strongest" : "Highest"} ${noun}`, value: format(highest.value), detail: highest.label },
      { label: `${sum ? "Weakest" : "Lowest"} ${noun}`, value: format(lowest.value), detail: lowest.label },
    );
  }

  stats.push({
    label: comparisonSeriesName(mode),
    value: format(metric.previousValue),
    detail: comparison.summary ? formatDateRange(comparison.range) : "No data for this period",
  });
  return stats;
}

function channelSummary(rows: readonly ChannelRow[], newCustomers: number): string {
  if (newCustomers === 0) return "No new customers joined in this period.";
  const leader = peakPoint(rows, (row) => row.conversions);
  const best = peakPoint(
    rows.filter((row) => row.conversionRate !== null),
    (row) => row.conversionRate ?? 0,
  );
  if (!leader) return "No new customers joined in this period.";
  const lead = `${leader.name} brought the most new customers (${leader.sharePercent}%)`;
  if (!best || best.conversionRate === null) return `${lead}.`;
  const rate = formatPercent(best.conversionRate, 2);
  return best.id === leader.id
    ? `${lead} and converted best, at ${rate}.`
    : `${lead}. ${best.name} converted visitors best, at ${rate}.`;
}

function statusVolume(dataset: Dataset, range: DateRange): StatusVolume[] {
  const totals = new Map<TransactionStatus, { count: number; amountMinor: number }>(
    TRANSACTION_STATUSES.map((status) => [status, { count: 0, amountMinor: 0 }]),
  );
  for (const transaction of transactionsInRange(dataset, range)) {
    const entry = totals.get(transaction.status);
    if (entry) {
      entry.count += 1;
      entry.amountMinor += transaction.amountMinor;
    }
  }
  const counts = TRANSACTION_STATUSES.map((status) => totals.get(status)?.count ?? 0);
  const shares = roundSharesTo100(counts, 1);
  return TRANSACTION_STATUSES.map((status, index) => ({
    status,
    count: counts[index] ?? 0,
    amountMinor: totals.get(status)?.amountMinor ?? 0,
    sharePercent: shares[index] ?? 0,
  }));
}

function volumeSummary(rows: readonly StatusVolume[], total: number): string {
  if (total === 0) return "No charges were attempted in this period.";
  const share = (status: TransactionStatus) => {
    const row = rows.find((candidate) => candidate.status === status);
    return row && row.count > 0 ? `${formatDecimal(row.sharePercent)}%` : "none";
  };
  const charges = total === 1 ? "1 charge was" : `${formatInteger(total)} charges were`;
  return `${charges} attempted: ${share("completed")} completed, ${share("pending")} ${share("pending") === "none" ? "is" : "are"} pending, ${share("refunded")} ${share("refunded") === "none" ? "was" : "were"} refunded and ${share("failed")} failed.`;
}

export function buildAnalytics(
  dataset: Dataset,
  state: DateRangeState,
  metricId: TrendMetricId,
  currency: CurrencyCode,
): Analytics {
  const { range, comparison: mode } = state;
  const frame = seriesFrame(range);
  const current = summarizePeriod(dataset, range);
  const comparison = summarizeComparison(dataset, range, mode);
  const comparisonLabel = describeComparison(state.preset, range, mode);
  const metricFor = (id: MetricId) => buildMetric(id, current, comparison.summary, comparisonLabel);

  const selector = TREND_METRICS.map((id) => ({ id, metric: metricFor(id) }));
  const metric = metricFor(metricId);
  const { aggregation, value } = TREND_METRIC_VALUES[metricId];
  const points = metricTrend(dataset, frame, mode, value);
  const extremes = trendExtremes(points, { fullBucketsOnly: aggregation === "sum" });
  const empty = isEmptyTrend(metricId, metric);

  const sources = sourceShares(dataset, range);
  const previousSources = comparison.summary ? sourceShares(dataset, comparison.range) : null;
  const channels = sources.map((row) => ({
    ...row,
    previousConversions: previousSources?.find((previous) => previous.id === row.id)?.conversions ?? null,
  }));

  const volume = statusVolume(dataset, range);
  const totalCharges = volume.reduce((sum, row) => sum + row.count, 0);

  const cashflowFrame = seriesFrame(range, { maxPoints: CASHFLOW_MAX_POINTS });
  const cashflowPoints = cashflowSeries(dataset, cashflowFrame);

  return {
    currency,
    range,
    granularity: frame.granularity,
    comparison,
    comparisonMode: mode,
    comparisonLabel,
    dataThrough: dataset.span.to,
    current,
    selector,
    trend: {
      metric: metricId,
      label: TREND_METRIC_LABELS[metricId],
      format: metric.format,
      variant: aggregation === "sum" ? "area" : "line",
      points,
      peakDate: points.length > 1 && !empty ? (extremes.highest?.date ?? null) : null,
      summary: trendSummary({ id: metricId, metric, points, granularity: frame.granularity, mode, peak: extremes.highest, currency }),
      empty,
      stats: trendStats({ id: metricId, metric, current, points, granularity: frame.granularity, comparison, mode, extremes, currency }),
      statsNote:
        extremes.skippedPartial && !empty
          ? `Strongest and weakest leave out the partial ${bucketNoun(frame.granularity)} at the edge of the range.`
          : null,
    },
    comparisonTable: COMPARISON_TABLE_METRICS.map(metricFor),
    cashflow: {
      points: cashflowPoints,
      granularity: cashflowFrame.granularity,
      summary: cashflowSummary(cashflowPoints, current, cashflowFrame.granularity, currency),
    },
    channels: { rows: channels, summary: channelSummary(channels, current.newCustomers) },
    volume: { rows: volume, total: totalCharges, summary: volumeSummary(volume, totalCharges) },
  };
}
