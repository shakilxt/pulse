/**
 * The reports page: a printable-style summary of one period and its
 * comparison, as tables. Each cell carries both the text the preview shows
 * and the value its CSV file holds, derived from the same rounded number, so
 * a download can never disagree with what is on screen.
 *
 * Money is converted to the display currency once, here. Columns that have a
 * total row are converted with largest-remainder rounding, so the parts add
 * up to the total in every currency.
 */

import type { Dataset, MetricFormat } from "@/types/domain";
import {
  type Comparison,
  type PeriodSummary,
  productPerformance,
  sourceBreakdown,
  summarizeComparison,
  summarizePeriod,
  totalsByBucket,
} from "./aggregations";
import { type Change, percentChange, pointChange, safeRatio } from "./calculations";
import { bucketLabel, bucketNoun, seriesFrame } from "./chart-series";
import { type CsvValue, csvFileName } from "./csv";
import type { DateRange, Granularity, IsoDate, RangePreset } from "./dates";
import { formatChange, formatDecimal, formatInteger, formatMinorIn, formatPlainNumber } from "./formatters";
import { comparisonSeriesName, describeComparison } from "./metrics";
import { type CurrencyCode, convertAllocated, convertMinor, minorToDecimalString } from "./money";
import type { DateRangeState } from "./search-params";

export const REPORTS_DEFAULT_PRESET: RangePreset = "30d";

/** A preview cell and its CSV value, from one rounded number. */
export interface ReportCell {
  display: string;
  csv: CsvValue;
}

export interface ReportColumn {
  header: string;
  /** The CSV header, which names units the preview shows with symbols: "Revenue (EUR)". */
  csvHeader: string;
  align: "start" | "end";
  /** Columns that exist only in the CSV, such as a unit beside a mixed-unit value. */
  csvOnly?: boolean;
}

export interface ReportRow {
  key: string;
  cells: ReportCell[];
  /** A heading row inside the table ("Revenue", "Customers"); not exported. */
  section?: boolean;
  /** The total row: styled apart in the preview, kept as the last line of the CSV. */
  total?: boolean;
}

export const REPORT_TABLE_IDS = ["summary", "revenue", "products", "channels"] as const;
export type ReportTableId = (typeof REPORT_TABLE_IDS)[number];

export interface ReportTable {
  id: ReportTableId;
  title: string;
  description: string;
  fileName: string;
  columns: ReportColumn[];
  rows: ReportRow[];
}

export interface Report {
  workspaceName: string;
  currency: CurrencyCode;
  range: DateRange;
  comparison: Comparison;
  comparisonLabel: string;
  comparisonName: string;
  granularity: Granularity;
  dataThrough: IsoDate;
  /** Two or three sentences that state the period's headline figures. */
  overview: string;
  tables: ReportTable[];
}

// ---------------------------------------------------------------------------
// Cells

const text = (value: string): ReportCell => ({ display: value, csv: value });
const empty: ReportCell = { display: "—", csv: "" };

/** Minor units already in the display currency. */
function moneyCell(convertedMinor: number | null, currency: CurrencyCode): ReportCell {
  if (convertedMinor === null) return empty;
  return { display: formatMinorIn(convertedMinor, currency), csv: minorToDecimalString(convertedMinor) };
}

function countCell(value: number | null): ReportCell {
  if (value === null) return empty;
  return { display: formatInteger(value), csv: value };
}

/** A ratio shown as a percentage with two decimals; the CSV holds the same digits without the sign. */
function percentCell(ratio: number | null, digits = 2): ReportCell {
  if (ratio === null) return empty;
  const percent = ratio * 100;
  return { display: `${formatDecimal(percent, digits)}%`, csv: formatPlainNumber(percent, digits) };
}

/** "+6.3%" / "+0.20 pp" beside a CSV number and its unit. */
function changeCells(change: Change, format: MetricFormat): [ReportCell, ReportCell] {
  const digits = format === "percentage" ? 2 : 1;
  switch (change.kind) {
    case "relative":
      return [
        { display: formatChange(change, digits), csv: formatPlainNumber(change.value * 100, digits) },
        text("percent"),
      ];
    case "points":
      return [{ display: formatChange(change, digits), csv: formatPlainNumber(change.value, digits) }, text("percentage points")];
    case "new":
      return [{ display: "New", csv: "" }, text("new, no baseline")];
    case "unavailable":
      return [empty, text("")];
  }
}

// ---------------------------------------------------------------------------
// Summary

interface SummaryMetric {
  section: string;
  label: string;
  format: MetricFormat;
  /** Base-currency minor units, a count or a ratio. */
  value: (summary: PeriodSummary) => number | null;
}

