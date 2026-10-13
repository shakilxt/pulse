import { describe, expect, it } from "vitest";
import { generateDataset } from "@/data/generate";
import { summarizeComparison, summarizePeriod } from "./aggregations";
import { RANGE_PRESETS } from "./dates";
import { OVERVIEW_METRICS, buildMetric } from "./metrics";
import {
  RECENT_TRANSACTION_LIMIT,
  TOP_PRODUCT_LIMIT,
  buildOverview,
  describePeriod,
  salutationFor,
} from "./overview";
import { type DateRangeState, parseDateRangeParams } from "./search-params";

const dataset = generateDataset();
const stateFor = (params: Record<string, string>) =>
  parseDateRangeParams(params, { bounds: dataset.span, defaultPreset: "30d" });
const overviewFor = (state: DateRangeState) => buildOverview(dataset, state, "Fernhill Studio");

describe.each(RANGE_PRESETS)("overview for %s", (preset) => {
  const state = stateFor({ range: preset });
  const overview = overviewFor(state);
  const current = summarizePeriod(dataset, state.range);

  it("builds the KPIs from the same summaries as the calculation layer", () => {
    const previous = summarizeComparison(dataset, state.range, state.comparison).summary;
    expect(overview.metrics).toEqual(
      OVERVIEW_METRICS.map((id) => buildMetric(id, current, previous, overview.comparisonLabel)),
    );
  });

  it("ranks top products by revenue from the period", () => {
    expect(overview.topProducts.length).toBeLessThanOrEqual(TOP_PRODUCT_LIMIT);
    const revenues = overview.topProducts.map((product) => product.revenueMinor);
    expect(revenues).toEqual([...revenues].sort((a, b) => b - a));
    for (const product of overview.topProducts) {
      expect(product.revenueMinor).toBeGreaterThan(0);
      expect(product.share).toBeCloseTo(product.revenueMinor / current.revenueMinor, 12);
    }
  });

  it("splits revenue by category in whole percentages that add up to 100", () => {
    expect(overview.categories.reduce((total, row) => total + row.revenueMinor, 0)).toBe(current.revenueMinor);
    expect(overview.categories.reduce((total, row) => total + row.sharePercent, 0)).toBe(100);
    expect(overview.acquisition.sources.reduce((total, row) => total + row.sharePercent, 0)).toBe(100);
  });

  it("lists the newest transactions inside the period", () => {
    const rows = overview.recentTransactions;
    expect(rows).toHaveLength(RECENT_TRANSACTION_LIMIT);
    const dates = rows.map((row) => row.date);
    expect(dates).toEqual([...dates].sort().reverse());
    for (const row of rows) {
      expect(row.date >= state.range.from && row.date <= state.range.to).toBe(true);
      expect(row.customerEmail).toMatch(/@example\.com$/);
    }
  });
});

describe("summaries", () => {
  it("describe the default 30 days in words that match the KPIs", () => {
    const overview = overviewFor(stateFor({}));
    expect(overview.greeting.summary).toBe(
      "Fernhill Studio earned $57,548 from 350 completed orders over the last 30 days, 6.3% more than the previous 30 days. Brand Identity Sprint led sales.",
    );
    expect(overview.revenue.summary).toBe(
      "Revenue rose 6.3% to $57,548 vs previous 30 days. The strongest day was Fri, Sep 25, with $5,865.",
    );
    expect(overview.cashflow.summary).toMatch(
      /^Expenses were \$35,890, leaving a net profit of \$21,658 \(37\.6% margin\)\. Revenue exceeded expenses in \d of 5 weeks\.$/,
    );
    expect(overview.cashflow.granularity).toBe("week");
    expect(overview.acquisition.summary).toMatch(/^153 new customers from 14,534 visitors, a 1\.05% conversion rate\./);
  });

  it("say so when there is no comparison period", () => {
    const overview = overviewFor(stateFor({ from: "2024-01-01", to: "2024-02-10" }));
    expect(overview.comparison.summary).toBeNull();
    expect(overview.greeting.summary).toMatch(/completed orders in the period Jan 1\u2009–\u2009Feb 10, 2024\./);
    expect(overview.revenue.summary).toContain("There is no comparison data for the previous period.");
    expect(overview.metrics.every((metric) => metric.previousValue === null)).toBe(true);
  });

  it("fall back to empty-state wording for a period without activity", () => {
    const overview = overviewFor({
      preset: "custom",
      range: { from: "2023-06-01", to: "2023-06-30" },
      comparison: "previous-period",
    });
    expect(overview.greeting.summary).toBe(
      "Fernhill Studio recorded no completed orders in the period Jun 1\u2009–\u200930, 2023. Try a longer date range.",
    );
    expect(overview.revenue.summary).toBe("No revenue was recorded in this period.");
    expect(overview.acquisition.summary).toBe("No new customers joined in this period.");
    expect(overview.topProducts).toEqual([]);
    expect(overview.recentTransactions).toEqual([]);
  });

  it("greet by the demo clock and name the period", () => {
    expect(salutationFor("2026-09-30T08:00:00Z")).toBe("Good morning");
    expect(salutationFor("2026-09-30T17:40:00Z")).toBe("Good afternoon");
    expect(salutationFor("2026-09-30T19:00:00Z")).toBe("Good evening");
    expect(describePeriod(stateFor({ range: "ytd" }))).toBe("so far this year");
    expect(describePeriod(stateFor({ from: "2026-09-10", to: "2026-09-10" }))).toBe("on Sep 10, 2026");
  });
});
