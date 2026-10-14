import { describe, expect, it } from "vitest";
import { generateDataset } from "@/data/generate";
import {
  acquisitionSeries,
  categoryBreakdown,
  isFullyCovered,
  productPerformance,
  revenueSeries,
  sourceBreakdown,
  summarizeComparison,
  summarizePeriod,
  totalsByBucket,
  transactionsInRange,
} from "./aggregations";
import {
  type DateRange,
  RANGE_PRESETS,
  alignComparisonBuckets,
  bucketize,
  granularityFor,
  resolvePresetRange,
} from "./dates";

const dataset = generateDataset();
const anchor = dataset.span.to;

/** Every preset, plus custom ranges that cross months, the leap day and the data start. */
const RANGES: Array<[string, DateRange]> = [
  ...RANGE_PRESETS.map((preset): [string, DateRange] => [preset, resolvePresetRange(preset, anchor)]),
  ["custom 45 days", { from: "2026-02-10", to: "2026-03-26" }],
  ["leap day", { from: "2024-02-20", to: "2024-03-05" }],
  ["whole span", dataset.span],
];

function ledgerTotals(range: DateRange) {
  const inRange = dataset.transactions.filter((item) => item.date >= range.from && item.date <= range.to);
  const completed = inRange.filter((item) => item.status === "completed");
  return {
    revenueMinor: completed.reduce((sum, item) => sum + item.amountMinor, 0),
    orders: completed.length,
    unitsSold: completed.reduce((sum, item) => sum + item.quantity, 0),
    activeCustomers: new Set(completed.map((item) => item.customerId)).size,
    refundsMinor: inRange
      .filter((item) => item.status === "refunded")
      .reduce((sum, item) => sum + item.amountMinor, 0),
    newCustomers: dataset.customers.filter((item) => item.joinedAt >= range.from && item.joinedAt <= range.to)
      .length,
    visitors: dataset.traffic
      .filter((row) => row.date >= range.from && row.date <= range.to)
      .reduce((sum, row) => sum + row.visitors, 0),
    expensesMinor: dataset.expenses
      .filter((row) => row.date >= range.from && row.date <= range.to)
      .reduce((sum, row) => sum + row.amountMinor, 0),
  };
}

const sum = <T>(items: readonly T[], value: (item: T) => number) =>
  items.reduce((total, item) => total + value(item), 0);

describe.each(RANGES)("reconciliation: %s", (_, range) => {
  const summary = summarizePeriod(dataset, range);
  const expected = ledgerTotals(range);
  const buckets = bucketize(range, granularityFor(range));

  it("summarises exactly what the ledger holds", () => {
    expect(summary).toMatchObject(expected);
    expect(summary.profitMinor).toBe(expected.revenueMinor - expected.expensesMinor);
    expect(summary.conversionRate).toBeCloseTo(expected.newCustomers / expected.visitors, 12);
    expect(transactionsInRange(dataset, range).every((item) => item.date >= range.from && item.date <= range.to)).toBe(
      true,
    );
  });

  it("chart series add up to the KPIs", () => {
    const series = revenueSeries(dataset, buckets);
    expect(series.map((point) => point.date)).toEqual(buckets.map((bucket) => bucket.start));
    expect(sum(series, (point) => point.revenueMinor)).toBe(summary.revenueMinor);
    expect(sum(series, (point) => point.expensesMinor)).toBe(summary.expensesMinor);
    expect(sum(series, (point) => point.orders)).toBe(summary.orders);

    const acquisition = acquisitionSeries(dataset, buckets);
    expect(sum(acquisition, (point) => point.newCustomers)).toBe(summary.newCustomers);
    expect(sum(acquisition, (point) => point.visitors)).toBe(summary.visitors);
    for (const point of acquisition) {
      expect(sum(Object.values(point.bySource), (value) => value)).toBe(point.newCustomers);
    }
  });

  it("product and category breakdowns add up to revenue and orders", () => {
    const products = productPerformance(dataset, range);
    expect(products.map((product) => product.id)).toEqual(dataset.products.map((product) => product.id));
    expect(sum(products, (product) => product.revenueMinor)).toBe(summary.revenueMinor);
    expect(sum(products, (product) => product.orders)).toBe(summary.orders);
    expect(sum(products, (product) => product.unitsSold)).toBe(summary.unitsSold);
    for (const product of products) {
      if (product.conversionRate !== null) {
        expect(product.conversionRate).toBeGreaterThanOrEqual(0);
        expect(product.conversionRate).toBeLessThan(1);
      }
    }

    const categories = categoryBreakdown(dataset, range);
    expect(sum(categories, (category) => category.revenueMinor)).toBe(summary.revenueMinor);
    expect(sum(categories, (category) => category.orders)).toBe(summary.orders);
    expect(sum(categories, (category) => category.share)).toBeCloseTo(1, 12);
  });

  it("acquisition sources add up to new customers and visitors", () => {
    const sources = sourceBreakdown(dataset, range);
    expect(sum(sources, (source) => source.conversions)).toBe(summary.newCustomers);
    expect(sum(sources, (source) => source.visitors)).toBe(summary.visitors);
    expect(sum(sources, (source) => source.share)).toBeCloseTo(1, 12);
  });
});

