/**
 * URL state. Filters, sorting and pagination live in the query string so views
 * are shareable and survive a refresh. Every value is untrusted input: parsers
 * validate it and fall back to a default instead of throwing.
 */

import {
  type ComparisonMode,
  COMPARISON_MODES,
  type DateRange,
  type RangePreset,
  RANGE_PRESETS,
  clampRange,
  defaultComparisonMode,
  isIsoDate,
  resolvePresetRange,
} from "./dates";
import type { SortDirection } from "./filters";

export type SearchParamValue = string | string[] | undefined;
export type SearchParamsRecord = Record<string, SearchParamValue>;

/** Query-string keys, in one place so links and parsers agree. */
export const PARAM = {
  range: "range",
  from: "from",
  to: "to",
  compare: "compare",
  query: "q",
  status: "status",
  sort: "sort",
  page: "page",
  metric: "metric",
} as const;

/** A repeated key (`?q=a&q=b`) uses its first value. */
export function firstParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseEnumParam<T extends string>(
  value: SearchParamValue,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = firstParam(value);
  return allowed.find((option) => option === raw) ?? fallback;
}

export const MAX_SEARCH_LENGTH = 80;

/** Trimmed, whitespace-collapsed search text, capped at a sensible length. */
export function parseSearchParam(value: SearchParamValue): string {
  return (firstParam(value) ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_SEARCH_LENGTH);
}

/** Positive whole page numbers only ("2"); anything else is page 1. */
export function parsePageParam(value: SearchParamValue): number {
  const raw = firstParam(value);
  return raw !== undefined && /^[1-9]\d{0,5}$/.test(raw) ? Number(raw) : 1;
}

export interface SortState<K extends string> {
  key: K;
  direction: SortDirection;
}

/** Parses "amount.desc" against the columns a table allows sorting by. */
export function parseSortParam<K extends string>(
  value: SearchParamValue,
  keys: readonly K[],
  fallback: SortState<K>,
): SortState<K> {
  const [rawKey, rawDirection] = (firstParam(value) ?? "").split(".");
  const key = keys.find((option) => option === rawKey);
  if (!key || (rawDirection !== "asc" && rawDirection !== "desc")) return fallback;
  return { key, direction: rawDirection };
}

export function serializeSort<K extends string>(sort: SortState<K>): string {
  return `${sort.key}.${sort.direction}`;
}

/** The `sort` query value for a state, or null when it is the table's default. */
export function sortToParam<K extends string>(sort: SortState<K>, fallback: SortState<K>): string | null {
  return sort.key === fallback.key && sort.direction === fallback.direction ? null : serializeSort(sort);
}

/**
 * The state a column header switches to: the active column flips direction,
 * any other column starts in its own natural direction (newest or largest
 * first for dates and amounts, A–Z for text).
 */
export function nextSort<K extends string>(
  current: SortState<K>,
  key: K,
  initialDirection: SortDirection,
): SortState<K> {
  if (current.key !== key) return { key, direction: initialDirection };
  return { key, direction: current.direction === "asc" ? "desc" : "asc" };
}

// ---------------------------------------------------------------------------
// Date range

export interface DateRangeState {
  preset: RangePreset | "custom";
  range: DateRange;
  comparison: ComparisonMode;
}

export interface DateRangeOptions {
  /** The span the data covers; custom ranges are clamped into it. */
  bounds: DateRange;
  defaultPreset: RangePreset;
}

/**
 * Reads `?range=30d`, or a custom `?from=YYYY-MM-DD&to=YYYY-MM-DD`, plus
 * `?compare=previous-period|previous-year`. Reversed custom dates are swapped,
 * out-of-span dates are clamped, and anything unusable falls back to the
 * default preset.
 */
export function parseDateRangeParams(
  params: SearchParamsRecord,
  { bounds, defaultPreset }: DateRangeOptions,
): DateRangeState {
  const from = firstParam(params[PARAM.from]);
  const to = firstParam(params[PARAM.to]);

  let preset: RangePreset | "custom" = parseEnumParam(params[PARAM.range], RANGE_PRESETS, defaultPreset);
  let range = resolvePresetRange(preset, bounds.to);

  if (isIsoDate(from) && isIsoDate(to)) {
    const ordered: DateRange = from <= to ? { from, to } : { from: to, to: from };
    const clamped = clampRange(ordered, bounds);
    if (clamped) {
      preset = "custom";
      range = clamped;
    }
  }

  const comparison = parseEnumParam(params[PARAM.compare], COMPARISON_MODES, defaultComparisonMode(preset));
  return { preset, range, comparison };
}

/** Query values for a date range, leaving out whatever equals the default. */
export function dateRangeToParams(
  state: DateRangeState,
  defaultPreset: RangePreset,
): Record<string, string | null> {
  const custom = state.preset === "custom";
  return {
    [PARAM.range]: custom || state.preset === defaultPreset ? null : state.preset,
    [PARAM.from]: custom ? state.range.from : null,
    [PARAM.to]: custom ? state.range.to : null,
    [PARAM.compare]: state.comparison === defaultComparisonMode(state.preset) ? null : state.comparison,
  };
}

/** A page's `searchParams` prop as URLSearchParams, keeping repeated keys. */
export function toUrlSearchParams(params: SearchParamsRecord): URLSearchParams {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) result.append(key, item);
    }
  }
  return result;
}

/**
 * Applies a patch to a query string: strings set a key, null or undefined
 * removes it. Returns "?…" or an empty string, ready to append to a path.
 */
export function mergeSearchParams(
  current: string | URLSearchParams,
  patch: Record<string, string | null | undefined>,
): string {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `?${query}` : "";
}

/** A same-page link with a patch applied to the current query. */
export function hrefWithParams(
  pathname: string,
  current: string | URLSearchParams,
  patch: Record<string, string | null | undefined>,
): string {
  return `${pathname}${mergeSearchParams(current, patch)}`;
}
