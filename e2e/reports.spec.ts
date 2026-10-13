import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

/* Figures come from the seeded demo data; src/lib/reports.test.ts checks that they reconcile. */

/** RFC 4180 parsing: quoted fields may hold commas, doubled quotes and line breaks. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r" && text[index + 1] === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      index++;
    } else field += char;
  }
  return rows;
}

/** A preview cell in the CSV's form: no currency symbols, separators, plus signs or units; a dash is empty. */
function plain(display: string): string {
  const value = display.trim();
  if (value === "—") return "";
  return /^[+-]?[$€£]?-?[\d,]+(\.\d+)?( pp|%)?$/.test(value) ? value.replace(/[$€£,%+]|\s*pp/g, "") : value;
}

/** Columns that exist only in the CSV, by table. */
const CSV_ONLY: Record<string, number[]> = { summary: [0, 2, 6] };

async function download(page: Page, title: string) {
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: `Download ${title} as CSV` }).click(),
  ]);
  const path = await file.path();
  return { name: file.suggestedFilename(), text: await readFile(path, "utf8") };
}

async function previewRows(page: Page, id: string): Promise<string[][]> {
  return page.locator(`table[data-report-table="${id}"] tbody tr[data-row]`).evaluateAll((rows) =>
    rows.map((row) => Array.from(row.querySelectorAll("th, td"), (cell) => cell.textContent ?? "")),
  );
}

const TABLES = [
  { id: "summary", title: "Summary" },
  { id: "revenue", title: "Revenue by day" },
  { id: "products", title: "Product performance" },
  { id: "channels", title: "Acquisition channels" },
] as const;

test("each CSV download holds exactly what the preview shows", async ({ page }) => {
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Fernhill Studio performance report" })).toBeVisible();
  await page.waitForLoadState("networkidle");

  for (const { id, title } of TABLES) {
    const { name, text } = await download(page, title);
    expect(name).toBe(`pulse-report-${id}-2026-09-01-to-2026-09-30.csv`);
    expect(text.startsWith("﻿")).toBe(true);
    expect(text.endsWith("\r\n")).toBe(true);
    const [headers, ...csvRows] = parseCsv(text.slice(1));
    const preview = await previewRows(page, id);
    expect(csvRows).toHaveLength(preview.length);
    const skip = CSV_ONLY[id] ?? [];
    csvRows.forEach((csvRow, index) => {
      expect(csvRow).toHaveLength(headers?.length ?? 0);
      expect(csvRow.filter((_, column) => !skip.includes(column))).toEqual(preview[index]?.map(plain));
    });
    await expect(page.getByRole("status").filter({ hasText: name })).toHaveText(
      `Created ${name} with ${csvRows.length} rows and started the download.`,
    );
  }
});

test("headers name units and the CSV totals reconcile", async ({ page }) => {
  await page.goto("/reports?range=90d");
  await page.waitForLoadState("networkidle");
  const { text } = await download(page, "Revenue by week");
  const [headers, ...rows] = parseCsv(text.slice(1));
  expect(headers).toEqual(["Period", "Revenue (USD)", "Refunds (USD)", "Expenses (USD)", "Net (USD)", "Completed orders"]);
  const total = rows.at(-1);
  expect(total?.[0]).toBe("Total");
  const cents = (value: string | undefined) => Math.round(Number(value) * 100);
  for (const column of [1, 2, 3, 4, 5]) {
    const sum = rows.slice(0, -1).reduce((acc, row) => acc + cents(row[column]), 0);
    expect(sum).toBe(cents(total?.[column]));
  }

  const summary = parseCsv((await download(page, "Summary")).text.slice(1));
  const revenue = summary.find((row) => row[1] === "Revenue");
  expect(revenue?.[3]).toBe(total?.[1]);
  expect(summary.find((row) => row[1] === "Conversion rate")?.[6]).toBe("percentage points");
});

test("the preview and its files follow the period", async ({ page }) => {
  await page.goto("/reports");
  await page.waitForLoadState("networkidle");
  const preview = page.getByRole("article", { name: "Fernhill Studio performance report" });
  await expect(preview).toContainText("Sep 1 – 30, 2026 compared with Aug 2 – 31, 2026");
  const before = await preview.locator('[data-report-table="summary"]').textContent();

  await page.getByRole("button", { name: /^Date range: Last 30 days/ }).click();
  await page.getByRole("button", { name: "Last 7 days" }).click();
  await expect(page).toHaveURL("/reports?range=7d");
  await expect(preview).toContainText("Sep 24 – 30, 2026 compared with Sep 17 – 23, 2026");
  await expect(preview.locator('[data-report-table="summary"]')).not.toHaveText(before ?? "");
  await expect(page.locator('table[data-report-table="revenue"] tbody tr[data-row]')).toHaveCount(8);

  const { name, text } = await download(page, "Revenue by day");
  expect(name).toBe("pulse-report-revenue-2026-09-24-to-2026-09-30.csv");
  expect(parseCsv(text.slice(1))).toHaveLength(1 + 8);
});
