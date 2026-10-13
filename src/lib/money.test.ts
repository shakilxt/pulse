import { describe, expect, it } from "vitest";
import {
  averageMinor,
  DEMO_EXCHANGE_RATES_BPS,
  basisPointsOf,
  convertAllocated,
  convertMinor,
  isCurrencyCode,
  minorToDecimalString,
  multiplyMinor,
  roundHalfAwayFromZero,
  sumMinor,
} from "./money";

describe("money", () => {
  it("rounds halves away from zero", () => {
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
    expect(roundHalfAwayFromZero(2.4)).toBe(2);
    expect(Object.is(roundHalfAwayFromZero(-0.4), -0)).toBe(true);
  });

  it("only accepts integer minor units", () => {
    expect(sumMinor([1999, 1, 25_000])).toBe(27_000);
    expect(sumMinor([])).toBe(0);
    expect(() => sumMinor([10.5])).toThrow(RangeError);
    expect(multiplyMinor(2_900, 3)).toBe(8_700);
    expect(() => multiplyMinor(2_900, 1.5)).toThrow(RangeError);
  });

  it("takes basis-point shares and averages to whole cents", () => {
    expect(basisPointsOf(10_000, 290)).toBe(290);
    expect(basisPointsOf(8_950, 290)).toBe(260); // 259.55
    expect(averageMinor(10_000, 3)).toBe(3_333);
    expect(averageMinor(5, 2)).toBe(3);
    expect(averageMinor(10_000, 0)).toBeNull();
  });

  it("converts at the fixed demo rates", () => {
    expect(convertMinor(10_000, "USD")).toBe(10_000);
    expect(convertMinor(10_000, "EUR")).toBe(9_200);
    expect(convertMinor(10_000, "GBP")).toBe(7_900);
    expect(convertMinor(1, "EUR")).toBe(1); // 0.92 rounds up
    expect(convertMinor(-1_250, "GBP")).toBe(-988); // -987.5 rounds away from zero
  });

  it("writes exact decimal strings", () => {
    expect(minorToDecimalString(123_405)).toBe("1234.05");
    expect(minorToDecimalString(-5)).toBe("-0.05");
    expect(minorToDecimalString(0)).toBe("0.00");
  });

  it("recognises supported currencies", () => {
    expect(isCurrencyCode("EUR")).toBe(true);
    expect(isCurrencyCode("eur")).toBe(false);
    expect(isCurrencyCode("JPY")).toBe(false);
    expect(isCurrencyCode(undefined)).toBe(false);
  });
});

describe("convertAllocated", () => {
  it("keeps base-currency amounts unchanged", () => {
    expect(convertAllocated([1, 2, 3], "USD")).toEqual([1, 2, 3]);
  });

  it("converts parts so they add up to the converted total", () => {
    const amounts = [333, 333, 334, 1_005, 7, 0, 12_345_678];
    for (const currency of ["EUR", "GBP"] as const) {
      const parts = convertAllocated(amounts, currency);
      expect(parts.reduce((sum, value) => sum + value, 0)).toBe(convertMinor(amounts.reduce((a, b) => a + b, 0), currency));
      parts.forEach((part, index) => {
        const exact = ((amounts[index] ?? 0) * DEMO_EXCHANGE_RATES_BPS[currency]) / 10_000;
        expect(Math.abs(part - exact)).toBeLessThan(1);
      });
    }
  });

  it("rejects negative and fractional amounts", () => {
    expect(() => convertAllocated([10, -1], "EUR")).toThrow(RangeError);
    expect(() => convertAllocated([1.5], "EUR")).toThrow(RangeError);
  });
});
