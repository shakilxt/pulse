/**
 * Deterministic generator for the PULSE demo dataset.
 *
 * The data is simulated in the direction a real business works, so every
 * summary can be derived from the records beneath it:
 *
 *   daily traffic per channel ─► new customers (visitor conversions)
 *   new customer ─► first purchase ─► repeat purchases and membership renewals
 *   transactions ─► customer totals, revenue, product performance
 *   revenue + traffic ─► expenses (fixed costs, fees, ad spend, delivery)
 *   ledger events ─► notifications
 *
 * Nothing reads the wall clock: the same seed always yields the same dataset.
 */

import { percentChange } from "@/lib/calculations";
import {
  type IsoDate,
  addDays,
  dayOfWeek,
  diffDays,
  fromDayNumber,
  startOfYear,
  toDayNumber,
} from "@/lib/dates";
import { formatDate, formatDateRange, formatInteger, formatPercent } from "@/lib/formatters";
import { BASE_CURRENCY, basisPointsOf, multiplyMinor } from "@/lib/money";
import type {
  Customer,
  DailyExpense,
  DailyProductViews,
  DailyTraffic,
  Dataset,
  Notification,
  Transaction,
  TransactionStatus,
} from "@/types/domain";
import {
  BANK_TRANSFER_LABEL,
  BANK_TRANSFER_THRESHOLD_MINOR,
  CHANNELS,
  FIXED_COST_SCHEDULE,
  MEMBERSHIP_PRODUCT_ID,
  MEMBERSHIP_RENEWAL_DAYS,
  MEMBERSHIP_RENEWAL_RATE,
  PAID_SOCIAL_CPC_MINOR,
  PAYMENT_METHODS,
  PROCESSING_FEE_BPS,
  PROCESSING_FEE_FIXED_MINOR,
  PRODUCTS,
  type ProductSpec,
  SERVICES_DELIVERY_BPS,
  WEEKDAY_FACTORS,
} from "./catalog";
import { FIRST_NAMES, LAST_NAMES } from "./names";
import { type Random, createRandom } from "./random";

export interface GeneratorConfig {
  seed: string;
  start: IsoDate;
  end: IsoDate;
  /** The demo's fixed clock, on the end date. */
  now: string;
}

export const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  seed: "pulse-demo-9",
  start: "2024-01-01",
  end: "2026-09-30",
  now: "2026-09-30T17:40:00Z",
};

/** A customer is active when they made a purchase (any charge that did not fail) in the last 90 days of data. */
export const ACTIVE_WINDOW_DAYS = 90;

/** Share of repeat charges that fail, and of failed charges retried successfully. */
const FAILED_PAYMENT_RATE = 0.035;
const RETRY_RATE = 0.75;
/** Chance a charge is still pending, by days before the end date. */
const PENDING_BY_AGE = [0.3, 0.1] as const;

// ---------------------------------------------------------------------------
// Simulation

interface DraftPurchase {
  day: number;
  product: ProductSpec;
  quantity: number;
  status: TransactionStatus;
  /** Order of creation within the customer, for stable sorting. */
  sequence: number;
}

interface DraftCustomer {
  joinDay: number;
  sourceId: string;
  purchases: DraftPurchase[];
}

function seasonalFactor(date: IsoDate): number {
  const dayOfYear = diffDays(startOfYear(date), date);
  // Gentle yearly wave peaking in mid-November, lowest in May.
  let factor = 1 + 0.1 * Math.cos((2 * Math.PI * (dayOfYear - 318)) / 365.25);
  const monthDay = date.slice(5);
  if (monthDay >= "11-25" || monthDay <= "01-01") {
    if (monthDay >= "11-25" && monthDay <= "12-01") factor *= 1.32; // studio sale week
    else if (monthDay >= "12-20" || monthDay <= "01-01") factor *= 0.78; // holiday lull
  }
  return factor;
}

function simulateTraffic(random: Random, days: IsoDate[]): number[][] {
  const startDay = toDayNumber(days[0] ?? "");
  return days.map((date) => {
    const yearsIn = (toDayNumber(date) - startDay) / 365.25;
    const shared = (WEEKDAY_FACTORS[dayOfWeek(date)] ?? 1) * seasonalFactor(date);
    return CHANNELS.map((channel) => {
      if (date < channel.launchedOn) return 0;
      const growth = (1 + channel.annualGrowth) ** yearsIn;
      return Math.round(channel.baseVisitors * growth * shared * random.noise(0.14));
    });
  });
}

