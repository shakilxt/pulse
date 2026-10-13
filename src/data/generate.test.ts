import { describe, expect, it } from "vitest";
import { addDays, eachDay, isIsoDate } from "@/lib/dates";
import { ACTIVE_WINDOW_DAYS, DEFAULT_GENERATOR_CONFIG, generateDataset } from "./generate";

const dataset = generateDataset();
const { span } = dataset;
const productById = new Map(dataset.products.map((product) => [product.id, product]));
const customerById = new Map(dataset.customers.map((customer) => [customer.id, customer]));
const channelIds = new Set(dataset.channels.map((channel) => channel.id));

function fingerprint(text: string): number {
  // FNV-1a, enough to notice any change to the generated records.
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

describe("determinism", () => {
  it("generates identical data for the same seed", () => {
    expect(generateDataset()).toEqual(dataset);
  });

  it("generates different data for a different seed", () => {
    const other = generateDataset({ ...DEFAULT_GENERATOR_CONFIG, seed: "another-seed" });
    expect(other.transactions.length).not.toBe(dataset.transactions.length);
  });

  it("matches the recorded fingerprint", () => {
    // Update these deliberately when the generator or its inputs change.
    expect({
      customers: dataset.customers.length,
      transactions: dataset.transactions.length,
      hash: fingerprint(JSON.stringify(dataset)),
    }).toMatchInlineSnapshot(`
      {
        "customers": 3501,
        "hash": 265916630,
        "transactions": 7984,
      }
    `);
  });
});

describe("records", () => {
  it("uses unique, stably formatted ids", () => {
    const check = (ids: string[], pattern: RegExp) => {
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(pattern);
    };
    check(dataset.customers.map((item) => item.id), /^CU-\d{5}$/);
    check(dataset.transactions.map((item) => item.id), /^TX-\d{6}$/);
    check(dataset.products.map((item) => item.id), /^PR-\d{2}$/);
    check(dataset.notifications.map((item) => item.id), /^NT-\d{3}$/);
  });

  it("only uses fictional, reserved email addresses", () => {
    const emails = dataset.customers.map((customer) => customer.email);
    expect(new Set(emails).size).toBe(emails.length);
    for (const email of emails) expect(email).toMatch(/^[a-z0-9.-]+@example\.com$/);
    expect(new Set(dataset.customers.map((customer) => customer.name)).size).toBe(dataset.customers.length);
  });

  it("keeps transactions valid, ordered and inside the span", () => {
    let previous = "";
    for (const transaction of dataset.transactions) {
      const product = productById.get(transaction.productId);
      expect(product).toBeDefined();
      expect(customerById.has(transaction.customerId)).toBe(true);
      expect(isIsoDate(transaction.date)).toBe(true);
      expect(transaction.date >= span.from && transaction.date <= span.to).toBe(true);
      expect(transaction.date >= previous).toBe(true);
      expect(Number.isInteger(transaction.quantity) && transaction.quantity >= 1).toBe(true);
      expect(transaction.amountMinor).toBe((product?.unitPriceMinor ?? 0) * transaction.quantity);
      expect(transaction.currency).toBe("USD");
      expect(transaction.paymentMethodLabel).not.toBe("");
      previous = transaction.date;
    }
  });

  it("only leaves charges pending in the last two days", () => {
    const pending = dataset.transactions.filter((transaction) => transaction.status === "pending");
    for (const transaction of pending) expect(transaction.date >= addDays(span.to, -1)).toBe(true);
  });

  it("covers every status", () => {
    const statuses = new Set(dataset.transactions.map((transaction) => transaction.status));
    expect([...statuses].sort()).toEqual(["completed", "failed", "pending", "refunded"]);
  });
});

describe("customers reconcile with the ledger", () => {
  const activeSince = addDays(span.to, -(ACTIVE_WINDOW_DAYS - 1));

  it("derives totals, dates and status from their transactions", () => {
    const byCustomer = Map.groupBy(dataset.transactions, (transaction) => transaction.customerId);
    for (const customer of dataset.customers) {
      const own = byCustomer.get(customer.id) ?? [];
      const completed = own.filter((transaction) => transaction.status === "completed");
      const purchases = own.filter((transaction) => transaction.status !== "failed");
      expect(customer.totalSpendMinor).toBe(completed.reduce((sum, item) => sum + item.amountMinor, 0));
      expect(customer.orderCount).toBe(completed.length);
      expect(customer.lastOrderAt).toBe(completed.at(-1)?.date ?? null);
      // A customer's first purchase is what creates them, and it never fails.
      expect(own[0]?.date).toBe(customer.joinedAt);
      expect(own[0]?.status).not.toBe("failed");
      const recentlyActive = purchases.some((transaction) => transaction.date >= activeSince);
      expect(customer.status).toBe(recentlyActive ? "active" : "inactive");
      expect(channelIds.has(customer.acquisitionSourceId)).toBe(true);
    }
  });

  it("lists customers in join order", () => {
    const joined = dataset.customers.map((customer) => customer.joinedAt);
    expect(joined).toEqual([...joined].sort());
  });
});

describe("traffic and costs", () => {
  const days = eachDay(span);

  it("has one traffic row per day and channel, and one expense row per day", () => {
    expect(dataset.traffic).toHaveLength(days.length * dataset.channels.length);
    expect(dataset.productViews).toHaveLength(days.length * dataset.products.length);
    expect(dataset.expenses.map((row) => row.date)).toEqual(days);
  });

  it("never converts more visitors than arrived", () => {
    const visitors = new Map(dataset.traffic.map((row) => [`${row.date}|${row.sourceId}`, row.visitors]));
    const conversions = Map.groupBy(dataset.customers, (customer) => `${customer.joinedAt}|${customer.acquisitionSourceId}`);
    for (const [key, joined] of conversions) expect(joined.length).toBeLessThanOrEqual(visitors.get(key) ?? 0);
  });

  it("keeps every count and amount a non-negative integer", () => {
    for (const row of dataset.traffic) expect(Number.isInteger(row.visitors) && row.visitors >= 0).toBe(true);
    for (const row of dataset.productViews) expect(Number.isInteger(row.views) && row.views >= 0).toBe(true);
    for (const row of dataset.expenses) expect(Number.isInteger(row.amountMinor) && row.amountMinor > 0).toBe(true);
  });
});

describe("notifications", () => {
  it("are newest first, before the demo clock, and point at real records", () => {
    const times = dataset.notifications.map((item) => item.createdAt);
    expect(times).toEqual([...times].sort().reverse());
    expect(dataset.notifications.length).toBeGreaterThanOrEqual(5);
    const transactionIds = new Set(dataset.transactions.map((transaction) => transaction.id));
    for (const notification of dataset.notifications) {
      expect(notification.createdAt <= dataset.now).toBe(true);
      const target = notification.href?.match(/[?&]q=([A-Z]{2}-\d+)/)?.[1];
      if (target?.startsWith("TX-")) expect(transactionIds.has(target)).toBe(true);
      if (target?.startsWith("CU-")) expect(customerById.has(target)).toBe(true);
    }
  });
});
