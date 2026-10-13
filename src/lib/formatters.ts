/**
 * Display formatting. Every formatter is a cached Intl instance pinned to one
 * locale and to UTC, so server-rendered and hydrated text are identical.
 */

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

// ---------------------------------------------------------------------------
// Dates

export type DateStyle = "medium" | "short" | "month" | "monthShort" | "weekday";

const DATE_STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
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
