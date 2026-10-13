import { describe, expect, it } from "vitest";
import { generateDataset } from "@/data/generate";
import { summarizePeriod } from "./aggregations";
import { RANGE_PRESETS } from "./dates";
import {
  MIN_LEADER_ORDERS,
  PRODUCT_SORT_KEYS,
  PRODUCT_SORT_OPTIONS,
  PRODUCTS_DEFAULT_PRESET,
  buildProductPerformance,
  parseProductQuery,
} from "./products";

const dataset = generateDataset();
const view = (params: Record<string, string> = {}, currency: "USD" | "EUR" = "USD") =>
  buildProductPerformance(dataset, parseProductQuery(params, { bounds: dataset.span, defaultPreset: PRODUCTS_DEFAULT_PRESET }), currency);

describe("parseProductQuery", () => {
  it("defaults to the last 90 days, highest revenue first, charted by revenue", () => {
    const query = parseProductQuery({}, { bounds: dataset.span, defaultPreset: PRODUCTS_DEFAULT_PRESET });
    expect(query).toMatchObject({ search: "", sort: { key: "revenue", direction: "desc" }, chartMetric: "revenue" });
    expect(query.dates).toMatchObject({ preset: "90d", range: { from: "2026-07-03", to: "2026-09-30" } });
  });

  it("falls back to defaults for invalid values", () => {
    const query = parseProductQuery(
      { sort: "price.up", metric: "profit", range: "5y" },
      { bounds: dataset.span, defaultPreset: "30d" },
    );
    expect(query).toMatchObject({ sort: { key: "revenue", direction: "desc" }, chartMetric: "revenue" });
    expect(query.dates.preset).toBe("30d");
  });
});