const SUMMARY_METRICS: readonly SummaryMetric[] = [
  { section: "Revenue", label: "Revenue", format: "currency", value: (s) => s.revenueMinor },
  { section: "Revenue", label: "Refunds", format: "currency", value: (s) => s.refundsMinor },
  { section: "Revenue", label: "Expenses", format: "currency", value: (s) => s.expensesMinor },
  { section: "Revenue", label: "Net profit", format: "currency", value: (s) => s.profitMinor },
  { section: "Revenue", label: "Profit margin", format: "percentage", value: (s) => safeRatio(s.profitMinor, s.revenueMinor) },
  { section: "Revenue", label: "Completed orders", format: "integer", value: (s) => s.orders },
  { section: "Revenue", label: "Average order value", format: "currency", value: (s) => s.averageOrderValueMinor },
  { section: "Customers", label: "New customers", format: "integer", value: (s) => s.newCustomers },
  { section: "Customers", label: "Active customers", format: "integer", value: (s) => s.activeCustomers },
  { section: "Customers", label: "Visitors", format: "integer", value: (s) => s.visitors },
  { section: "Customers", label: "Conversion rate", format: "percentage", value: (s) => s.conversionRate },
  { section: "Performance", label: "Units sold", format: "integer", value: (s) => s.unitsSold },
  {
    section: "Performance",
    label: "Refund rate",
    format: "percentage",
    value: (s) => safeRatio(s.refundCount, s.orders + s.refundCount),
  },
  {
    section: "Performance",
    label: "Failed payment rate",
    format: "percentage",
    value: (s) => safeRatio(s.failedCount, s.orders + s.refundCount + s.failedCount + s.pendingCount),
  },
];

/** Notes printed under the summary so every derived figure says how it is measured. */
export const SUMMARY_NOTES = [
  "Revenue counts completed orders only. Refunds are listed by the original order date.",
  "Refund rate: refunded orders ÷ completed and refunded orders. Failed payment rate: failed charges ÷ every charge.",
  "Conversion rate: new customers ÷ visitors. Rates change in percentage points.",
];

/**
 * A summary value in the display currency. Revenue, expenses and profit are
 * converted from the same parts as the revenue table, so they reconcile.
 */
function convertSummaryValue(metric: SummaryMetric, summary: PeriodSummary, currency: CurrencyCode): number | null {
  const value = metric.value(summary);
  if (value === null || metric.format !== "currency") return value;
  if (metric.label === "Net profit") {
    return convertMinor(summary.revenueMinor, currency) - convertMinor(summary.expensesMinor, currency);
  }
  return convertMinor(value, currency);
}

/** Measured on the base-currency figures, so a change never depends on the display currency. */
function summaryChange(metric: SummaryMetric, current: PeriodSummary, previous: PeriodSummary | null): Change {
  const value = metric.value(current);
  const previousValue = previous ? metric.value(previous) : null;
  if (metric.format === "percentage") return pointChange(value, previousValue);
  return value === null ? { kind: "unavailable" } : percentChange(value, previousValue);
}

function valueCell(value: number | null, format: MetricFormat, currency: CurrencyCode): ReportCell {
  switch (format) {
    case "currency":
      return moneyCell(value, currency);
    case "integer":
      return countCell(value);
    case "percentage":
      return percentCell(value);
  }
}

const UNIT_NAMES: Record<MetricFormat, (currency: CurrencyCode) => string> = {
  currency: (currency) => currency,
  integer: () => "count",
  percentage: () => "percent",
};

function summaryTable(
  current: PeriodSummary,
  previous: PeriodSummary | null,
  comparisonName: string,
  currency: CurrencyCode,
  fileName: string,
): ReportTable {
  const rows: ReportRow[] = [];
  let section = "";
  for (const metric of SUMMARY_METRICS) {
    if (metric.section !== section) {
      section = metric.section;
      rows.push({ key: `section-${section}`, section: true, cells: [text(section)] });
    }
    const value = convertSummaryValue(metric, current, currency);
    const previousValue = previous ? convertSummaryValue(metric, previous, currency) : null;
    const change = summaryChange(metric, current, previous);
    const [changeCell, changeUnit] = changeCells(change, metric.format);
    rows.push({
      key: metric.label,
      cells: [
        text(metric.section),
        text(metric.label),
        text(UNIT_NAMES[metric.format](currency)),
        valueCell(value, metric.format, currency),
        valueCell(previousValue, metric.format, currency),
        changeCell,
        changeUnit,
      ],
    });
  }
  return {
    id: "summary",
    title: "Summary",
    description: "Headline figures for the period beside the comparison period.",
    fileName,
    columns: [
      { header: "Section", csvHeader: "Section", align: "start", csvOnly: true },
      { header: "Measure", csvHeader: "Metric", align: "start" },
      { header: "Unit", csvHeader: "Unit", align: "start", csvOnly: true },
      { header: "This period", csvHeader: "This period", align: "end" },
      { header: comparisonName, csvHeader: comparisonName, align: "end" },
      { header: "Change", csvHeader: "Change", align: "end" },
      { header: "Change unit", csvHeader: "Change unit", align: "start", csvOnly: true },
    ],
    rows,
  };
}

