/**
 * Chart-ready series. Each point carries its labels already formatted on the
 * server, so chart components in the browser only draw; they never need the
 * dataset, date maths or bucketing rules.
 */

import type { Dataset } from "@/types/domain";
import { isFullyCovered, totalsByBucket } from "./aggregations";
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
}

export interface RevenueTrendPoint extends ChartPoint {
  revenueMinor: number;
  /** The aligned comparison bucket; null when there is no comparison data. */
  previousRevenueMinor: number | null;
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
 * Revenue per bucket, with the comparison period's revenue lined up point for
 * point. The comparison is left out entirely when its period reaches beyond
 * the data, so a partial period is never drawn as if it were complete.
 */
export function revenueTrend(dataset: Dataset, frame: SeriesFrame, mode: ComparisonMode): RevenueTrendPoint[] {
  const current = totalsByBucket(dataset, frame.buckets);
  const comparable = isFullyCovered(dataset, getComparisonRange(frame.range, mode));
  const aligned = comparable ? alignComparisonBuckets(frame.buckets, frame.range, mode) : [];
  const previous = comparable ? totalsByBucket(dataset, aligned) : [];

  return current.map(({ bucket, revenueMinor }, index) => {
    const counterpart = previous[index];
    return {
      ...chartPoint(bucket, frame.granularity),
      revenueMinor,
      previousRevenueMinor: counterpart ? counterpart.revenueMinor : null,
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
