import { describe, expect, it } from "vitest";
import type { DashboardMetric } from "@/types/domain";
import type { TrendPoint } from "./chart-series";
import { missingComparison, trendSummary } from "./summaries";

const metric = (value: number | null, previousValue: number | null, format: DashboardMetric["format"] = "currency"): DashboardMetric => ({
  id: "metric",
  label: "Metric",
  value,
  previousValue,
  format,
  comparisonLabel: "vs previous 7 days",
});
const point: TrendPoint = {
  date: "2026-09-24",
  axisLabel: "Sep 24",
  label: "Thu, Sep 24",
  partial: false,
  value: 120_000,
  previousValue: null,
  previousLabel: null,
};
const base = { points: [point, { ...point, date: "2026-09-25" }], granularity: "day", mode: "previous-period", peak: point, currency: "USD" } as const;

describe("trendSummary", () => {
  it("calls tiny moves in line and growth from nothing new", () => {
    expect(trendSummary({ ...base, id: "revenue", metric: metric(1_000_000, 999_900) })).toBe(
      "Revenue totalled $10,000, in line with the previous 7 days. The strongest day was Thu, Sep 24, with $1,200.",
    );
    expect(trendSummary({ ...base, id: "orders", metric: metric(12, 0, "integer"), peak: undefined })).toBe(
      "Completed orders totalled 12, up from none vs previous 7 days.",
    );
  });

  it("states ratios in percentage points and leaves out the peak for a single point", () => {
    expect(
      trendSummary({ ...base, id: "conversionRate", points: [point], metric: metric(0.0125, 0.0105, "percentage") }),
    ).toBe("The conversion rate rose 0.20 percentage points to 1.25% vs previous 7 days.");
    expect(trendSummary({ ...base, id: "conversionRate", metric: metric(null, null, "percentage") })).toBe(
      "There were no visitors in this period, so there is no conversion rate.",
    );
  });

  it("names the missing comparison period", () => {
    expect(missingComparison("previous-year")).toBe("the same period last year");
    expect(missingComparison("previous-period")).toBe("the previous period");
  });
});