describe("comparison periods", () => {
  it("exist for every preset", () => {
    for (const preset of RANGE_PRESETS) {
      const range = resolvePresetRange(preset, anchor);
      expect(summarizeComparison(dataset, range, "previous-period").summary).not.toBeNull();
      expect(summarizeComparison(dataset, range, "previous-year").summary).not.toBeNull();
    }
  });

  it("are withheld when they would reach before the data starts", () => {
    const firstMonth = { from: "2024-01-01", to: "2024-01-31" };
    expect(summarizeComparison(dataset, firstMonth, "previous-period").summary).toBeNull();
    expect(summarizeComparison(dataset, firstMonth, "previous-year").summary).toBeNull();
    expect(isFullyCovered(dataset, { from: "2023-12-31", to: "2024-01-31" })).toBe(false);
  });

  it("aligned comparison buckets add up to the comparison summary", () => {
    for (const [, range] of RANGES.slice(0, 6)) {
      for (const mode of ["previous-period", "previous-year"] as const) {
        const comparison = summarizeComparison(dataset, range, mode);
        if (!comparison.summary) continue;
        const aligned = alignComparisonBuckets(bucketize(range, granularityFor(range)), range, mode);
        const totals = totalsByBucket(dataset, aligned);
        expect(sum(totals, (point) => point.revenueMinor)).toBe(comparison.summary.revenueMinor);
        expect(sum(totals, (point) => point.newCustomers)).toBe(comparison.summary.newCustomers);
      }
    }
  });
});

describe("ranges outside the data", () => {
  it("count nothing outside the span", () => {
    const summary = summarizePeriod(dataset, { from: "2023-01-01", to: "2023-12-31" });
    expect(summary.revenueMinor).toBe(0);
    expect(summary.visitors).toBe(0);
    expect(summary.conversionRate).toBeNull();
    expect(summary.averageOrderValueMinor).toBeNull();
  });
});

describe("plausibility of the demo story", () => {
  const twelveMonths = summarizePeriod(dataset, resolvePresetRange("12m", anchor));
  const previous = summarizeComparison(dataset, resolvePresetRange("12m", anchor), "previous-period").summary;

  it("shows a growing, profitable studio", () => {
    expect(previous).not.toBeNull();
    const growth = twelveMonths.revenueMinor / (previous?.revenueMinor ?? 1) - 1;
    expect(growth).toBeGreaterThan(0.15);
    expect(growth).toBeLessThan(0.7);
    const margin = twelveMonths.profitMinor / twelveMonths.revenueMinor;
    expect(margin).toBeGreaterThan(0.15);
    expect(margin).toBeLessThan(0.5);
    expect(twelveMonths.conversionRate).toBeGreaterThan(0.005);
    expect(twelveMonths.conversionRate).toBeLessThan(0.03);
  });

  it("has revenue in every month", () => {
    const months = revenueSeries(dataset, bucketize(dataset.span, "month"));
    expect(months).toHaveLength(33);
    for (const month of months) expect(month.revenueMinor).toBeGreaterThan(0);
  });
});
