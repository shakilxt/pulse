import { describe, expect, it } from "vitest";
import {
  changeDirection,
  foldIntoOther,
  percentChange,
  pointChange,
  roundSharesTo100,
  safeRatio,
} from "./calculations";

describe("percentChange", () => {
  it("returns the relative change as a fraction", () => {
    expect(percentChange(112, 100)).toEqual({ kind: "relative", value: 0.12 });
    expect(percentChange(75, 100)).toEqual({ kind: "relative", value: -0.25 });
    expect(percentChange(100, 100)).toEqual({ kind: "relative", value: 0 });
  });

  it("never divides by a zero baseline", () => {
    expect(percentChange(0, 0)).toEqual({ kind: "relative", value: 0 });
    expect(percentChange(42, 0)).toEqual({ kind: "new" });
    expect(percentChange(-42, 0)).toEqual({ kind: "new" });
  });

  it("measures change from a negative baseline against its magnitude", () => {
    expect(percentChange(-50, -100)).toEqual({ kind: "relative", value: 0.5 });
    expect(percentChange(-150, -100)).toEqual({ kind: "relative", value: -0.5 });
  });

  it("reports missing or invalid baselines as unavailable", () => {
    expect(percentChange(10, null)).toEqual({ kind: "unavailable" });
    expect(percentChange(10, Number.NaN)).toEqual({ kind: "unavailable" });
    expect(percentChange(Number.POSITIVE_INFINITY, 10)).toEqual({ kind: "unavailable" });
  });

  it("cleans floating-point dust to zero", () => {
    const change = percentChange(0.1 + 0.2, 0.3);
    expect(change).toEqual({ kind: "relative", value: 0 });
  });
});

describe("pointChange", () => {
  it("reports the difference between ratios in percentage points", () => {
    const change = pointChange(0.034, 0.03);
    expect(change.kind).toBe("points");
    if (change.kind === "points") expect(change.value).toBeCloseTo(0.4, 10);
  });

  it("differs from the relative change for the same values", () => {
    const relative = percentChange(0.034, 0.03);
    expect(relative.kind === "relative" && relative.value).toBeCloseTo(0.1333, 4);
  });

  it("is unavailable without both ratios", () => {
    expect(pointChange(0.03, null)).toEqual({ kind: "unavailable" });
    expect(pointChange(null, 0.03)).toEqual({ kind: "unavailable" });
  });
});

describe("changeDirection", () => {
  it("maps each kind to a direction", () => {
    expect(changeDirection({ kind: "relative", value: 0.1 })).toBe("up");
    expect(changeDirection({ kind: "points", value: -0.2 })).toBe("down");
    expect(changeDirection({ kind: "relative", value: 0 })).toBe("flat");
    expect(changeDirection({ kind: "new" })).toBe("up");
    expect(changeDirection({ kind: "unavailable" })).toBe("none");
  });
});

describe("safeRatio", () => {
  it("returns null for a zero denominator", () => {
    expect(safeRatio(3, 4)).toBe(0.75);
    expect(safeRatio(0, 4)).toBe(0);
    expect(safeRatio(3, 0)).toBeNull();
  });
});

describe("roundSharesTo100", () => {
  it("always totals exactly 100", () => {
    const shares = roundSharesTo100([1, 1, 1]);
    expect(shares).toEqual([34, 33, 33]);
    expect(roundSharesTo100([2, 3, 5, 7, 11]).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("supports decimal places", () => {
    const shares = roundSharesTo100([1, 1, 1], 1);
    expect(shares).toEqual([33.4, 33.3, 33.3]);
  });

  it("returns zeros when everything is zero", () => {
    expect(roundSharesTo100([0, 0])).toEqual([0, 0]);
    expect(roundSharesTo100([])).toEqual([]);
  });
});

describe("foldIntoOther", () => {
  const items = [
    { id: "a", value: 5 },
    { id: "b", value: 50 },
    { id: "c", value: 20 },
    { id: "d", value: 10 },
  ];
  const combine = (rest: readonly { id: string; value: number }[]) => ({
    id: "other",
    value: rest.reduce((sum, item) => sum + item.value, 0),
  });

  it("keeps series by identity and folds the rest", () => {
    expect(foldIntoOther(items, ["a", "c"], combine)).toEqual([
      { id: "a", value: 5 },
      { id: "c", value: 20 },
      { id: "other", value: 60 },
    ]);
  });

  it("adds no Other entry when nothing is left over", () => {
    expect(foldIntoOther(items.slice(0, 2), ["a", "b"], combine)).toEqual(items.slice(0, 2));
  });

  it("skips kept ids that are missing", () => {
    expect(foldIntoOther(items.slice(0, 1), ["z", "a"], combine)).toEqual(items.slice(0, 1));
  });
});
