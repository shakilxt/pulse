/**
 * Money is stored and summed as integer minor units (cents). Conversion and
 * rounding happen once, at the edge, so totals never drift from their rows.
 */

export const CURRENCY_CODES = ["USD", "EUR", "GBP"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/** Every record in the demo ledger is denominated in the base currency. */
export const BASE_CURRENCY: CurrencyCode = "USD";

/** All supported currencies use two decimal places. */
const MINOR_UNITS_PER_MAJOR = 100;

/**
 * Fixed demonstration exchange rates, as target minor units per 10,000 base
 * minor units. They are not market data and never change.
 */
export const DEMO_EXCHANGE_RATES_BPS: Record<CurrencyCode, number> = {
  USD: 10_000,
  EUR: 9_200,
  GBP: 7_900,
};

export const DEMO_EXCHANGE_RATE_NOTE = "Converted at fixed demo rates: 1 USD = 0.92 EUR = 0.79 GBP.";

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return CURRENCY_CODES.some((code) => code === value);
}

function assertMinor(value: number): number {
  if (!Number.isSafeInteger(value)) throw new RangeError(`Expected integer minor units, got ${value}`);
  return value;
}

/** Rounds .5 away from zero, so +2.5 → 3 and -2.5 → -3 (Math.round would give -2). */
export function roundHalfAwayFromZero(value: number): number {
  const rounded = Math.round(Math.abs(value));
  return value < 0 ? -rounded : rounded;
}

export function sumMinor(values: Iterable<number>): number {
  let total = 0;
  for (const value of values) total += assertMinor(value);
  return assertMinor(total);
}

export function multiplyMinor(unitMinor: number, quantity: number): number {
  return assertMinor(assertMinor(unitMinor) * assertMinor(quantity));
}

/** A share of an amount in basis points (290 = 2.9%), rounded to the nearest minor unit. */
export function basisPointsOf(amountMinor: number, basisPoints: number): number {
  return roundHalfAwayFromZero((assertMinor(amountMinor) * basisPoints) / 10_000);
}

/** Average in minor units, or null when there is nothing to average. */
export function averageMinor(totalMinor: number, count: number): number | null {
  if (count <= 0) return null;
  return roundHalfAwayFromZero(assertMinor(totalMinor) / count);
}

/** Converts base-currency minor units into the display currency at the fixed demo rate. */
export function convertMinor(amountMinor: number, to: CurrencyCode): number {
  if (to === BASE_CURRENCY) return assertMinor(amountMinor);
  return roundHalfAwayFromZero((assertMinor(amountMinor) * DEMO_EXCHANGE_RATES_BPS[to]) / 10_000);
}

/** Major units as a number, for chart scales and Intl formatting. */
export function toMajor(amountMinor: number): number {
  return amountMinor / MINOR_UNITS_PER_MAJOR;
}

/** Exact decimal string ("-1234.05") without floating-point formatting, for CSV cells. */
export function minorToDecimalString(amountMinor: number): string {
  const value = assertMinor(amountMinor);
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const major = Math.floor(absolute / MINOR_UNITS_PER_MAJOR);
  const minor = absolute % MINOR_UNITS_PER_MAJOR;
  return `${sign}${major}.${String(minor).padStart(2, "0")}`;
}
