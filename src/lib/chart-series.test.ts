import { describe, expect, it } from "vitest";
import { generateDataset } from "@/data/generate";
import { summarizeComparison, summarizePeriod } from "./aggregations";
import {
  acquisitionTrend,
  bucketAxisLabel,
  bucketLabel,
  cashflowSeries,
  peakPoint,
  revenueTrend,
  seriesFrame,
} from "./chart-series";
import { type DateRange, resolvePresetRange } from "./dates";

const dataset = generateDataset();
const sum = <T>(items: readonly T[], value: (item: T) => number) => items.reduce((total, item) => total + value(item), 0);

describe("bucket labels", () => {
  it("names days, weeks and months unambiguously", () => {
    expect(bucketLabel({ start: "2026-09-14", end: "2026-09-14", days: 1, partial: false }, "day")).toBe("Mon, Sep 14");
    expect(bucketAxisLabel({ start: "2026-09-14", end: "2026-09-14", days: 1, partial: false }, "day")).toBe("Sep 14");
    expect(bucketLabel({ start: "2026-09-08", end: "2026-09-14", days: 7, partial: false }, "week")).toBe(
      "Sep 8\u2009–\u200914, 2026",
    );
    expect(bucketLabel({ start: "2026-08-30", end: "2026-09-05", days: 7, partial: false }, "week")).toBe(
      "Aug 30\u2009–\u2009Sep 5, 2026",
    );
    expect(bucketLabel({ start: "2026-09-01", end: "2026-09-30", days: 30, partial: false }, "month")).toBe("Sep 2026");
    expect(bucketAxisLabel({ start: "2026-09-01", end: "2026-09-30", days: 30, partial: false }, "month")).toBe("Sep");
  });

  it("shows the exact dates of a partial month", () => {
    expect(bucketLabel({ start: "2026-09-10", end: "2026-09-30", days: 21, partial: true }, "month")).toBe(
      "Sep 10\u2009–\u200930, 2026",
    );
  });
});

const RANGES: Array<[string, DateRange]> = [
  ["30 days", resolvePresetRange("30d", dataset.span.to)],
  ["90 days", resolvePresetRange("90d", dataset.span.to)],
  ["12 months", resolvePresetRange("12m", dataset.span.to)],
  ["custom", { from: "2025-02-10", to: "2025-07-19" }],
];

describe.each(RANGES)("series for %s", (_, range) => {
  const frame = seriesFrame(range);
  const summary = summarizePeriod(dataset, range);

  it("revenue trend adds up to the period and its comparison", () => {
    const points = revenueTrend(dataset, frame, "previous-period");
    expect(points).toHaveLength(frame.buckets.length);
    expect(sum(points, (point) => point.revenueMinor)).toBe(summary.revenueMinor);
    const comparison = summarizeComparison(dataset, range, "previous-period").summary;
    expect(sum(points, (point) => point.previousRevenueMinor ?? 0)).toBe(comparison?.revenueMinor);
    for (const point of points) expect(point.previousLabel).not.toBeNull();
  });

  it("cash flow and acquisition add up to the period", () => {
    const cashflow = cashflowSeries(dataset, frame);
    expect(sum(cashflow, (point) => point.expensesMinor)).toBe(summary.expensesMinor);
    expect(sum(cashflow, (point) => point.profitMinor)).toBe(summary.profitMinor);
    const acquisition = acquisitionTrend(dataset, frame);
    expect(sum(acquisition, (point) => point.newCustomers)).toBe(summary.newCustomers);
    expect(sum(acquisition, (point) => point.visitors)).toBe(summary.visitors);
    for (const point of acquisition) {
      expect(point.conversionRate).toBeCloseTo(point.newCustomers / point.visitors, 12);
    }
  });
});

describe("seriesFrame", () => {
  it("follows the range length by default", () => {
    expect(seriesFrame(resolvePresetRange("30d", dataset.span.to)).granularity).toBe("day");
    expect(seriesFrame(resolvePresetRange("90d", dataset.span.to)).granularity).toBe("week");
  });

  it("steps up to coarser buckets until the series fits", () => {
    const fit = (preset: "7d" | "30d" | "90d" | "12m") =>
      seriesFrame(resolvePresetRange(preset, dataset.span.to), { maxPoints: 16 });
    expect([fit("7d"), fit("30d"), fit("90d"), fit("12m")].map((frame) => [frame.granularity, frame.buckets.length])).toEqual([
      ["day", 7],
      ["week", 5],
      ["week", 13],
      ["month", 12],
    ]);
    expect(seriesFrame(dataset.span, { maxPoints: 16 }).granularity).toBe("month");
  });
});

describe("revenueTrend", () => {
  it("leaves out the comparison when it would reach before the data starts", () => {
    const points = revenueTrend(dataset, seriesFrame({ from: "2024-01-01", to: "2024-02-10" }), "previous-period");
    expect(points.every((point) => point.previousRevenueMinor === null && point.previousLabel === null)).toBe(true);
  });

  it("lines each month up with the same month last year", () => {
    const points = revenueTrend(dataset, seriesFrame(resolvePresetRange("ytd", dataset.span.to)), "previous-year");
    expect(points.map((point) => [point.label, point.previousLabel]).slice(0, 2)).toEqual([
      ["Jan 2026", "Jan 2025"],
      ["Feb 2026", "Feb 2025"],
    ]);
  });
});

describe("peakPoint", () => {
  it("returns the largest value, earliest first on a tie", () => {
    const points = [
      { id: "a", value: 2 },
      { id: "b", value: 5 },
      { id: "c", value: 5 },
    ];
    expect(peakPoint(points, (point) => point.value)?.id).toBe("b");
    expect(peakPoint([], () => 0)).toBeUndefined();
  });
});
