import { describe, expect, it } from "vitest";
import { generateDataset } from "@/data/generate";
import { summarizePeriod } from "./aggregations";
import { toCsv } from "./csv";
import { convertMinor, minorToDecimalString } from "./money";
import { type Report, type ReportTable, REPORTS_DEFAULT_PRESET, buildReport, reportCsvRows } from "./reports";
import { parseDateRangeParams } from "./search-params";

const dataset = generateDataset();
const report = (params: Record<string, string> = {}, currency: "USD" | "EUR" | "GBP" = "USD") =>
  buildReport(dataset, parseDateRangeParams(params, { bounds: dataset.span, defaultPreset: REPORTS_DEFAULT_PRESET }), {
    workspaceName: "Fernhill Studio",
    currency,
  });

const table = (result: Report, id: ReportTable["id"]) => {
  const found = result.tables.find((item) => item.id === id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
};
const cell = (result: Report, id: ReportTable["id"], key: string, column: number) =>
  table(result, id).rows.find((row) => row.key === key)?.cells[column];

/** The preview text reduced to the CSV's form: no symbols, separators, signs or units. */
const plain = (display: string) => display.replace(/[$€£,%+\s]|pp/g, "");

describe("buildReport", () => {
  it("reports the last 30 days by default, against the previous 30", () => {
    const result = report();
    expect(result.range).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(result.comparison.range).toEqual({ from: "2026-08-02", to: "2026-08-31" });
    expect(result.comparisonLabel).toBe("vs previous 30 days");
    expect(result.tables.map((item) => item.id)).toEqual(["summary", "revenue", "products", "channels"]);
    expect(table(result, "summary").fileName).toBe("pulse-report-summary-2026-09-01-to-2026-09-30.csv");
  });

  it.each(["USD", "EUR", "GBP"] as const)("reconciles revenue across every table in %s", (currency) => {
    const result = report({ range: "90d" }, currency);
    const summary = summarizePeriod(dataset, result.range);
    const revenue = minorToDecimalString(convertMinor(summary.revenueMinor, currency));
    expect(cell(result, "summary", "Revenue", 3)?.csv).toBe(revenue);
    expect(cell(result, "revenue", "total", 1)?.csv).toBe(revenue);
    expect(cell(result, "products", "total", 2)?.csv).toBe(revenue);

    // Rows add up to their total row, to the cent.
    const cents = (value: unknown) => Math.round(Number(value) * 100);
    for (const [id, column] of [["revenue", 1], ["revenue", 3], ["revenue", 4], ["products", 2]] as const) {
      const rows = table(result, id).rows;
      const parts = rows.filter((row) => !row.total).reduce((sum, row) => sum + cents(row.cells[column]?.csv), 0);
      expect(parts).toBe(cents(rows.find((row) => row.total)?.cells[column]?.csv));
    }
    const net = cents(cell(result, "summary", "Net profit", 3)?.csv);
    expect(net).toBe(cents(cell(result, "revenue", "total", 4)?.csv));
  });

  it("keeps counts in step with the period summary", () => {
    const result = report({ range: "12m" });
    const summary = summarizePeriod(dataset, result.range);
    expect(cell(result, "revenue", "total", 5)?.csv).toBe(summary.orders);
    expect(cell(result, "products", "total", 4)?.csv).toBe(summary.orders);
    expect(cell(result, "products", "total", 3)?.csv).toBe(summary.unitsSold);
    expect(cell(result, "channels", "total", 2)?.csv).toBe(summary.newCustomers);
    expect(cell(result, "channels", "total", 1)?.csv).toBe(summary.visitors);
  });

  it.each(["USD", "EUR"] as const)("shows exactly the values its CSV holds (%s)", (currency) => {
    const cases: Record<string, string>[] = [{}, { range: "7d" }, { range: "ytd" }, { from: "2024-01-01", to: "2024-01-10" }];
    for (const params of cases) {
      for (const item of report(params, currency).tables) {
        for (const row of item.rows) {
          row.cells.forEach((value, index) => {
            if (item.columns[index]?.csvOnly || value.csv === "") return;
            const numeric = typeof value.csv === "number" || /^-?\d+(\.\d+)?$/.test(String(value.csv));
            expect(numeric ? plain(value.display) : value.display).toBe(String(value.csv));
          });
        }
      }
    }
  });

  it("measures changes in the base currency, so they match in every currency", () => {
    const usd = table(report({ range: "90d" }), "summary");
    const eur = table(report({ range: "90d" }, "EUR"), "summary");
    expect(eur.rows.map((row) => row.cells[5]?.csv)).toEqual(usd.rows.map((row) => row.cells[5]?.csv));
    // Ratios change in percentage points, everything else relatively.
    expect(usd.rows.find((row) => row.key === "Conversion rate")?.cells[6]?.csv).toBe("percentage points");
    expect(usd.rows.find((row) => row.key === "Revenue")?.cells[6]?.csv).toBe("percent");
  });

  it("leaves the comparison empty when it reaches before the data", () => {
    const result = report({ from: "2024-01-01", to: "2024-01-31" });
    expect(result.comparison.summary).toBeNull();
    const revenue = table(result, "summary").rows.find((row) => row.key === "Revenue");
    expect(revenue?.cells[4]).toEqual({ display: "—", csv: "" });
    expect(revenue?.cells[5]).toEqual({ display: "—", csv: "" });
  });

  it("names the currency in money headers", () => {
    const headers = reportCsvRows(table(report({}, "GBP"), "revenue")).headers;
    expect(headers).toEqual(["Period", "Revenue (GBP)", "Refunds (GBP)", "Expenses (GBP)", "Net (GBP)", "Completed orders"]);
  });

  it("exports every row but the section headings, with matching column counts", () => {
    for (const item of report().tables) {
      const { headers, rows } = reportCsvRows(item);
      expect(rows).toHaveLength(item.rows.filter((row) => !row.section).length);
      expect(rows.every((row) => row.length === headers.length)).toBe(true);
      const csv = toCsv(
        headers.map((header, index) => ({ header, value: (row: (typeof rows)[number]) => row[index] })),
        rows,
        { includeBom: false },
      );
      expect(csv.split("\r\n")).toHaveLength(rows.length + 2);
    }
  });

  it("writes an overview from the headline figures", () => {
    expect(report().overview).toMatch(/^Revenue was \$[\d,]+ from [\d,]+ completed orders, [+-][\d.]+% vs previous 30 days\. Net profit was \$[\d,]+ \([\d.]+% margin\)\. [\d,]+ new customers joined\.$/);
    expect(report({}, "EUR").overview).toMatch(/^Revenue was €/);
  });
});
