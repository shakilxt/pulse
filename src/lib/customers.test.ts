import { describe, expect, it } from "vitest";
import { generateDataset } from "@/data/generate";
import {
  CUSTOMERS_PAGE_SIZE,
  CUSTOMER_SORT_KEYS,
  CUSTOMER_SORT_OPTIONS,
  RECENT_ACTIVITY_LIMIT,
  customerActivity,
  isCustomerQueryFiltered,
  listCustomers,
  parseCustomerQuery,
} from "./customers";

const dataset = generateDataset();
const list = (params: Record<string, string> = {}) => listCustomers(dataset, parseCustomerQuery(params));

function allRows(params: Record<string, string>) {
  const first = list(params);
  const rows = [...first.page.rows];
  for (let page = 2; page <= first.page.pageCount; page++) rows.push(...list({ ...params, page: String(page) }).page.rows);
  return { first, rows };
}

describe("parseCustomerQuery", () => {
  it("defaults to every customer, highest spend first", () => {
    const query = parseCustomerQuery({});
    expect(query).toEqual({ search: "", status: "all", sort: { key: "spend", direction: "desc" }, page: 1 });
    expect(isCustomerQueryFiltered(query)).toBe(false);
  });

  it("ignores unknown statuses and sorts", () => {
    expect(parseCustomerQuery({ status: "vip", sort: "email.asc" })).toMatchObject({
      status: "all",
      sort: { key: "spend", direction: "desc" },
    });
    expect(isCustomerQueryFiltered(parseCustomerQuery({ status: "inactive" }))).toBe(true);
    expect(isCustomerQueryFiltered(parseCustomerQuery({ sort: "name.asc" }))).toBe(false);
  });
});

describe("listCustomers", () => {
  it("lists every customer by default, with status counts that add up", () => {
    const result = list();
    expect(result.page.totalRows).toBe(dataset.customers.length);
    expect(result.page.rows).toHaveLength(CUSTOMERS_PAGE_SIZE);
    expect(result.statusCounts.all).toBe(dataset.customers.length);
    expect(result.statusCounts.active + result.statusCounts.inactive).toBe(result.statusCounts.all);
    const top = Math.max(...dataset.customers.map((customer) => customer.totalSpendMinor));
    expect(result.page.rows[0]?.totalSpendMinor).toBe(top);
    expect(result.activeWindow).toEqual({ from: "2026-07-03", to: "2026-09-30" });
  });

  it("filters by status and paginates the filtered rows", () => {
    const { first, rows } = allRows({ status: "active" });
    const expected = dataset.customers.filter((customer) => customer.status === "active");
    expect(first.page.totalRows).toBe(expected.length);
    expect(rows).toHaveLength(expected.length);
    expect(rows.every((row) => row.status === "active")).toBe(true);
  });

  it("searches names, emails and IDs, ignoring case and accents", () => {
    const sample = dataset.customers[42];
    if (!sample) throw new Error("missing sample customer");
    expect(list({ q: sample.id }).page.rows.map((row) => row.id)).toEqual([sample.id]);
    expect(list({ q: sample.id.replace("-", "").toLowerCase() }).page.totalRows).toBe(1);
    expect(list({ q: sample.email.toUpperCase() }).page.rows.map((row) => row.id)).toEqual([sample.id]);
    const byName = allRows({ q: sample.name }).rows;
    expect(byName.some((row) => row.id === sample.id)).toBe(true);
    expect(byName.every((row) => row.name.toLowerCase().includes(sample.name.toLowerCase().split(" ")[0] ?? ""))).toBe(true);
  });

  it("returns the counts for the search, so a status with no matches reads zero", () => {
    const result = list({ q: "zzzz-nobody" });
    expect(result.statusCounts).toEqual({ all: 0, active: 0, inactive: 0 });
    expect(result.page.rows).toEqual([]);
  });

  it("joins the channel name and an average order value", () => {
    for (const row of list().page.rows) {
      expect(dataset.channels.some((channel) => channel.name === row.channelName)).toBe(true);
      expect(row.averageOrderMinor).toBe(row.orderCount > 0 ? Math.round(row.totalSpendMinor / row.orderCount) : null);
    }
  });

  it.each(CUSTOMER_SORT_KEYS.flatMap((key) => [`${key}.asc`, `${key}.desc`]))("sorts by %s with nulls last", (sort) => {
    const { rows } = allRows({ sort, status: "active" });
    const [key, direction] = sort.split(".");
    const values = rows.map((row) =>
      key === "name"
        ? row.name
        : key === "joined"
          ? row.joinedAt
          : key === "orders"
            ? row.orderCount
            : key === "spend"
              ? row.totalSpendMinor
              : row.lastOrderAt,
    );
    const firstNull = values.indexOf(null);
    if (firstNull >= 0) expect(values.slice(firstNull).every((value) => value === null)).toBe(true);
    const defined = values.filter((value) => value !== null);
    for (let index = 1; index < defined.length; index++) {
      const a = defined[index - 1];
      const b = defined[index];
      const order =
        typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "en", { sensitivity: "base" });
      expect(direction === "asc" ? order <= 0 : order >= 0).toBe(true);
    }
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });
});

describe("customerActivity", () => {
  it("lists a customer's latest transactions, newest first, with the full count", () => {
    const counts = new Map<string, number>();
    for (const transaction of dataset.transactions) counts.set(transaction.customerId, (counts.get(transaction.customerId) ?? 0) + 1);
    const busiest = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!busiest) throw new Error("no transactions");
    const [id, count] = busiest;

    const activity = customerActivity(dataset, [id])[id];
    expect(activity?.transactionCount).toBe(count);
    expect(activity?.recent).toHaveLength(Math.min(count, RECENT_ACTIVITY_LIMIT));
    const dates = activity?.recent.map((row) => `${row.date} ${row.id}`) ?? [];
    expect(dates).toEqual([...dates].sort().reverse());
    const latest = dataset.transactions.filter((transaction) => transaction.customerId === id).at(-1);
    expect(activity?.recent[0]?.id).toBe(latest?.id);
  });

  it("agrees with the customer's stored totals", () => {
    const page = list({ sort: "orders.desc" }).page.rows;
    const activity = customerActivity(dataset, page.map((row) => row.id));
    for (const row of page) {
      const completed = dataset.transactions.filter(
        (transaction) => transaction.customerId === row.id && transaction.status === "completed",
      );
      expect(completed).toHaveLength(row.orderCount);
      expect(activity[row.id]?.transactionCount).toBeGreaterThanOrEqual(row.orderCount);
    }
  });
});

describe("CUSTOMER_SORT_OPTIONS", () => {
  it("offers every column sort in both directions, once", () => {
    const values = CUSTOMER_SORT_OPTIONS.map((option) => option.value);
    expect(new Set(values).size).toBe(values.length);
    expect([...values].sort()).toEqual(CUSTOMER_SORT_KEYS.flatMap((key) => [`${key}.asc`, `${key}.desc`]).sort());
  });
});
