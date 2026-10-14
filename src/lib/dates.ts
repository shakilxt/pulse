/**
 * Calendar-date helpers.
 *
 * Every date in PULSE is an ISO calendar date ("YYYY-MM-DD") read as UTC, so the
 * server and the browser always agree and no time-zone offset can move a record
 * into a different day. Arithmetic goes through day numbers (days since
 * 1970-01-01), and ranges are inclusive at both ends.
 */

export type IsoDate = string;

export interface DateRange {
  from: IsoDate;
  to: IsoDate;
}

const MS_PER_DAY = 86_400_000;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseParts(value: string): { year: number; month: number; day: number } | null {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isRealDate ? { year, month, day } : null;
}

/** True for a real calendar date in strict `YYYY-MM-DD` form (rejects 2026-02-30). */
export function isIsoDate(value: unknown): value is IsoDate {
  return typeof value === "string" && parseParts(value) !== null;
}

function requireParts(value: IsoDate) {
  const parts = parseParts(value);
  if (!parts) throw new RangeError(`Invalid ISO date: ${value}`);
  return parts;
}

export function toDayNumber(value: IsoDate): number {
  const { year, month, day } = requireParts(value);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

export function fromDayNumber(dayNumber: number): IsoDate {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

/** UTC midnight of the date, for handing to Intl formatters. */
export function toUtcDate(value: IsoDate): Date {
  return new Date(toDayNumber(value) * MS_PER_DAY);
}

export function addDays(value: IsoDate, days: number): IsoDate {
  return fromDayNumber(toDayNumber(value) + days);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

export function minDate(a: IsoDate, b: IsoDate): IsoDate {
  return a <= b ? a : b;
}

export function maxDate(a: IsoDate, b: IsoDate): IsoDate {
  return a >= b ? a : b;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatParts(year: number, month: number, day: number): IsoDate {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Adds calendar months, clamping the day to the target month (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(value: IsoDate, months: number): IsoDate {
  const { year, month, day } = requireParts(value);
  const monthIndex = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(monthIndex / 12);
  const targetMonth = (monthIndex % 12) + 1;
  return formatParts(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

export function addYears(value: IsoDate, years: number): IsoDate {
  return addMonths(value, years * 12);
}

export function startOfMonth(value: IsoDate): IsoDate {
  const { year, month } = requireParts(value);
  return formatParts(year, month, 1);
}

export function endOfMonth(value: IsoDate): IsoDate {
  const { year, month } = requireParts(value);
  return formatParts(year, month, daysInMonth(year, month));
}

export function startOfYear(value: IsoDate): IsoDate {
  return formatParts(requireParts(value).year, 1, 1);
}

/** Day of week, 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(value: IsoDate): number {
  // 1970-01-01 was a Thursday.
  return (((toDayNumber(value) + 4) % 7) + 7) % 7;
}

/** Number of days in an inclusive range. */
export function rangeLength(range: DateRange): number {
  return diffDays(range.from, range.to) + 1;
}

export function isWithinRange(value: IsoDate, range: DateRange): boolean {
  return value >= range.from && value <= range.to;
}

export function eachDay(range: DateRange): IsoDate[] {
  const start = toDayNumber(range.from);
  const length = rangeLength(range);
  return Array.from({ length: Math.max(length, 0) }, (_, index) => fromDayNumber(start + index));
}

/** Intersects a range with the available data span; null when they do not overlap. */
export function clampRange(range: DateRange, bounds: DateRange): DateRange | null {
  const from = maxDate(range.from, bounds.from);
  const to = minDate(range.to, bounds.to);
  return from <= to ? { from, to } : null;
}

// ---------------------------------------------------------------------------
// Presets and comparison periods

export const RANGE_PRESETS = ["7d", "30d", "90d", "12m", "ytd"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
  ytd: "Year to date",
};

/** Resolves a preset to a concrete range ending on the anchor date. */
export function resolvePresetRange(preset: RangePreset, anchor: IsoDate): DateRange {
  switch (preset) {
    case "7d":
      return { from: addDays(anchor, -6), to: anchor };
    case "30d":
      return { from: addDays(anchor, -29), to: anchor };
    case "90d":
      return { from: addDays(anchor, -89), to: anchor };
    case "12m":
      return { from: addDays(addMonths(anchor, -12), 1), to: anchor };
    case "ytd":
      return { from: startOfYear(anchor), to: anchor };
  }
}

export const COMPARISON_MODES = ["previous-period", "previous-year"] as const;
export type ComparisonMode = (typeof COMPARISON_MODES)[number];

/** Year to date compares against the same dates last year; every other range against the period just before it. */
export function defaultComparisonMode(preset: RangePreset | "custom"): ComparisonMode {
  return preset === "ytd" ? "previous-year" : "previous-period";
}

/** Shifts a date by whole years; a month-end date stays a month-end date (28 Feb 2025 → 29 Feb 2024). */
function shiftYearsKeepingMonthEnd(value: IsoDate, years: number): IsoDate {
  if (value === endOfMonth(value)) return endOfMonth(addYears(startOfMonth(value), years));
  return addYears(value, years);
}

export function getComparisonRange(range: DateRange, mode: ComparisonMode): DateRange {
  if (mode === "previous-year") {
    return {
      from: addYears(range.from, -1),
      to: shiftYearsKeepingMonthEnd(range.to, -1),
    };
  }
  const to = addDays(range.from, -1);
  return { from: addDays(to, -(rangeLength(range) - 1)), to };
}

// ---------------------------------------------------------------------------
// Chart buckets

export type Granularity = "day" | "week" | "month";

export interface DateBucket {
  start: IsoDate;
  end: IsoDate;
  days: number;
  /** True when the bucket is shorter than a full week or calendar month. */
  partial: boolean;
}

/** Daily up to a month, weekly up to ~four months, monthly beyond. */
export function granularityFor(range: DateRange): Granularity {
  const length = rangeLength(range);
  if (length <= 31) return "day";
  if (length <= 120) return "week";
  return "month";
}

function makeBucket(start: IsoDate, end: IsoDate, partial: boolean): DateBucket {
  return { start, end, days: diffDays(start, end) + 1, partial };
}

/**
 * Splits a range into contiguous buckets that cover it exactly.
 * Weeks are counted back from the range end, so only the oldest week can be
 * partial and the most recent point is always a full week.
 */
export function bucketize(range: DateRange, granularity: Granularity): DateBucket[] {
  if (range.from > range.to) return [];

  if (granularity === "day") {
    return eachDay(range).map((day) => makeBucket(day, day, false));
  }

  const buckets: DateBucket[] = [];

  if (granularity === "week") {
    let end = range.to;
    while (end >= range.from) {
      const fullStart = addDays(end, -6);
      const start = maxDate(fullStart, range.from);
      buckets.push(makeBucket(start, end, start !== fullStart));
      end = addDays(start, -1);
    }
    return buckets.reverse();
  }

  let start = range.from;
  while (start <= range.to) {
    const monthEnd = endOfMonth(start);
    const end = minDate(monthEnd, range.to);
    buckets.push(makeBucket(start, end, start !== startOfMonth(start) || end !== monthEnd));
    start = addDays(end, 1);
  }
  return buckets;
}

/**
 * Maps the current period's buckets onto the comparison range so each point can
 * be drawn against its counterpart. The result is contiguous and covers the
 * comparison range exactly, so its totals match a summary of that range.
 */
export function alignComparisonBuckets(
  buckets: readonly DateBucket[],
  range: DateRange,
  mode: ComparisonMode,
): DateBucket[] {
  const comparison = getComparisonRange(range, mode);
  const offset = diffDays(range.from, comparison.from);
  const shift = (value: IsoDate) =>
    mode === "previous-year" ? addYears(value, -1) : addDays(value, offset);

  const starts: IsoDate[] = [];
  for (const [index, bucket] of buckets.entries()) {
    const shifted = index === 0 ? comparison.from : shift(bucket.start);
    const previous = starts.at(-1);
    starts.push(previous !== undefined && shifted <= previous ? addDays(previous, 1) : shifted);
  }

  return buckets.map((bucket, index) => {
    const start = starts[index] ?? comparison.from;
    const nextStart = starts[index + 1];
    const end = nextStart === undefined ? comparison.to : addDays(nextStart, -1);
    return makeBucket(start, end, bucket.partial);
  });
}
