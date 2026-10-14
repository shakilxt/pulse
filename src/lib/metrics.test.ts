import { describe, expect, it } from "vitest";
import type { DashboardMetric } from "@/types/domain";
import type { PeriodSummary } from "./aggregations";
import {
  METRIC_DEFINITIONS,
  OVERVIEW_METRICS,
  buildMetric,
  changeSentiment,
  describeComparison,
  isMetricId,
  metricChange,
} from "./metrics";

function summary(overrides: Partial<PeriodSummary> = {}): PeriodSummary {
  return {
    range: { from: "2026-09-01", to: "2026-09-30" },
    revenueMinor: 5_000_000,
    orders: 300,
    unitsSold: 320,
    refundsMinor: 40_000,
    refundCount: 4,
    failedCount: 6,
    pendingCount: 2,
    expensesMinor: 3_200_000,
    newCustomers: 120,
    visitors: 12_000,
    profitMinor: 1_800_000,
    activeCustomers: 260,
    conversionRate: 0.01,
    averageOrderValueMinor: 16_667,
    ...overrides,
  };
}

describe("buildMetric", () => {
  it("builds the four overview KPIs from summaries", () => {
    const current = summary();
    const previous = summary({ revenueMinor: 4_000_000, conversionRate: 0.0125 });
    const metrics = OVERVIEW_METRICS.map((id) => buildMetric(id, current, previous, "vs previous 30 days"));
    expect(metrics.map((metric) => [metric.id, metric.format])).toEqual([
      ["revenue", "currency"],
      ["orders", "integer"],
      ["activeCustomers", "integer"],
      ["conversionRate", "percentage"],
    ]);
    expect(metrics[0]).toEqual({
      id: "revenue",
      label: "Total revenue",
      value: 5_000_000,
      previousValue: 4_000_000,
      format: "currency",
      comparisonLabel: "vs previous 30 days",
    });
  });

  it("marks the previous value missing when there is no comparison period", () => {
    expect(buildMetric("orders", summary(), null, "vs previous 30 days").previousValue).toBeNull();
  });
});

describe("isMetricId", () => {
  it("recognises defined metrics only", () => {
    expect(isMetricId("revenue")).toBe(true);
    expect(isMetricId("toString")).toBe(false);
    expect(isMetricId("profitability")).toBe(false);
  });
});

describe("metricChange", () => {
  const metric = (overrides: Partial<DashboardMetric>): DashboardMetric => ({
    id: "x",
    label: "X",
    value: 125,
    previousValue: 100,
    format: "integer",
    comparisonLabel: "",
    ...overrides,
  });

  it("measures counts and money relatively", () => {
    expect(metricChange(metric({}))).toEqual({ kind: "relative", value: 0.25 });
    expect(metricChange(metric({ format: "currency", previousValue: 0 }))).toEqual({ kind: "new" });
  });

  it("measures ratios in percentage points", () => {
    const change = metricChange(metric({ format: "percentage", value: 0.01, previousValue: 0.0125 }));
    expect(change.kind).toBe("points");
    if (change.kind === "points") expect(change.value).toBeCloseTo(-0.25, 10);
  });

  it("is unavailable without a comparison or a value", () => {
    expect(metricChange(metric({ previousValue: null }))).toEqual({ kind: "unavailable" });
    expect(metricChange(metric({ value: null }))).toEqual({ kind: "unavailable" });
    expect(metricChange(metric({ format: "percentage", value: null, previousValue: 0.01 }))).toEqual({
      kind: "unavailable",
    });
  });
});

describe("changeSentiment", () => {
  it("respects each metric's polarity", () => {
    expect(changeSentiment({ kind: "relative", value: 0.1 }, METRIC_DEFINITIONS.revenue.polarity)).toBe("positive");
    expect(changeSentiment({ kind: "relative", value: 0.1 }, METRIC_DEFINITIONS.expenses.polarity)).toBe("negative");
    expect(changeSentiment({ kind: "relative", value: -0.1 }, METRIC_DEFINITIONS.refunds.polarity)).toBe("positive");
    expect(changeSentiment({ kind: "points", value: 0 }, "higher-is-better")).toBe("neutral");
    expect(changeSentiment({ kind: "new" }, "lower-is-better")).toBe("negative");
    expect(changeSentiment({ kind: "unavailable" }, "higher-is-better")).toBe("neutral");
  });
});

describe("describeComparison", () => {
  const range = { from: "2026-09-01", to: "2026-09-30" };

  it("names the comparison period actually used", () => {
    expect(describeComparison("30d", range, "previous-period")).toBe("vs previous 30 days");
    expect(describeComparison("12m", range, "previous-period")).toBe("vs previous 12 months");
    expect(describeComparison("ytd", range, "previous-year")).toBe("vs same period last year");
    expect(describeComparison("ytd", { from: "2026-01-01", to: "2026-09-30" }, "previous-period")).toBe(
      "vs previous 273 days",
    );
    expect(describeComparison("custom", { from: "2026-09-10", to: "2026-09-24" }, "previous-period")).toBe(
      "vs previous 15 days",
    );
    expect(describeComparison("custom", { from: "2026-09-10", to: "2026-09-10" }, "previous-period")).toBe(
      "vs previous day",
    );
  });
});
