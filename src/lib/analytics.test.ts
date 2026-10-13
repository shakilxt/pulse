import { describe, expect, it } from "vitest";
import { generateDataset } from "@/data/generate";
import { summarizeComparison, summarizePeriod } from "./aggregations";
import {
  ANALYTICS_DEFAULT_PRESET,
  COMPARISON_TABLE_METRICS,
  buildAnalytics,
  parseTrendMetric,
} from "./analytics";
import { RANGE_PRESETS } from "./dates";
import { TREND_METRICS, buildMetric } from "./metrics";
import { buildOverview } from "./overview";
import { parseDateRangeParams } from "./search-params";

const dataset = generateDataset();
const stateFor = (params: Record<string, string>) =>
  parseDateRangeParams(params, { bounds: dataset.span, defaultPreset: ANALYTICS_DEFAULT_PRESET });
const sum = <T>(items: readonly T[], value: (item: T) => number) => items.reduce((total, item) => total + value(item), 0);

describe("parseTrendMetric", () => {
  it("accepts the chartable metrics and falls back to revenue", () => {
    expect(parseTrendMetric("conversionRate")).toBe("conversionRate");
    expect(parseTrendMetric(["orders", "revenue"])).toBe("orders");
    for (const value of [undefined, "", "profit", "activeCustomers", "toString", "__proto__"]) {
      expect(parseTrendMetric(value)).toBe("revenue");
    }
  });
});

describe.each(RANGE_PRESETS.flatMap((preset) => [
  [preset, "previous-period"],
  [preset, "previous-year"],
] as const))("analytics for %s, compared with %s", (preset, compare) => {
  const state = stateFor({ range: preset, compare });
  const current = summarizePeriod(dataset, state.range);
  const previous = summarizeComparison(dataset, state.range, compare).summary;

  it("computes every figure from the same summaries as the KPIs", () => {
    const analytics = buildAnalytics(dataset, state, "revenue");
    const expected = (id: (typeof COMPARISON_TABLE_METRICS)[number]) => buildMetric(id, current, previous, analytics.comparisonLabel);
    expect(analytics.comparisonTable).toEqual(COMPARISON_TABLE_METRICS.map(expected));
    expect(analytics.selector).toEqual(TREND_METRICS.map((id) => ({ id, metric: expected(id) })));
  });

  it.each(TREND_METRICS)("draws %s with points that reconcile with the period", (metric) => {
    const { trend, selector } = buildAnalytics(dataset, state, metric);
    const selected = selector.find((item) => item.id === metric)?.metric;
    const value = selected?.value;
    if (metric === "conversionRate") {
      expect(trend.variant).toBe("line");
      expect(value).toBeCloseTo(current.newCustomers / current.visitors, 12);
    } else {
      expect(trend.variant).toBe("area");
      expect(sum(trend.points, (point) => point.value ?? 0)).toBe(value);
      if (previous) expect(sum(trend.points, (point) => point.previousValue ?? 0)).toBe(selected?.previousValue);
    }
    const peak = trend.points.find((point) => point.date === trend.peakDate);
    expect(peak?.value).toBe(Math.max(...trend.points.filter((point) => !point.partial).map((point) => point.value ?? 0)));
  });

  it("splits new customers by channel and charges by status without losing any", () => {
    const { channels, volume } = buildAnalytics(dataset, state, "revenue");
    expect(sum(channels.rows, (row) => row.conversions)).toBe(current.newCustomers);
    expect(sum(channels.rows, (row) => row.visitors)).toBe(current.visitors);
    expect(sum(channels.rows, (row) => row.sharePercent)).toBe(100);
    if (previous) expect(sum(channels.rows, (row) => row.previousConversions ?? 0)).toBe(previous.newCustomers);
    else expect(channels.rows.every((row) => row.previousConversions === null)).toBe(true);

    const byStatus = Object.fromEntries(volume.rows.map((row) => [row.status, row]));
    expect(byStatus.completed?.count).toBe(current.orders);
    expect(byStatus.completed?.amountMinor).toBe(current.revenueMinor);
    expect(byStatus.refunded?.count).toBe(current.refundCount);
    expect(byStatus.refunded?.amountMinor).toBe(current.refundsMinor);
    expect(byStatus.pending?.count).toBe(current.pendingCount);
    expect(byStatus.failed?.count).toBe(current.failedCount);
    expect(volume.total).toBe(current.orders + current.refundCount + current.pendingCount + current.failedCount);
    expect(sum(volume.rows, (row) => row.sharePercent)).toBeCloseTo(100, 9);
  });
});