// ---------------------------------------------------------------------------
// Breakdowns

function revenueTable(dataset: Dataset, range: DateRange, currency: CurrencyCode, fileName: string) {
  const frame = seriesFrame(range);
  const buckets = totalsByBucket(dataset, frame.buckets);
  const revenue = convertAllocated(buckets.map((bucket) => bucket.revenueMinor), currency);
  const refunds = convertAllocated(buckets.map((bucket) => bucket.refundsMinor), currency);
  const expenses = convertAllocated(buckets.map((bucket) => bucket.expensesMinor), currency);
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
  const row = (key: string, label: string, r: number, f: number, e: number, orders: number, total = false): ReportRow => ({
    key,
    total,
    cells: [text(label), moneyCell(r, currency), moneyCell(f, currency), moneyCell(e, currency), moneyCell(r - e, currency), countCell(orders)],
  });
  const noun = bucketNoun(frame.granularity);
  const table: ReportTable = {
    id: "revenue",
    title: `Revenue by ${noun}`,
    description: `Completed revenue, refunds and expenses for each ${noun} of the period.`,
    fileName,
    columns: [
      { header: noun === "day" ? "Day" : noun === "week" ? "Week" : "Month", csvHeader: "Period", align: "start" },
      { header: "Revenue", csvHeader: `Revenue (${currency})`, align: "end" },
      { header: "Refunds", csvHeader: `Refunds (${currency})`, align: "end" },
      { header: "Expenses", csvHeader: `Expenses (${currency})`, align: "end" },
      { header: "Net", csvHeader: `Net (${currency})`, align: "end" },
      { header: "Orders", csvHeader: "Completed orders", align: "end" },
    ],
    rows: [
      ...buckets.map((bucket, index) =>
        row(
          bucket.bucket.start,
          bucketLabel(bucket.bucket, frame.granularity),
          revenue[index] ?? 0,
          refunds[index] ?? 0,
          expenses[index] ?? 0,
          bucket.orders,
        ),
      ),
      row("total", "Total", sum(revenue), sum(refunds), sum(expenses), sum(buckets.map((bucket) => bucket.orders)), true),
    ],
  };
  return { table, granularity: frame.granularity };
}

function productsTable(dataset: Dataset, range: DateRange, currency: CurrencyCode, fileName: string): ReportTable {
  const products = [...productPerformance(dataset, range)].sort(
    (a, b) => b.revenueMinor - a.revenueMinor || a.id.localeCompare(b.id),
  );
  const revenue = convertAllocated(products.map((product) => product.revenueMinor), currency);
  const totalRevenue = revenue.reduce((sum, value) => sum + value, 0);
  const totalOrders = products.reduce((sum, product) => sum + product.orders, 0);
  const totalUnits = products.reduce((sum, product) => sum + product.unitsSold, 0);
  return {
    id: "products",
    title: "Product performance",
    description: "Every product and service, highest revenue first.",
    fileName,
    columns: [
      { header: "Product", csvHeader: "Product", align: "start" },
      { header: "Category", csvHeader: "Category", align: "start" },
      { header: "Revenue", csvHeader: `Revenue (${currency})`, align: "end" },
      { header: "Units", csvHeader: "Units sold", align: "end" },
      { header: "Orders", csvHeader: "Completed orders", align: "end" },
      { header: "Conversion", csvHeader: "Conversion rate (%)", align: "end" },
      { header: "Share", csvHeader: "Share of revenue (%)", align: "end" },
    ],
    rows: [
      ...products.map((product, index) => {
        const value = revenue[index] ?? 0;
        return {
          key: product.id,
          cells: [
            text(product.name),
            text(product.category),
            moneyCell(value, currency),
            countCell(product.unitsSold),
            countCell(product.orders),
            percentCell(product.conversionRate),
            percentCell(safeRatio(value, totalRevenue), 1),
          ],
        };
      }),
      {
        key: "total",
        total: true,
        cells: [
          text("Total"),
          text(""),
          moneyCell(totalRevenue, currency),
          countCell(totalUnits),
          countCell(totalOrders),
          empty,
          percentCell(totalRevenue > 0 ? 1 : null, 1),
        ],
      },
    ],
  };
}