describe("buildProductPerformance", () => {
  it.each(RANGE_PRESETS)("reconciles product revenue with the period total (%s)", (range) => {
    const result = view({ range });
    const summary = summarizePeriod(dataset, result.range);
    expect(result.rows).toHaveLength(dataset.products.length);
    expect(result.shownRevenueMinor).toBe(summary.revenueMinor);
    expect(result.totalRevenueMinor).toBe(summary.revenueMinor);
    expect(result.rows.reduce((sum, row) => sum + row.orders, 0)).toBe(summary.orders);
    expect(result.rows.reduce((sum, row) => sum + row.unitsSold, 0)).toBe(summary.unitsSold);
    expect(result.rows.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1, 10);
  });

  it("compares each product with the same product in the comparison period", () => {
    const result = view({ range: "30d" });
    const previous = view({ from: result.comparison.range.from, to: result.comparison.range.to });
    for (const row of result.rows) {
      const before = previous.rows.find((item) => item.id === row.id);
      expect(row.previous?.revenueMinor).toBe(before?.revenueMinor);
      if (row.revenueChange.kind === "relative" && before) {
        expect(row.revenueChange.value).toBeCloseTo((row.revenueMinor - before.revenueMinor) / before.revenueMinor, 10);
      }
      // Conversion changes are percentage points, never relative.
      expect(["points", "unavailable"]).toContain(row.conversionChange.kind);
    }
  });

  it("has no comparison when the comparison period starts before the data", () => {
    const result = view({ from: "2024-01-01", to: "2024-01-31" });
    expect(result.comparison.summary).toBeNull();
    expect(result.rows.every((row) => row.previous === null && row.revenueChange.kind === "unavailable")).toBe(true);
    expect(result.leaders.some((leader) => leader.id === "growth")).toBe(false);
  });

  it("searches names, categories and IDs", () => {
    expect(view({ q: "canopy" }).rows.map((row) => row.name)).toEqual(["Canopy UI Kit"]);
    expect(view({ q: "pr12" }).rows.map((row) => row.id)).toEqual(["PR-12"]);
    const services = view({ q: "services" });
    expect(services.filtered).toBe(true);
    expect(services.rows.every((row) => row.category === "Services")).toBe(true);
    expect(services.rows).toHaveLength(dataset.products.filter((product) => product.category === "Services").length);
    expect(services.shownRevenueMinor).toBe(services.rows.reduce((sum, row) => sum + row.revenueMinor, 0));
    expect(services.shownRevenueMinor).toBeLessThan(services.totalRevenueMinor);
  });

  it("returns empty rows and an explanatory chart summary when nothing matches", () => {
    const result = view({ q: "no such product" });
    expect(result.rows).toEqual([]);
    expect(result.chart.bars).toEqual([]);
    expect(result.chart.summary).toBe("No products match the search.");
  });

  it.each(PRODUCT_SORT_KEYS.flatMap((key) => [`${key}.asc`, `${key}.desc`]))("sorts by %s", (sort) => {
    const { rows } = view({ sort, range: "12m" });
    expect(rows).toHaveLength(dataset.products.length);
    const [key, direction] = sort.split(".");
    const values = rows.map((row) => {
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
        default:
          return row.revenueChange.kind === "relative" ? row.revenueChange.value : null;
      }
    });
    const present = values.filter((value) => value !== null);
    // Missing values sort last in either direction.
    expect(values.slice(present.length).every((value) => value === null)).toBe(true);
    for (let index = 1; index < present.length; index++) {
      const a = present[index - 1];
      const b = present[index];
      const order = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
      expect(direction === "asc" ? order <= 0 : order >= 0).toBe(true);
    }
  });

  it("ranks the chart by the chosen metric, following the search but not the table sort", () => {
    const byUnits = view({ metric: "units", sort: "name.asc", q: "templates" });
    expect(byUnits.chart.bars.map((bar) => bar.id).sort()).toEqual(byUnits.rows.map((row) => row.id).sort());
    const values = byUnits.chart.bars.map((bar) => bar.value);
    expect(values).toEqual([...values].sort((a, b) => b - a));
    expect(byUnits.chart.bars[0]?.value).toBe(Math.max(...byUnits.rows.map((row) => row.unitsSold)));

    const byConversion = view({ metric: "conversion" });
    expect(byConversion.chart.bars[0]?.value).toBe(Math.max(...byConversion.rows.map((row) => row.conversionRate ?? 0)));
    expect(byConversion.chart.summary).toMatch(/leads with \d+\.\d{2}%/);
  });

  it("picks leaders from the whole catalogue, whatever the search", () => {
    const all = view({ range: "90d" });
    const searched = view({ range: "90d", q: "planner" });
    expect(searched.leaders).toEqual(all.leaders);
    const leader = (id: string) => all.leaders.find((item) => item.id === id)?.row;
    expect(leader("revenue")?.revenueMinor).toBe(Math.max(...all.rows.map((row) => row.revenueMinor)));
    expect(leader("units")?.unitsSold).toBe(Math.max(...all.rows.map((row) => row.unitsSold)));
    const eligible = all.rows.filter((row) => row.orders >= MIN_LEADER_ORDERS);
    expect(leader("conversion")?.conversionRate).toBe(Math.max(...eligible.map((row) => row.conversionRate ?? 0)));
  });

  it("writes money in the display currency", () => {
    const usd = view({ range: "30d" });
    const eur = view({ range: "30d" }, "EUR");
    expect(usd.leaders[0]?.value).toMatch(/^\$/);
    expect(eur.leaders[0]?.value).toMatch(/^€/);
    // The underlying figures stay in the base currency.
    expect(eur.rows).toEqual(usd.rows);
  });
});

describe("PRODUCT_SORT_OPTIONS", () => {
  it("offers every column sort in both directions, once", () => {
    const values = PRODUCT_SORT_OPTIONS.map((option) => option.value);
    expect(new Set(values).size).toBe(values.length);
    expect([...values].sort()).toEqual(PRODUCT_SORT_KEYS.flatMap((key) => [`${key}.asc`, `${key}.desc`]).sort());
  });
});
