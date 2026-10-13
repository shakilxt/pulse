/**
 * The product performance page: every product's sales for a period, set
 * against the comparison period, with search, sorting, the period's leaders
 * and a ranked comparison chart. Read from the URL and computed on the server.
 */

import type { Dataset, ProductCategory, ProductPerformance } from "@/types/domain";
import { type Comparison, productPerformance, summarizeComparison, summarizePeriod } from "./aggregations";
import { type Change, percentChange, pointChange, safeRatio } from "./calculations";
import type { DateRange, RangePreset } from "./dates";
import { matchesSearch, sortRows, tokenize } from "./filters";
import { formatInteger, formatMoney, formatPercent } from "./formatters";
import { describeComparison } from "./metrics";
import type { CurrencyCode } from "./money";
import {
  type DateRangeState,
  PARAM,
  type SearchParamsRecord,
  type SortState,
  parseDateRangeParams,
  parseEnumParam,
  parseSearchParam,
  parseSortParam,
} from "./search-params";
import { comparisonPeriod, isNegligible } from "./summaries";

/** Products sell less often than the ledger as a whole, so a quarter gives steadier conversion rates. */
export const PRODUCTS_DEFAULT_PRESET: RangePreset = "90d";

export const PRODUCT_SORT_KEYS = ["name", "category", "revenue", "change", "units", "conversion"] as const;
export type ProductSortKey = (typeof PRODUCT_SORT_KEYS)[number];
export const PRODUCT_DEFAULT_SORT: SortState<ProductSortKey> = { key: "revenue", direction: "desc" };

export const PRODUCT_SORT_LABELS: Record<ProductSortKey, { label: string; asc: string; desc: string }> = {
  name: { label: "product name", asc: "A to Z", desc: "Z to A" },
  category: { label: "category", asc: "A to Z", desc: "Z to A" },
  revenue: { label: "revenue", asc: "lowest first", desc: "highest first" },
  change: { label: "change in revenue", asc: "largest fall first", desc: "largest rise first" },
  units: { label: "units sold", asc: "fewest first", desc: "most first" },
  conversion: { label: "conversion rate", asc: "lowest first", desc: "highest first" },
};

/** Every order a narrow screen can pick from its sort menu, where the sortable columns are hidden. */
export const PRODUCT_SORT_OPTIONS = [
  { value: "revenue.desc", label: "Highest revenue" },
  { value: "revenue.asc", label: "Lowest revenue" },
  { value: "change.desc", label: "Fastest growing" },
  { value: "change.asc", label: "Largest decline" },
  { value: "units.desc", label: "Most units sold" },
  { value: "units.asc", label: "Fewest units sold" },
  { value: "conversion.desc", label: "Best conversion" },
  { value: "conversion.asc", label: "Lowest conversion" },
  { value: "name.asc", label: "Name, A to Z" },
  { value: "name.desc", label: "Name, Z to A" },
  { value: "category.asc", label: "Category, A to Z" },
  { value: "category.desc", label: "Category, Z to A" },
] as const satisfies ReadonlyArray<{ value: `${ProductSortKey}.${"asc" | "desc"}`; label: string }>;

/** What the comparison chart ranks products by. */
export const PRODUCT_CHART_METRICS = ["revenue", "units", "conversion"] as const;
export type ProductChartMetric = (typeof PRODUCT_CHART_METRICS)[number];
export const PRODUCT_CHART_METRIC_LABELS: Record<ProductChartMetric, string> = {
  revenue: "Revenue",
  units: "Units sold",
  conversion: "Conversion",
};

/** Leaders by rate or growth need at least this many orders in the period, so one lucky sale never leads. */
export const MIN_LEADER_ORDERS = 5;

export interface ProductQuery {
  search: string;
  sort: SortState<ProductSortKey>;
  dates: DateRangeState;
  chartMetric: ProductChartMetric;
}

export function parseProductQuery(
  params: SearchParamsRecord,
  { bounds, defaultPreset }: { bounds: DateRange; defaultPreset: RangePreset },
): ProductQuery {
  return {
    search: parseSearchParam(params[PARAM.query]),
    sort: parseSortParam(params[PARAM.sort], PRODUCT_SORT_KEYS, PRODUCT_DEFAULT_SORT),
    dates: parseDateRangeParams(params, { bounds, defaultPreset }),
    chartMetric: parseEnumParam(params[PARAM.metric], PRODUCT_CHART_METRICS, "revenue"),
  };
}