function channelsTable(dataset: Dataset, range: DateRange, fileName: string): ReportTable {
  const sources = sourceBreakdown(dataset, range);
  const visitors = sources.reduce((sum, source) => sum + source.visitors, 0);
  const conversions = sources.reduce((sum, source) => sum + source.conversions, 0);
  return {
    id: "channels",
    title: "Acquisition channels",
    description: "Where visitors came from and how many became customers.",
    fileName,
    columns: [
      { header: "Channel", csvHeader: "Channel", align: "start" },
      { header: "Visitors", csvHeader: "Visitors", align: "end" },
      { header: "New customers", csvHeader: "New customers", align: "end" },
      { header: "Conversion", csvHeader: "Conversion rate (%)", align: "end" },
      { header: "Share", csvHeader: "Share of new customers (%)", align: "end" },
    ],
    rows: [
      ...sources.map((source) => ({
        key: source.id,
        cells: [
          text(source.name),
          countCell(source.visitors),
          countCell(source.conversions),
          percentCell(safeRatio(source.conversions, source.visitors)),
          percentCell(conversions > 0 ? source.share : null, 1),
        ],
      })),
      {
        key: "total",
        total: true,
        cells: [
          text("Total"),
          countCell(visitors),
          countCell(conversions),
          percentCell(safeRatio(conversions, visitors)),
          percentCell(conversions > 0 ? 1 : null, 1),
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------

function overviewText(current: PeriodSummary, previous: PeriodSummary | null, comparisonLabel: string, currency: CurrencyCode): string {
  if (current.orders === 0) return "No completed orders were recorded in this period, so there is no revenue to report.";
  const revenue = convertMinor(current.revenueMinor, currency);
  const change = percentChange(current.revenueMinor, previous?.revenueMinor ?? null);
  const changeText =
    change.kind === "relative" ? `, ${formatChange(change)} ${comparisonLabel}` : change.kind === "new" ? `, up from none ${comparisonLabel}` : "";
  const profit = convertMinor(current.revenueMinor, currency) - convertMinor(current.expensesMinor, currency);
  const margin = safeRatio(current.profitMinor, current.revenueMinor);
  const orders = current.orders === 1 ? "1 completed order" : `${formatInteger(current.orders)} completed orders`;
  const profitText =
    profit >= 0
      ? `Net profit was ${formatMinorIn(profit, currency, { whole: true })}${margin === null ? "" : ` (${formatDecimal(margin * 100)}% margin)`}.`
      : `Expenses exceeded revenue, a net loss of ${formatMinorIn(Math.abs(profit), currency, { whole: true })}.`;
  const customers = current.newCustomers === 1 ? "1 new customer joined" : `${formatInteger(current.newCustomers)} new customers joined`;
  return `Revenue was ${formatMinorIn(revenue, currency, { whole: true })} from ${orders}${changeText}. ${profitText} ${customers}.`;
}

export interface ReportOptions {
  workspaceName: string;
  currency: CurrencyCode;
}

export function buildReport(dataset: Dataset, state: DateRangeState, { workspaceName, currency }: ReportOptions): Report {
  const { range, comparison: mode, preset } = state;
  const current = summarizePeriod(dataset, range);
  const comparison = summarizeComparison(dataset, range, mode);
  const comparisonLabel = describeComparison(preset, range, mode);
  const comparisonName = comparisonSeriesName(mode);
  const file = (id: ReportTableId) => csvFileName("pulse", "report", id, range.from, "to", range.to);
  const revenue = revenueTable(dataset, range, currency, file("revenue"));

  return {
    workspaceName,
    currency,
    range,
    comparison,
    comparisonLabel,
    comparisonName,
    granularity: revenue.granularity,
    dataThrough: dataset.span.to,
    overview: overviewText(current, comparison.summary, comparisonLabel, currency),
    tables: [
      summaryTable(current, comparison.summary, comparisonName, currency, file("summary")),
      revenue.table,
      productsTable(dataset, range, currency, file("products")),
      channelsTable(dataset, range, file("channels")),
    ],
  };
}

/** The rows a CSV export holds: every column, section headings left out. */
export function reportCsvRows(table: ReportTable): { headers: string[]; rows: CsvValue[][] } {
  return {
    headers: table.columns.map((column) => column.csvHeader),
    rows: table.rows.filter((row) => !row.section).map((row) => row.cells.map((cell) => cell.csv)),
  };
}