function settledStatus(random: Random, day: number, endDay: number, product: ProductSpec): TransactionStatus {
  const pendingChance = PENDING_BY_AGE[endDay - day] ?? 0;
  if (random.chance(pendingChance)) return "pending";
  return random.chance(product.refundRate) ? "refunded" : "completed";
}

function pickQuantity(random: Random, product: ProductSpec): number {
  if (product.maxQuantity === 1) return 1;
  const roll = random.next();
  if (roll < 0.05 && product.maxQuantity >= 3) return 3;
  return roll < 0.2 ? 2 : 1;
}

function simulateCustomer(
  random: Random,
  joinDay: number,
  sourceId: string,
  endDay: number,
): DraftCustomer {
  const purchases: DraftPurchase[] = [];
  const loyalty = random.next();
  const repeatProbability = 0.3 + 0.5 * loyalty;
  const meanGapDays = 75 - 40 * loyalty;
  let isMember = false;

  const record = (day: number, product: ProductSpec, quantity: number, status: TransactionStatus) => {
    purchases.push({ day, product, quantity, status, sequence: purchases.length });
  };

  const scheduleRenewals = (fromDay: number, membership: ProductSpec) => {
    let day = fromDay + MEMBERSHIP_RENEWAL_DAYS;
    while (day <= endDay && random.chance(MEMBERSHIP_RENEWAL_RATE)) {
      if (random.chance(FAILED_PAYMENT_RATE)) {
        record(day, membership, 1, "failed");
        if (!random.chance(RETRY_RATE)) return;
        day = Math.min(day + random.int(1, 2), endDay);
      }
      const status = settledStatus(random, day, endDay, membership);
      record(day, membership, 1, status);
      if (status !== "completed") return;
      day += MEMBERSHIP_RENEWAL_DAYS;
    }
  };

  /** Attempts a purchase; the first purchase always succeeds, since it is what makes someone a customer. */
  const purchase = (day: number, product: ProductSpec, isFirst: boolean) => {
    const quantity = pickQuantity(random, product);
    let chargeDay = day;
    if (!isFirst && random.chance(FAILED_PAYMENT_RATE)) {
      record(chargeDay, product, quantity, "failed");
      if (!random.chance(RETRY_RATE)) return;
      chargeDay += random.int(0, 2);
      if (chargeDay > endDay) return;
    }
    const status = settledStatus(random, chargeDay, endDay, product);
    record(chargeDay, product, quantity, status);
    if (product.id === MEMBERSHIP_PRODUCT_ID && status === "completed") {
      isMember = true;
      scheduleRenewals(chargeDay, product);
    }
  };

  let product = random.weighted(PRODUCTS, (item) => item.firstWeight);
  purchase(joinDay, product, true);

  let day = joinDay;
  while (random.chance(repeatProbability)) {
    day += 3 + Math.round(random.exponential(meanGapDays));
    if (day > endDay) break;
    const previousCategory = product.category;
    const member = isMember;
    product = random.weighted(PRODUCTS, (item) => {
      if (item.id === MEMBERSHIP_PRODUCT_ID && member) return 0;
      return item.repeatWeight * (item.category === previousCategory ? 2.2 : 1);
    });
    purchase(day, product, false);
  }

  return { joinDay, sourceId, purchases };
}

// ---------------------------------------------------------------------------
// People

function slug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}

function createIdentities(random: Random, count: number): Array<{ name: string; email: string }> {
  const combinations = FIRST_NAMES.flatMap((first) => LAST_NAMES.map((last) => [first, last] as const));
  if (count > combinations.length) {
    throw new RangeError(`Need ${count} unique names but only ${combinations.length} combinations exist`);
  }
  // Fisher–Yates shuffle, then take the first `count`: unique names without retries.
  for (let i = combinations.length - 1; i > 0; i--) {
    const j = random.int(0, i);
    const swap = combinations[i];
    const other = combinations[j];
    if (swap && other) {
      combinations[i] = other;
      combinations[j] = swap;
    }
  }

  const usedEmails = new Set<string>();
  return combinations.slice(0, count).map(([first, last]) => {
    const local = `${slug(first)}.${slug(last)}`;
    let email = `${local}@example.com`;
    for (let suffix = 2; usedEmails.has(email); suffix++) email = `${local}${suffix}@example.com`;
    usedEmails.add(email);
    return { name: `${first} ${last}`, email };
  });
}

