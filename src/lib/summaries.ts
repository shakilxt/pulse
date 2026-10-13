/**
 * The sentences that sit under charts. Each is built from the same figures the
 * chart draws, so the text and the picture can never disagree, and each says
 * plainly when there is nothing to compare or nothing to show.
 */

import type { DashboardMetric } from "@/types/domain";
import type { PeriodSummary } from "./aggregations";
import { safeRatio } from "./calculations";
import { type CashflowPoint, type TrendPoint, bucketNoun } from "./chart-series";
import type { ComparisonMode, Granularity } from "./dates";
import type { CurrencyCode } from "./money";
import { formatMetricValue, formatMoney, formatPercent } from "./formatters";
import { type TrendMetricId, TREND_METRIC_VALUES, metricChange } from "./metrics";

/** Relative changes that round to 0.0% read as "in line" rather than "rose 0.0%". */
export function isNegligible(relativeChange: number): boolean {
  return Math.abs(relativeChange) < 0.0005;
}

/** "the previous 30 days" from "vs previous 30 days". */
export function comparisonPeriod(comparisonLabel: string): string {
  return `the ${comparisonLabel.replace(/^vs\s+/, "")}`;
}

/** The comparison period in words, for when it has no data. */
export function missingComparison(mode: ComparisonMode): string {
  return mode === "previous-year" ? "the same period last year" : "the previous period";
}

interface TrendWording {
  /** Sentence subject: "Revenue rose…", "The conversion rate fell…". */
  subject: string;
  /** What the summary says when the period has nothing to show. */
  empty: string;
}

const TREND_WORDING: Record<TrendMetricId, TrendWording> = {
  revenue: { subject: "Revenue", empty: "No revenue was recorded in this period." },
  orders: { subject: "Completed orders", empty: "No completed orders were recorded in this period." },
  newCustomers: { subject: "New customers", empty: "No new customers joined in this period." },
  conversionRate: {
    subject: "The conversion rate",
    empty: "There were no visitors in this period, so there is no conversion rate.",
  },
};

/** True when a period has nothing to draw for the metric: no value, or a total of zero. */
export function isEmptyTrend(id: TrendMetricId, metric: DashboardMetric): boolean {
  return metric.value === null || (TREND_METRIC_VALUES[id].aggregation === "sum" && metric.value === 0);
}

/**
 * "Revenue rose 6.3% to $57,548 vs previous 30 days. The strongest day was
 * Fri, Sep 25, with $5,865." Ratios change in percentage points and peak
 * "at" a rate rather than "with" an amount.
 */
export function trendSummary({
  id,
  metric,
  points,
  granularity,
  mode,
  peak,
  currency,
}: {
  id: TrendMetricId;
  metric: DashboardMetric;
  points: readonly TrendPoint[];
  granularity: Granularity;
  mode: ComparisonMode;
  peak: TrendPoint | undefined;
  currency: CurrencyCode;
}): string {
  const { subject, empty } = TREND_WORDING[id];
  if (metric.value === null || isEmptyTrend(id, metric)) return empty;

  const sum = TREND_METRIC_VALUES[id].aggregation === "sum";
  const value = formatMetricValue(metric.value, metric.format, currency);
  const stated = sum ? `${subject} totalled ${value}` : `${subject} was ${value}`;
  const change = metricChange(metric);

  let trend: string;
  switch (change.kind) {
    case "unavailable":
      trend = `${stated}. There is no comparison data for ${missingComparison(mode)}.`;
      break;
    case "new":
      trend = `${stated}, up from none ${metric.comparisonLabel}.`;
      break;
    case "relative":
      trend = isNegligible(change.value)
        ? `${stated}, in line with ${comparisonPeriod(metric.comparisonLabel)}.`
        : `${subject} ${change.value > 0 ? "rose" : "fell"} ${formatPercent(Math.abs(change.value))} to ${value} ${metric.comparisonLabel}.`;
      break;
    case "points": {
      const size = Math.abs(change.value).toFixed(2);
      trend =
        size === "0.00"
          ? `${stated}, in line with ${comparisonPeriod(metric.comparisonLabel)}.`
          : `${subject} ${change.value > 0 ? "rose" : "fell"} ${size} percentage points to ${value} ${metric.comparisonLabel}.`;
      break;
    }
  }

  if (points.length <= 1 || !peak || peak.value === null) return trend;
  const peakValue = formatMetricValue(peak.value, metric.format, currency);
  const noun = bucketNoun(granularity);
  return sum
    ? `${trend} The strongest ${noun} was ${peak.label}, with ${peakValue}.`
    : `${trend} The highest ${noun} was ${peak.label}, at ${peakValue}.`;
}

export function cashflowSummary(
  points: readonly CashflowPoint[],
  current: PeriodSummary,
  granularity: Granularity,
  currency: CurrencyCode,
): string {
  const expenses = formatMoney(current.expensesMinor, currency, { whole: true });
  const profit = formatMoney(Math.abs(current.profitMinor), currency, { whole: true });
  const margin = safeRatio(current.profitMinor, current.revenueMinor);
  const result =
    current.profitMinor >= 0
      ? `Expenses were ${expenses}, leaving a net profit of ${profit}${margin === null ? "" : ` (${formatPercent(margin)} margin)`}.`
      : `Expenses were ${expenses}, a net loss of ${profit}.`;
  if (points.length <= 1) return result;
  const ahead = points.filter((point) => point.profitMinor > 0).length;
  return `${result} Revenue exceeded expenses in ${ahead} of ${points.length} ${bucketNoun(granularity)}s.`;
}