export interface ProductRow {
  id: string;
  name: string;
  category: ProductCategory;
  revenueMinor: number;
  unitsSold: number;
  orders: number;
  /** Completed orders ÷ product page views; null without views. */
  conversionRate: number | null;
  /** Fraction of the period's revenue across every product. */
  share: number;
  /** The same product in the comparison period; null when that period has no data. */
  previous: { revenueMinor: number; unitsSold: number; conversionRate: number | null } | null;
  revenueChange: Change;
  unitsChange: Change;
  conversionChange: Change;
}

export interface ProductLeader {
  id: "revenue" | "units" | "conversion" | "growth";
  label: string;
  row: ProductRow;
  /** The leading figure, formatted. */
  value: string;
  /** What the figure is measured against, in words. */
  detail: string;
}

export interface ProductChartBar {
  id: string;
  name: string;
  category: ProductCategory;
  /** Base-currency minor units for revenue, a count for units, a fraction for conversion. */
  value: number;
  /** The same measure in the comparison period; null without comparison data. */
  previousValue: number | null;
  change: Change;
}

export interface ProductPerformanceView {
  query: ProductQuery;
  currency: CurrencyCode;
  range: DateRange;
  comparison: Comparison;
  comparisonLabel: string;
  /** Rows matching the search, in the chosen order. */
  rows: ProductRow[];
  totalCount: number;
  filtered: boolean;
  /** Revenue of the matching rows, and of every product. */
  shownRevenueMinor: number;
  totalRevenueMinor: number;
  /** The period's leaders across the whole catalogue, whatever the search. */
  leaders: ProductLeader[];
  chart: { metric: ProductChartMetric; bars: ProductChartBar[]; summary: string };
}

/** Text a search can match: name, category and ID ("PR-04" or "pr04"). */
function searchFields(row: ProductRow): string[] {
  return [row.name, row.category, row.id, row.id.replace("-", "")];
}

function sortValue(row: ProductRow, key: ProductSortKey): string | number | null {
  switch (key) {
    case "name":
      return row.name;
    case "category":
      return row.category;
    case "revenue":
      return row.revenueMinor;
    case "units":
      return row.unitsSold;
    case "conversion":
      return row.conversionRate;
    case "change":
      // Products with nothing to compare against sort last.
      return row.revenueChange.kind === "relative" ? row.revenueChange.value : null;
  }
}

function chartValue(row: ProductRow, metric: ProductChartMetric): number | null {
  switch (metric) {
    case "revenue":
      return row.revenueMinor;
    case "units":
      return row.unitsSold;
    case "conversion":
      return row.conversionRate;
  }
}

function previousChartValue(row: ProductRow, metric: ProductChartMetric): number | null {
  if (!row.previous) return null;
  switch (metric) {
    case "revenue":
      return row.previous.revenueMinor;
    case "units":
      return row.previous.unitsSold;
    case "conversion":
      return row.previous.conversionRate;
  }
}

function chartChange(row: ProductRow, metric: ProductChartMetric): Change {
  switch (metric) {
    case "revenue":
      return row.revenueChange;
    case "units":
      return row.unitsChange;
    case "conversion":
      return row.conversionChange;
  }
}

function toRows(current: readonly ProductPerformance[], previous: readonly ProductPerformance[] | null): ProductRow[] {
  const totalRevenue = current.reduce((sum, product) => sum + product.revenueMinor, 0);
  const previousById = new Map(previous?.map((product) => [product.id, product]));
  return current.map((product) => {
    const before = previous ? (previousById.get(product.id) ?? null) : null;
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      revenueMinor: product.revenueMinor,
      unitsSold: product.unitsSold,
      orders: product.orders,
      conversionRate: product.conversionRate,
      share: safeRatio(product.revenueMinor, totalRevenue) ?? 0,
      previous: before
        ? { revenueMinor: before.revenueMinor, unitsSold: before.unitsSold, conversionRate: before.conversionRate }
        : null,
      revenueChange: percentChange(product.revenueMinor, before?.revenueMinor ?? null),
      unitsChange: percentChange(product.unitsSold, before?.unitsSold ?? null),
      conversionChange: pointChange(product.conversionRate, before?.conversionRate ?? null),
    };
  });
}

/** The row with the largest value, ties broken by catalogue ID; undefined when no row has a value above zero. */
function leaderBy(rows: readonly ProductRow[], value: (row: ProductRow) => number | null): ProductRow | undefined {
  const ranked = sortRows(rows, value, "desc", (row) => row.id);
  const first = ranked[0];
  const best = first ? value(first) : null;
  return best !== null && best > 0 ? first : undefined;
}

