/**
 * Display formatting. Every formatter is a cached Intl instance pinned to one
 * locale and to UTC, so server-rendered and hydrated text are identical.
 */

import type { MetricFormat } from "@/types/domain";
import type { Change } from "./calculations";
import { type DateRange, type IsoDate, toUtcDate } from "./dates";
import { BASE_CURRENCY, type CurrencyCode, toMajor } from "./money";

export const LOCALE = "en-US";

const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

function numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options);
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(LOCALE, options);
    numberFormats.set(key, format);
  }
  return format;
}

function dateFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options);
  let format = dateFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", ...options });
    dateFormats.set(key, format);
  }
  return format;
}

// ---------------------------------------------------------------------------
// Numbers and money

export interface MoneyFormatOptions {
  currency?: CurrencyCode;
  /** "$84.2K" style, for KPI tiles and chart axes. */
  compact?: boolean;
  /** Drop the cents ("$84,210"). */
  whole?: boolean;
}

export function formatMoney(amountMinor: number, options: MoneyFormatOptions = {}): string {
  const { currency = BASE_CURRENCY, compact = false, whole = false } = options;
  const format = compact
    ? numberFormat({
        style: "currency",
        currency,
        notation: "compact",
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      })
    : numberFormat({
        style: "currency",
        currency,
        minimumFractionDigits: whole ? 0 : 2,
        maximumFractionDigits: whole ? 0 : 2,
      });
  return format.format(toMajor(amountMinor));
}

export function formatInteger(value: number): string {
  return numberFormat({ maximumFractionDigits: 0 }).format(value);
}

/** A number with a fixed count of decimals: 11.7. */
export function formatDecimal(value: number, digits = 1): string {
  return numberFormat({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export function formatCompactNumber(value: number): string {
  return numberFormat({ notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** Formats a fraction as a percentage: 0.0342 → "3.4%". */
export function formatPercent(ratio: number, digits = 1): string {
  return numberFormat({
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(ratio);
}

/**
 * "+12.4%", "-0.3 pp", "New" or "—". Values that round to zero print without a
 * sign, so the text never claims a direction the number does not have.
 */
export function formatChange(change: Change, digits = 1): string {
  switch (change.kind) {
    case "relative":
      return numberFormat({
        style: "percent",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
        signDisplay: "exceptZero",
      }).format(change.value);
    case "points":
      return `${numberFormat({
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
        signDisplay: "exceptZero",
      }).format(change.value)} pp`;
    case "new":
      return "New";
    case "unavailable":
      return "—";
  }
}

/**
 * A KPI value in its own format: whole currency, a count, or a percentage with
 * two decimals (conversion rates sit near 1%, where one decimal hides real moves).
 */
export function formatMetricValue(value: number | null, format: MetricFormat): string {
  if (value === null) return "—";
  switch (format) {
    case "currency":
      return formatMoney(value, { whole: true });
    case "integer":
      return formatInteger(value);
    case "percentage":
      return formatPercent(value, 2);
  }
}

/** A value for chart axes and point labels: "$5.9K", "1.2K", "1.4%". */
export function formatCompactMetric(value: number, format: MetricFormat): string {
  switch (format) {
    case "currency":
      return formatMoney(value, { compact: true });
    case "integer":
      return formatCompactNumber(value);
    case "percentage":
      return formatPercent(value, 1);
  }
}

/** Digits for a change in a metric of this format: points on small ratios need two. */
export function changeDigits(format: MetricFormat): number {
  return format === "percentage" ? 2 : 1;
}

/** The change in words for screen readers: "up 6.3%", "down 0.08 percentage points". */
export function describeChange(change: Change, digits = 1): string {
  switch (change.kind) {
    case "relative":
    case "points": {
      if (change.value === 0) return change.kind === "points" ? "no change in percentage points" : "no change";
      const size = Math.abs(change.value);
      const amount =
        change.kind === "relative"
          ? formatPercent(size, digits)
          : `${numberFormat({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(size)} percentage points`;
      return `${change.value > 0 ? "up" : "down"} ${amount}`;
    }
    case "new":
      return "new this period, nothing to compare with";
    case "unavailable":
      return "no comparison data";
  }
}

// ---------------------------------------------------------------------------
// Dates

export type DateStyle = "long" | "medium" | "short" | "month" | "monthShort" | "weekday";

const DATE_STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  long: { weekday: "long", month: "long", day: "numeric", year: "numeric" }, // Wednesday, September 30, 2026
  medium: { month: "short", day: "numeric", year: "numeric" }, // Sep 30, 2026
  short: { month: "short", day: "numeric" }, // Sep 30
  month: { month: "short", year: "numeric" }, // Sep 2026
  monthShort: { month: "short" }, // Sep
  weekday: { weekday: "short", month: "short", day: "numeric" }, // Wed, Sep 30
};

export function formatDate(value: IsoDate, style: DateStyle = "medium"): string {
  return dateFormat(DATE_STYLES[style]).format(toUtcDate(value));
}

/** "Sep 1 – 30, 2026", collapsing the parts both ends share. */
export function formatDateRange(range: DateRange, style: DateStyle = "medium"): string {
  return dateFormat(DATE_STYLES[style]).formatRange(toUtcDate(range.from), toUtcDate(range.to));
}

/** "Sep 30, 2026, 2:20 PM UTC" for an ISO timestamp. */
export function formatDateTime(isoTimestamp: string): string {
  return dateFormat({
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(isoTimestamp));
}

const relativeTimeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

const RELATIVE_UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/**
 * "3 hours ago", "yesterday". Measured against an explicit `now` (the demo's
 * fixed clock) rather than the wall clock, so the output is deterministic.
 */
export function formatRelativeTime(isoTimestamp: string, nowIsoTimestamp: string): string {
  const elapsed = Date.parse(isoTimestamp) - Date.parse(nowIsoTimestamp);
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(elapsed) >= size) return relativeTimeFormat.format(Math.round(elapsed / size), unit);
  }
  return "just now";
}
