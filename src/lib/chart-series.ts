/**
 * Chart-ready series. Each point carries its labels already formatted on the
 * server, so chart components in the browser only draw; they never need the
 * dataset, date maths or bucketing rules.
 */

import type { Dataset } from "@/types/domain";
import { type PeriodTotals, isFullyCovered, totalsByBucket } from "./aggregations";
import { safeRatio } from "./calculations";
import {
  type ComparisonMode,
  type DateBucket,
  type DateRange,
  type Granularity,
  type IsoDate,
  alignComparisonBuckets,
  bucketize,
  getComparisonRange,
  granularityFor,
} from "./dates";
import { formatDate, formatDateRange } from "./formatters";

export interface ChartPoint {
  /** First day of the bucket; stable key for the point. */
  date: IsoDate;
  /** Short tick text: "Sep 14", or "Sep" for months. */
  axisLabel: string;
  /** Full name of the bucket for tooltips and tables: "Mon, Sep 14", "Sep 8 – 14, 2026". */
  label: string;
  /** Shorter than a full week or month, at the start or end of the range. */
  partial: boolean;
}

/** One metric over time, with the comparison period lined up point for point. */
export interface TrendPoint extends ChartPoint {
  /** Null where the metric is undefined, such as a conversion rate without visitors. */
  value: number | null;
  /** The aligned comparison bucket's value; null when there is no comparison data. */
  previousValue: number | null;
  previousLabel: string | null;
}

export interface CashflowPoint extends ChartPoint {
  revenueMinor: number;
  expensesMinor: number;
  profitMinor: number;
}

export interface AcquisitionTrendPoint extends ChartPoint {
  newCustomers: number;
  visitors: number;
  conversionRate: number | null;
}

const GRANULARITY_NOUNS: Record<Granularity, string> = { day: "day", week: "week", month: "month" };

/** "day", "week" or "month": what one point in the chart stands for. */
export function bucketNoun(granularity: Granularity): string {
  return GRANULARITY_NOUNS[granularity];
}

/** Full, unambiguous name of a bucket. Partial weeks and months show their exact dates. */
export function bucketLabel(bucket: DateBucket, granularity: Granularity): string {
  if (granularity === "day") return formatDate(bucket.start, "weekday");
  if (granularity === "month" && !bucket.partial) return formatDate(bucket.start, "month");
  return formatDateRange({ from: bucket.start, to: bucket.end });
}

export function bucketAxisLabel(bucket: DateBucket, granularity: Granularity): string {
  return formatDate(bucket.start, granularity === "month" ? "monthShort" : "short");
}

function chartPoint(bucket: DateBucket, granularity: Granularity): ChartPoint {
  return {
    date: bucket.start,
    axisLabel: bucketAxisLabel(bucket, granularity),
    label: bucketLabel(bucket, granularity),
    partial: bucket.partial,
  };
}

export interface SeriesFrame {
  range: DateRange;
  granularity: Granularity;
  buckets: DateBucket[];
}

const GRANULARITIES: readonly Granularity[] = ["day", "week", "month"];

/**
 * Buckets for a chart over `range`. By default the grouping follows the range
 * length. With `maxPoints`, it steps up to weeks or months until the series
 * fits, for marks that need room, such as paired bars on a phone screen.
 */
export function seriesFrame(range: DateRange, options: { maxPoints?: number } = {}): SeriesFrame {
  const natural = granularityFor(range);
  const { maxPoints } = options;
  for (const granularity of GRANULARITIES.slice(GRANULARITIES.indexOf(natural))) {
    const buckets = bucketize(range, granularity);
    if (maxPoints === undefined || buckets.length <= maxPoints || granularity === "month") {
      return { range, granularity, buckets };
    }
  }
  return { range, granularity: "month", buckets: bucketize(range, "month") };
}

/**
 * A metric per bucket, with the comparison period's value lined up point for
 * point. `value` turns a bucket's additive totals into the metric, so sums and
 * ratios are both computed from the same totals as the period summaries. The
 * comparison is left out entirely when its period reaches beyond the data, so
 * a partial period is never drawn as if it were complete.
 */
export function metricTrend(
  dataset: Dataset,
  frame: SeriesFrame,
  mode: ComparisonMode,
  value: (totals: PeriodTotals) => number | null,
): TrendPoint[] {
  const current = totalsByBucket(dataset, frame.buckets);
  const comparable = isFullyCovered(dataset, getComparisonRange(frame.range, mode));
  const aligned = comparable ? alignComparisonBuckets(frame.buckets, frame.range, mode) : [];
  const previous = comparable ? totalsByBucket(dataset, aligned) : [];

  return current.map((totals, index) => {
    const counterpart = previous[index];
    return {
      ...chartPoint(totals.bucket, frame.granularity),
      value: value(totals),
      previousValue: counterpart ? value(counterpart) : null,
      previousLabel: counterpart ? bucketLabel(counterpart.bucket, frame.granularity) : null,
    };
  });
}

export function cashflowSeries(dataset: Dataset, frame: SeriesFrame): CashflowPoint[] {
  return totalsByBucket(dataset, frame.buckets).map(({ bucket, revenueMinor, expensesMinor }) => ({
    ...chartPoint(bucket, frame.granularity),
    revenueMinor,
    expensesMinor,
    profitMinor: revenueMinor - expensesMinor,
  }));
}

export function acquisitionTrend(dataset: Dataset, frame: SeriesFrame): AcquisitionTrendPoint[] {
  return totalsByBucket(dataset, frame.buckets).map(({ bucket, newCustomers, visitors }) => ({
    ...chartPoint(bucket, frame.granularity),
    newCustomers,
    visitors,
    conversionRate: safeRatio(newCustomers, visitors),
  }));
}

/** The point with the largest value; the earliest wins a tie. Undefined for an empty series. */
export function peakPoint<T>(points: readonly T[], value: (point: T) => number): T | undefined {
  let best: T | undefined;
  for (const point of points) {
    if (best === undefined || value(point) > value(best)) best = point;
  }
  return best;
}

export interface TrendExtremes {
  highest: TrendPoint | undefined;
  lowest: TrendPoint | undefined;
  /** True when partial buckets were left out of the comparison. */
  skippedPartial: boolean;
}

/**
 * The highest and lowest points of a trend, ignoring points without a value.
 * For totals, a partial week or month at the edge of the range would look
 * like a slump simply for being shorter, so with `fullBucketsOnly` those are
 * left out whenever at least one full bucket exists.
 */
export function trendExtremes(points: readonly TrendPoint[], options: { fullBucketsOnly: boolean }): TrendExtremes {
  const valued = points.filter((point) => point.value !== null);
  const full = valued.filter((point) => !point.partial);
  const skippedPartial = options.fullBucketsOnly && full.length > 0 && full.length < valued.length;
  const candidates = skippedPartial ? full : valued;
  const score = (point: TrendPoint) => point.value ?? 0;
  return {
    highest: peakPoint(candidates, score),
    lowest: peakPoint(candidates, (point) => -score(point)),
    skippedPartial,
  };
}