function createPaymentLabel(random: Random): string {
  const method = random.weighted(PAYMENT_METHODS, (item) => item.weight);
  if (!method.card) return method.brand;
  return `${method.brand} ending ${String(random.int(0, 9999)).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// Notifications

interface NotificationContext {
  end: IsoDate;
  now: string;
  transactions: Transaction[];
  customers: Customer[];
  customerById: Map<string, Customer>;
  productName: Map<string, string>;
  channelName: Map<string, string>;
}

function at(date: IsoDate, time: string): string {
  return `${date}T${time}:00Z`;
}

function completedRevenue(transactions: Transaction[], from: IsoDate, to: IsoDate): number {
  let total = 0;
  for (const transaction of transactions) {
    if (transaction.status === "completed" && transaction.date >= from && transaction.date <= to) {
      total += transaction.amountMinor;
    }
  }
  return total;
}

function describeChange(current: number, previous: number): string {
  const change = percentChange(current, previous);
  if (change.kind !== "relative") return "the first with sales";
  if (change.value === 0) return "level with the period before";
  return `${change.value > 0 ? "up" : "down"} ${formatPercent(Math.abs(change.value))} on the period before`;
}

function buildNotifications(context: NotificationContext): Notification[] {
  const { end, now, transactions, customers, customerById, productName, channelName } = context;
  const drafts: Array<Omit<Notification, "id">> = [];
  const recent = (days: number) => transactions.filter((item) => item.date >= addDays(end, -days));
  const customerName = (transaction: Transaction) => customerById.get(transaction.customerId)?.name ?? "A customer";
  const product = (transaction: Transaction) => productName.get(transaction.productId) ?? "an item";

  const pending = transactions.filter((item) => item.status === "pending");
  if (pending.length > 0) {
    drafts.push({
      title: `${pending.length} payments pending`,
      description: "These demo charges settle or fail within two days. No real payments are processed.",
      createdAt: at(end, "17:15"),
      read: false,
      category: "payments",
      href: "/transactions?status=pending",
    });
  }

  const largest = recent(1)
    .filter((item) => item.status !== "failed")
    .sort((a, b) => b.amountMinor - a.amountMinor || a.id.localeCompare(b.id))[0];
  if (largest) {
    drafts.push({
      title: `New order: ${product(largest)}`,
      description: `${customerName(largest)} placed the largest order of the last two days.`,
      createdAt: at(largest.date, largest.date === end ? "11:05" : "15:20"),
      read: false,
      category: "customers",
      href: `/transactions?q=${largest.id}`,
    });
  }

  const failed = recent(6).filter((item) => item.status === "failed").at(-1);
  if (failed) {
    drafts.push({
      title: "Payment failed",
      description: `${customerName(failed)}'s ${failed.paymentMethodLabel} payment for ${product(failed)} didn't go through.`,
      createdAt: at(failed.date, failed.date === end ? "09:40" : "13:10"),
      read: false,
      category: "payments",
      href: `/transactions?q=${failed.id}`,
    });
  }

  // Weekly summary for the last full Monday–Sunday week.
  const weekEnd = addDays(end, -dayOfWeek(end));
  const weekStart = addDays(weekEnd, -6);
  const weekRevenue = completedRevenue(transactions, weekStart, weekEnd);
  const priorWeekRevenue = completedRevenue(transactions, addDays(weekStart, -7), addDays(weekStart, -1));
  drafts.push({
    title: "Weekly summary ready",
    description: `Revenue for ${formatDateRange({ from: weekStart, to: weekEnd }, "short")} was ${describeChange(weekRevenue, priorWeekRevenue)}.`,
    createdAt: at(addDays(weekEnd, 1), "08:00"),
    read: true,
    category: "reports",
    href: "/reports",
  });

  const refund = recent(13).filter((item) => item.status === "refunded").at(-1);
  if (refund) {
    drafts.push({
      title: "Refund issued",
      description: `${product(refund)} for ${customerName(refund)} was refunded.`,
      createdAt: at(refund.date, "16:30"),
      read: true,
      category: "payments",
      href: `/transactions?q=${refund.id}`,
    });
  }

  // The most recent customer count milestone (every 250th customer) in the last 30 days.
  const milestoneIndex = customers.findLastIndex(
    (customer, index) => (index + 1) % 250 === 0 && customer.joinedAt >= addDays(end, -29),
  );
  const milestone = customers[milestoneIndex];
  if (milestone) {
    drafts.push({
      title: `Customer #${formatInteger(milestoneIndex + 1)} joined`,
      description: `${milestone.name} found the studio through ${channelName.get(milestone.acquisitionSourceId) ?? "the website"}.`,
      createdAt: at(milestone.joinedAt, "10:25"),
      read: true,
      category: "customers",
      href: `/customers?q=${milestone.id}`,
    });
  }

  // Monthly report for the last full month.
  const monthEnd = addDays(`${end.slice(0, 7)}-01`, -1);
  const monthStart = `${monthEnd.slice(0, 7)}-01`;
  const priorMonthEnd = addDays(monthStart, -1);
  const priorMonthStart = `${priorMonthEnd.slice(0, 7)}-01`;
  drafts.push({
    title: "Monthly report ready",
    description: `Revenue for ${formatDate(monthStart, "month")} was ${describeChange(
      completedRevenue(transactions, monthStart, monthEnd),
      completedRevenue(transactions, priorMonthStart, priorMonthEnd),
    )}.`,
    createdAt: at(addDays(monthEnd, 1), "08:00"),
    read: true,
    category: "reports",
    href: "/reports",
  });

  return drafts
    .filter((draft) => draft.createdAt <= now)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((draft, index) => ({ id: `NT-${String(index + 1).padStart(3, "0")}`, ...draft }))
    .reverse();
}