describe("analytics wording", () => {
  it("describes the default quarter of revenue with statistics", () => {
    const analytics = buildAnalytics(dataset, stateFor({}), "revenue");
    expect(analytics.comparisonLabel).toBe("vs previous 90 days");
    expect(analytics.trend.summary).toBe(
      "Revenue rose 18.3% to $166,690 vs previous 90 days. The strongest week was Aug 27 – Sep 2, 2026, with $16,261.",
    );
    expect(analytics.trend.stats).toEqual([
      { label: "Total", value: "$166,690", detail: null },
      { label: "Daily average", value: "$1,852", detail: "over 90 days" },
      { label: "Strongest week", value: "$16,261", detail: "Aug 27 – Sep 2, 2026" },
      { label: "Weakest week", value: "$9,811", detail: "Aug 13 – 19, 2026" },
      { label: "Previous period", value: "$140,944", detail: "Apr 4 – Jul 2, 2026" },
    ]);
    expect(analytics.trend.statsNote).toBe("Strongest and weakest leave out the partial week at the edge of the range.");
    expect(analytics.channels.summary).toBe(
      "Organic search brought the most new customers (39%). Referrals converted visitors best, at 1.85%.",
    );
    expect(analytics.volume.summary).toBe(
      "1,019 charges were attempted: 96.0% completed, 0.4% are pending, 2.7% were refunded and 0.9% failed.",
    );
  });

  it("reports conversion changes in percentage points", () => {
    const { trend } = buildAnalytics(dataset, stateFor({}), "conversionRate");
    expect(trend.summary).toMatch(/^The conversion rate fell 0\.01 percentage points to 1\.03% vs previous 90 days\. The highest week was /);
    expect(trend.stats[0]).toEqual({ label: "For the period", value: "1.03%", detail: "420 new customers from 40,586 visitors" });
    expect(trend.stats.map((stat) => stat.label)).toEqual(["For the period", "Highest week", "Lowest week", "Previous period"]);
  });

  it("names the comparison as last year and says when it has no data", () => {
    const analytics = buildAnalytics(dataset, stateFor({ from: "2024-03-01", to: "2024-05-31", compare: "previous-year" }), "newCustomers");
    expect(analytics.comparison.summary).toBeNull();
    expect(analytics.trend.summary).toMatch(/^New customers totalled 187\. There is no comparison data for the same period last year\./);
    expect(analytics.trend.stats.at(-1)).toEqual({ label: "Same period last year", value: "—", detail: "No data for this period" });
    expect(analytics.trend.points.every((point) => point.previousValue === null)).toBe(true);
  });

  it("falls back to empty states for a day without orders", () => {
    const state = stateFor({ from: "2024-01-21", to: "2024-01-21" });
    const revenue = buildAnalytics(dataset, state, "revenue");
    expect(revenue.trend.empty).toBe(true);
    expect(revenue.trend.peakDate).toBeNull();
    expect(revenue.trend.summary).toBe("No revenue was recorded in this period.");
    expect(revenue.trend.stats.map((stat) => stat.label)).toEqual(["Total", "Daily average", "Previous period"]);
    expect(buildAnalytics(dataset, state, "orders").trend.summary).toBe("No completed orders were recorded in this period.");
  });

  it("agrees with the overview on the same period", () => {
    const state = stateFor({ range: "30d" });
    const analytics = buildAnalytics(dataset, state, "revenue");
    const overview = buildOverview(dataset, state, "Fernhill Studio");
    expect(analytics.trend.points).toEqual(overview.revenue.points);
    expect(analytics.trend.summary).toBe(overview.revenue.summary);
    expect(analytics.cashflow).toEqual(overview.cashflow);
  });
});
