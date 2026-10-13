import { describe, expect, it } from "vitest";
import { generateDataset } from "@/data/generate";
import { TRANSACTION_STATUSES } from "@/types/domain";
import { isWithinRange } from "./dates";
import {
  TRANSACTIONS_PAGE_SIZE,
  TRANSACTION_SORT_KEYS,
  TRANSACTION_SORT_OPTIONS,
  isTransactionQueryFiltered,
  listTransactions,
  parseTransactionQuery,
} from "./transactions";

const dataset = generateDataset();
const list = (params: Record<string, string> = {}) => listTransactions(dataset, parseTransactionQuery(params, dataset));

/** Every row the filters let through, across all pages. */
function allRows(params: Record<string, string>) {
  const first = list(params);
  const rows = [...first.page.rows];
  for (let page = 2; page <= first.page.pageCount; page++) rows.push(...list({ ...params, page: String(page) }).page.rows);
  return { first, rows };
}

describe("parseTransactionQuery", () => {
  it("defaults to every transaction, newest first", () => {
    const query = parseTransactionQuery({}, dataset);
    expect(query).toEqual({
      search: "",
      status: "all",
      dates: { preset: "all", range: dataset.span },
      sort: { key: "date", direction: "desc" },
      page: 1,
    });
    expect(isTransactionQueryFiltered(query)).toBe(false);
  });

  it("falls back to defaults for invalid values", () => {
    const query = parseTransactionQuery(
      { status: "chargeback", sort: "email.desc", page: "-2", range: "forever", q: "  visa  " },
      dataset,
    );
    expect(query).toMatchObject({ status: "all", sort: { key: "date", direction: "desc" }, page: 1, search: "visa" });
    expect(query.dates.preset).toBe("all");
  });

  it("treats sorting as a view change, not a filter", () => {
    expect(isTransactionQueryFiltered(parseTransactionQuery({ sort: "amount.desc", page: "3" }, dataset))).toBe(false);
    for (const params of [{ q: "ana" }, { status: "failed" }, { range: "30d" }, { from: "2025-01-01", to: "2025-01-31" }]) {
      expect(isTransactionQueryFiltered(parseTransactionQuery(params, dataset))).toBe(true);
    }
  });
});

describe("listTransactions", () => {
  it("pages through the whole ledger by default", () => {
    const result = list();
    expect(result.totalCount).toBe(dataset.transactions.length);
    expect(result.page.totalRows).toBe(dataset.transactions.length);
    expect(result.page.rows).toHaveLength(TRANSACTIONS_PAGE_SIZE);
    expect(result.page.rows[0]?.id).toBe(dataset.transactions.at(-1)?.id);
    expect(result.filtered).toBe(false);
  });

  it("counts each status under the search and dates, whichever status is chosen", () => {
    const counts = list({ range: "90d", status: "refunded" }).statusCounts;
    const inRange = dataset.transactions.filter((transaction) => isWithinRange(transaction.date, { from: "2026-07-03", to: "2026-09-30" }));
    expect(counts.all).toBe(inRange.length);
    for (const status of TRANSACTION_STATUSES) {
      expect(counts[status]).toBe(inRange.filter((transaction) => transaction.status === status).length);
    }
    expect(counts.completed + counts.pending + counts.refunded + counts.failed).toBe(counts.all);
  });

  it("filters by status and paginates the filtered rows only", () => {
    const { first, rows } = allRows({ status: "failed" });
    const expected = dataset.transactions.filter((transaction) => transaction.status === "failed");
    expect(first.page.totalRows).toBe(expected.length);
    expect(first.page.pageCount).toBe(Math.ceil(expected.length / TRANSACTIONS_PAGE_SIZE));
    expect(rows.map((row) => row.id).sort()).toEqual(expected.map((transaction) => transaction.id).sort());
    expect(first.completedMinor).toBe(0);
  });

  it("filters by a custom date range, inclusive at both ends", () => {
    const { rows, first } = allRows({ from: "2025-03-01", to: "2025-03-03" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.date >= "2025-03-01" && row.date <= "2025-03-03")).toBe(true);
    expect(rows.some((row) => row.date === "2025-03-01")).toBe(true);
    expect(rows.some((row) => row.date === "2025-03-03")).toBe(true);
    const completed = rows.filter((row) => row.status === "completed").reduce((total, row) => total + row.amountMinor, 0);
    expect(first.completedMinor).toBe(completed);
  });

  it("searches IDs, customers, emails, products and payment methods", () => {
    const sample = dataset.transactions[1234];
    if (!sample) throw new Error("missing sample transaction");
    expect(list({ q: sample.id }).page.rows.map((row) => row.id)).toEqual([sample.id]);
    expect(list({ q: sample.id.replace("-", "").toLowerCase() }).page.totalRows).toBe(1);

    const byCustomer = allRows({ q: sample.customerId }).rows;
    expect(byCustomer.length).toBe(dataset.transactions.filter((transaction) => transaction.customerId === sample.customerId).length);
    expect(byCustomer.every((row) => row.customerId === sample.customerId)).toBe(true);

    const paypal = list({ q: "paypal" });
    expect(paypal.page.totalRows).toBe(dataset.transactions.filter((transaction) => transaction.paymentMethodLabel === "PayPal").length);

    // Tokens can match different fields.
    const customer = dataset.customers.find((item) => item.id === sample.customerId);
    const firstName = customer?.name.split(" ")[0] ?? "";
    const combined = allRows({ q: `${firstName} ${sample.paymentMethodLabel}` }).rows;
    expect(combined.some((row) => row.id === sample.id)).toBe(true);
  });

  it("returns an empty page, not an error, when nothing matches", () => {
    const result = list({ q: "no such customer anywhere" });
    expect(result.page).toMatchObject({ totalRows: 0, rows: [], page: 1, pageCount: 1, firstRow: 0, lastRow: 0 });
    expect(result.statusCounts.all).toBe(0);
  });

  it("clamps a page past the end to the last page", () => {
    const result = list({ status: "pending", page: "50" });
    expect(result.page.page).toBe(result.page.pageCount);
    expect(result.page.rows.length).toBeGreaterThan(0);
  });

  it.each(TRANSACTION_SORT_KEYS.flatMap((key) => [`${key}.asc`, `${key}.desc`]))("sorts by %s across pages", (sort) => {
    const { rows } = allRows({ sort, range: "30d" });
    const [key, direction] = sort.split(".");
    const value = (index: number) => {
      const row = rows[index];
      if (!row) throw new Error("missing row");
      return key === "amount" ? row.amountMinor : key === "customer" ? row.customerName : `${row.date} ${row.id}`;
    };
    for (let index = 1; index < rows.length; index++) {
      const a = value(index - 1);
      const b = value(index);
      const order = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "en", { sensitivity: "base" });
      expect(direction === "asc" ? order <= 0 : order >= 0).toBe(true);
    }
    // No row is lost or repeated between pages.
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });
});

describe("TRANSACTION_SORT_OPTIONS", () => {
  it("offers every column sort in both directions, once", () => {
    const values = TRANSACTION_SORT_OPTIONS.map((option) => option.value);
    expect(new Set(values).size).toBe(values.length);
    expect([...values].sort()).toEqual(TRANSACTION_SORT_KEYS.flatMap((key) => [`${key}.asc`, `${key}.desc`]).sort());
  });
});