// ---------------------------------------------------------------------------
// Assembly

export function generateDataset(config: GeneratorConfig = DEFAULT_GENERATOR_CONFIG): Dataset {
  const root = createRandom(config.seed);
  const startDay = toDayNumber(config.start);
  const endDay = toDayNumber(config.end);
  const days = Array.from({ length: endDay - startDay + 1 }, (_, index) => fromDayNumber(startDay + index));

  // 1. Traffic, and the new customers it converts.
  const visitorsByDay = simulateTraffic(root.fork("traffic"), days);
  const acquisition = root.fork("acquisition");
  const behaviour = root.fork("behaviour");
  const drafts: DraftCustomer[] = [];
  visitorsByDay.forEach((channelVisitors, dayIndex) => {
    CHANNELS.forEach((channel, channelIndex) => {
      const visitors = channelVisitors[channelIndex] ?? 0;
      const newCustomers = Math.min(visitors, acquisition.poisson(visitors * channel.conversion));
      for (let i = 0; i < newCustomers; i++) {
        drafts.push(simulateCustomer(behaviour, startDay + dayIndex, channel.id, endDay));
      }
    });
  });

  // 2. People, in join order.
  const identities = createIdentities(root.fork("names"), drafts.length);
  const customerIds = drafts.map((_, index) => `CU-${10_001 + index}`);

  // 3. The ledger, in date order.
  const payments = root.fork("payments");
  const paymentLabels = drafts.map(() => createPaymentLabel(payments));
  const ordered = drafts
    .flatMap((draft, customerIndex) => draft.purchases.map((purchase) => ({ purchase, customerIndex })))
    .sort(
      (a, b) =>
        a.purchase.day - b.purchase.day ||
        a.customerIndex - b.customerIndex ||
        a.purchase.sequence - b.purchase.sequence,
    );
  const transactions: Transaction[] = ordered.map(({ purchase, customerIndex }, index) => {
    const amountMinor = multiplyMinor(purchase.product.unitPriceMinor, purchase.quantity);
    const byTransfer = amountMinor >= BANK_TRANSFER_THRESHOLD_MINOR && payments.chance(0.55);
    return {
      id: `TX-${100_001 + index}`,
      customerId: customerIds[customerIndex] ?? "",
      productId: purchase.product.id,
      quantity: purchase.quantity,
      date: fromDayNumber(purchase.day),
      amountMinor,
      currency: BASE_CURRENCY,
      paymentMethodLabel: byTransfer ? BANK_TRANSFER_LABEL : (paymentLabels[customerIndex] ?? ""),
      status: purchase.status,
    };
  });

  // 4. Customer totals, derived from the ledger.
  interface CustomerTotals {
    spend: number;
    orders: number;
    last: IsoDate | null;
    lastPurchase: IsoDate | "";
  }
  const emptyTotals = (): CustomerTotals => ({ spend: 0, orders: 0, last: null, lastPurchase: "" });
  const totals = drafts.map(emptyTotals);
  const customerIndexById = new Map(customerIds.map((id, index) => [id, index]));
  for (const transaction of transactions) {
    const total = totals[customerIndexById.get(transaction.customerId) ?? -1];
    if (!total || transaction.status === "failed") continue;
    total.lastPurchase = transaction.date;
    if (transaction.status !== "completed") continue;
    total.spend += transaction.amountMinor;
    total.orders += 1;
    total.last = transaction.date;
  }
  const activeSince = addDays(config.end, -(ACTIVE_WINDOW_DAYS - 1));
  const customers: Customer[] = drafts.map((draft, index) => {
    const total = totals[index] ?? emptyTotals();
    const identity = identities[index] ?? { name: "", email: "" };
    return {
      id: customerIds[index] ?? "",
      name: identity.name,
      email: identity.email,
      status: total.lastPurchase >= activeSince ? "active" : "inactive",
      joinedAt: fromDayNumber(draft.joinDay),
      totalSpendMinor: total.spend,
      orderCount: total.orders,
      lastOrderAt: total.last,
      acquisitionSourceId: draft.sourceId,
    };
  });

  // 5. Traffic records.
  const traffic: DailyTraffic[] = days.flatMap((date, dayIndex) =>
    CHANNELS.map((channel, channelIndex) => ({
      date,
      sourceId: channel.id,
      visitors: visitorsByDay[dayIndex]?.[channelIndex] ?? 0,
    })),
  );
  const totalVisitorsByDay = visitorsByDay.map((row) => row.reduce((sum, value) => sum + value, 0));
  const allVisitors = totalVisitorsByDay.reduce((sum, value) => sum + value, 0);

  // 6. Product page views, calibrated so each product's long-run conversion
  //    lands near its target while daily counts vary naturally.
  const completedByProduct = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.status === "completed") {
      completedByProduct.set(transaction.productId, (completedByProduct.get(transaction.productId) ?? 0) + 1);
    }
  }
  const viewsRandom = root.fork("views");
  const interest = PRODUCTS.map(
    (product) => (completedByProduct.get(product.id) ?? 0) / Math.max(allVisitors, 1) / product.targetConversion,
  );
  const productViews: DailyProductViews[] = days.flatMap((date, dayIndex) =>
    PRODUCTS.map((product, productIndex) => ({
      date,
      productId: product.id,
      views: viewsRandom.poisson((totalVisitorsByDay[dayIndex] ?? 0) * (interest[productIndex] ?? 0)),
    })),
  );

  // 7. Expenses: fixed costs plus fees, ad spend and delivery costs that follow the ledger.
  const variableByDay = new Map<IsoDate, number>();
  const addVariable = (date: IsoDate, amount: number) => variableByDay.set(date, (variableByDay.get(date) ?? 0) + amount);
  for (const transaction of transactions) {
    if (transaction.status === "completed" || transaction.status === "refunded") {
      addVariable(transaction.date, basisPointsOf(transaction.amountMinor, PROCESSING_FEE_BPS) + PROCESSING_FEE_FIXED_MINOR);
    }
    const product = PRODUCTS.find((item) => item.id === transaction.productId);
    if (transaction.status === "completed" && product?.category === "Services") {
      addVariable(transaction.date, basisPointsOf(transaction.amountMinor, SERVICES_DELIVERY_BPS));
    }
  }
  const socialIndex = CHANNELS.findIndex((channel) => channel.id === "social");
  const costRandom = root.fork("costs");
  const expenses: DailyExpense[] = days.map((date, dayIndex) => {
    const schedule = FIXED_COST_SCHEDULE.findLast((step) => step.from <= date) ?? FIXED_COST_SCHEDULE[0];
    const fixedDaily = ((schedule?.monthlyMinor ?? 0) * 12) / 365;
    const adSpend = (visitorsByDay[dayIndex]?.[socialIndex] ?? 0) * PAID_SOCIAL_CPC_MINOR;
    return {
      date,
      amountMinor: Math.round(fixedDaily * costRandom.noise(0.05)) + adSpend + (variableByDay.get(date) ?? 0),
    };
  });

  // 8. Notifications drawn from recent ledger events.
  const notifications = buildNotifications({
    end: config.end,
    now: config.now,
    transactions,
    customers,
    customerById: new Map(customers.map((customer) => [customer.id, customer])),
    productName: new Map(PRODUCTS.map((product) => [product.id, product.name])),
    channelName: new Map(CHANNELS.map((channel) => [channel.id, channel.name])),
  });

  return {
    span: { from: config.start, to: config.end },
    now: config.now,
    baseCurrency: BASE_CURRENCY,
    products: PRODUCTS.map(({ id, name, category, unitPriceMinor }) => ({ id, name, category, unitPriceMinor })),
    channels: CHANNELS.map(({ id, name }) => ({ id, name })),
    customers,
    transactions,
    traffic,
    productViews,
    expenses,
    notifications,
  };
}