function leaders(rows: readonly ProductRow[], currency: CurrencyCode, comparisonLabel: string): ProductLeader[] {
  const result: ProductLeader[] = [];
  const revenue = leaderBy(rows, (row) => row.revenueMinor);
  if (revenue) {
    result.push({
      id: "revenue",
      label: "Highest revenue",
      row: revenue,
      value: formatMoney(revenue.revenueMinor, currency, { whole: true }),
      detail: `${formatPercent(revenue.share)} of all product revenue`,
    });
  }
  const units = leaderBy(rows, (row) => row.unitsSold);
  if (units) {
    result.push({
      id: "units",
      label: "Most units sold",
      row: units,
      value: formatInteger(units.unitsSold),
      detail: `across ${units.orders === 1 ? "1 order" : `${formatInteger(units.orders)} orders`}`,
    });
  }
  const conversion = leaderBy(
    rows.filter((row) => row.orders >= MIN_LEADER_ORDERS),
    (row) => row.conversionRate,
  );
  if (conversion && conversion.conversionRate !== null) {
    result.push({
      id: "conversion",
      label: "Best conversion",
      row: conversion,
      value: formatPercent(conversion.conversionRate, 2),
      detail: "of product page views became an order",
    });
  }
  const growth = leaderBy(
    rows.filter((row) => row.orders >= MIN_LEADER_ORDERS),
    (row) => (row.revenueChange.kind === "relative" ? row.revenueChange.value : null),
  );
  if (growth && growth.revenueChange.kind === "relative" && !isNegligible(growth.revenueChange.value)) {
    result.push({
      id: "growth",
      label: "Fastest growing",
      row: growth,
      value: `+${formatPercent(growth.revenueChange.value)}`,
      detail: `revenue ${comparisonLabel}`,
    });
  }
  return result;
}

function chartSummary(
  metric: ProductChartMetric,
  bars: readonly ProductChartBar[],
  currency: CurrencyCode,
  comparisonLabel: string,
): string {
  const first = bars[0];
  if (!first) return "No products match the search.";
  if (first.value === 0) return "None of these products sold anything in this period.";
  const describe = (bar: ProductChartBar) =>
    metric === "revenue"
      ? formatMoney(bar.value, currency, { whole: true })
      : metric === "units"
        ? `${formatInteger(bar.value)} ${bar.value === 1 ? "unit" : "units"}`
        : formatPercent(bar.value, 2);
  const lead = `${first.name} leads with ${describe(first)}`;
  const last = bars.length > 1 ? bars[bars.length - 1] : undefined;
  const range = last ? `; ${last.name} is lowest with ${describe(last)}.` : ".";
  const change = first.change;
  let trend = "";
  if (change.kind === "relative" && !isNegligible(change.value)) {
    trend = ` Its ${metric === "revenue" ? "revenue" : "units sold"} ${change.value > 0 ? "rose" : "fell"} ${formatPercent(Math.abs(change.value))} ${comparisonLabel}.`;
  } else if (change.kind === "points" && Math.abs(change.value) >= 0.005) {
    trend = ` Its conversion rate ${change.value > 0 ? "rose" : "fell"} ${Math.abs(change.value).toFixed(2)} percentage points ${comparisonLabel}.`;
  } else if (change.kind !== "unavailable") {
    trend = ` That is in line with ${comparisonPeriod(comparisonLabel)}.`;
  }
  return `${lead}${range}${trend}`;
}

export function buildProductPerformance(dataset: Dataset, query: ProductQuery, currency: CurrencyCode): ProductPerformanceView {
  const { range, comparison: mode, preset } = query.dates;
  const comparison = summarizeComparison(dataset, range, mode);
  const comparisonLabel = describeComparison(preset, range, mode);
  const all = toRows(
    productPerformance(dataset, range),
    comparison.summary ? productPerformance(dataset, comparison.range) : null,
  );

  const tokens = tokenize(query.search);
  const matching = tokens.length === 0 ? all : all.filter((row) => matchesSearch(searchFields(row), tokens));
  const rows = sortRows(matching, (row) => sortValue(row, query.sort.key), query.sort.direction, (row) => row.id);

  const bars = sortRows(matching, (row) => chartValue(row, query.chartMetric), "desc", (row) => row.id).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    value: chartValue(row, query.chartMetric) ?? 0,
    previousValue: previousChartValue(row, query.chartMetric),
    change: chartChange(row, query.chartMetric),
  }));

  return {
    query,
    currency,
    range,
    comparison,
    comparisonLabel,
    rows,
    totalCount: all.length,
    filtered: query.search !== "",
    shownRevenueMinor: matching.reduce((sum, row) => sum + row.revenueMinor, 0),
    totalRevenueMinor: summarizePeriod(dataset, range).revenueMinor,
    leaders: leaders(all, currency, comparisonLabel),
    chart: {
      metric: query.chartMetric,
      bars,
      summary: chartSummary(query.chartMetric, bars, currency, comparisonLabel),
    },
  };
}
