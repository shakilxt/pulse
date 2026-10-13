import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  alignComparisonBuckets,
  bucketize,
  clampRange,
  dayOfWeek,
  diffDays,
  eachDay,
  getComparisonRange,
  granularityFor,
  isIsoDate,
  rangeLength,
  resolvePresetRange,
  type DateBucket,
  type DateRange,
} from "./dates";

const ANCHOR = "2026-09-30";

function expectContiguousCover(buckets: DateBucket[], range: DateRange) {
  expect(buckets[0]?.start).toBe(range.from);
  expect(buckets.at(-1)?.end).toBe(range.to);
  for (let i = 1; i < buckets.length; i++) {
    expect(buckets[i]?.start).toBe(addDays(buckets[i - 1]?.end ?? "", 1));
  }
  expect(buckets.reduce((sum, bucket) => sum + bucket.days, 0)).toBe(rangeLength(range));
}

describe("isIsoDate", () => {
  it("accepts real calendar dates only", () => {
    expect(isIsoDate("2026-09-30")).toBe(true);
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2025-02-29")).toBe(false);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-9-30")).toBe(false);
    expect(isIsoDate("2026-09-30T00:00:00Z")).toBe(false);
    expect(isIsoDate(" 2026-09-30")).toBe(false);
    expect(isIsoDate(20260930)).toBe(false);
  });
});

describe("date arithmetic", () => {
  it("adds days across month, year and leap boundaries", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(diffDays("2026-01-01", "2026-12-31")).toBe(364);
    expect(diffDays("2026-12-31", "2026-01-01")).toBe(-364);
  });

  it("clamps the day when adding months", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2026-09-30", -12)).toBe("2025-09-30");
    expect(addMonths("2026-01-15", -13)).toBe("2024-12-15");
  });

  it("knows the day of the week", () => {
    expect(dayOfWeek("1970-01-01")).toBe(4);
    expect(dayOfWeek("2026-09-30")).toBe(3);
    expect(dayOfWeek("1969-12-28")).toBe(0);
  });

  it("lists every day of an inclusive range", () => {
    expect(eachDay({ from: "2026-02-27", to: "2026-03-02" })).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
      "2026-03-02",
    ]);
  });
});

describe("clampRange", () => {
  const bounds = { from: "2024-01-01", to: ANCHOR };

  it("intersects with the data span", () => {
    expect(clampRange({ from: "2023-06-01", to: "2024-01-10" }, bounds)).toEqual({
      from: "2024-01-01",
      to: "2024-01-10",
    });
    expect(clampRange({ from: "2026-09-01", to: "2027-01-01" }, bounds)).toEqual({
      from: "2026-09-01",
      to: ANCHOR,
    });
  });

  it("returns null when there is no overlap", () => {
    expect(clampRange({ from: "2027-01-01", to: "2027-02-01" }, bounds)).toBeNull();
  });
});

describe("presets and comparison ranges", () => {
  it("resolves presets ending on the anchor", () => {
    expect(resolvePresetRange("7d", ANCHOR)).toEqual({ from: "2026-09-24", to: ANCHOR });
    expect(rangeLength(resolvePresetRange("30d", ANCHOR))).toBe(30);
    expect(rangeLength(resolvePresetRange("90d", ANCHOR))).toBe(90);
    expect(resolvePresetRange("12m", ANCHOR)).toEqual({ from: "2025-10-01", to: ANCHOR });
    expect(resolvePresetRange("ytd", ANCHOR)).toEqual({ from: "2026-01-01", to: ANCHOR });
  });

  it("uses the equal-length period immediately before", () => {
    expect(getComparisonRange({ from: "2026-09-24", to: ANCHOR }, "previous-period")).toEqual({
      from: "2026-09-17",
      to: "2026-09-23",
    });
    const twelveMonths = resolvePresetRange("12m", ANCHOR);
    const previous = getComparisonRange(twelveMonths, "previous-period");
    expect(previous).toEqual({ from: "2024-10-01", to: "2025-09-30" });
    expect(rangeLength(previous)).toBe(rangeLength(twelveMonths));
  });

  it("uses the same dates last year, keeping month ends", () => {
    expect(getComparisonRange({ from: "2026-01-01", to: ANCHOR }, "previous-year")).toEqual({
      from: "2025-01-01",
      to: "2025-09-30",
    });
    expect(getComparisonRange({ from: "2025-02-01", to: "2025-02-28" }, "previous-year")).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    });
    expect(getComparisonRange({ from: "2025-02-10", to: "2025-02-20" }, "previous-year")).toEqual({
      from: "2024-02-10",
      to: "2024-02-20",
    });
  });
});

describe("bucketize", () => {
  it("picks a granularity from the range length", () => {
    expect(granularityFor(resolvePresetRange("7d", ANCHOR))).toBe("day");
    expect(granularityFor(resolvePresetRange("30d", ANCHOR))).toBe("day");
    expect(granularityFor({ from: "2026-08-31", to: ANCHOR })).toBe("day"); // 31 days
    expect(granularityFor({ from: "2026-08-30", to: ANCHOR })).toBe("week"); // 32 days
    expect(granularityFor(resolvePresetRange("90d", ANCHOR))).toBe("week");
    expect(granularityFor(resolvePresetRange("12m", ANCHOR))).toBe("month");
    expect(granularityFor(resolvePresetRange("ytd", ANCHOR))).toBe("month");
  });

  it("creates one bucket per day", () => {
    const range = resolvePresetRange("7d", ANCHOR);
    const buckets = bucketize(range, "day");
    expect(buckets).toHaveLength(7);
    expect(buckets.every((bucket) => bucket.days === 1 && !bucket.partial)).toBe(true);
    expectContiguousCover(buckets, range);
  });

  it("counts weeks back from the range end so only the oldest can be partial", () => {
    const range = resolvePresetRange("90d", ANCHOR);
    const buckets = bucketize(range, "week");
    expect(buckets).toHaveLength(13);
    expect(buckets[0]).toMatchObject({ days: 6, partial: true });
    expect(buckets.slice(1).every((bucket) => bucket.days === 7 && !bucket.partial)).toBe(true);
    expect(buckets.at(-1)).toMatchObject({ start: "2026-09-24", end: ANCHOR });
    expectContiguousCover(buckets, range);
  });

  it("uses calendar months and flags clipped months", () => {
    const twelveMonths = resolvePresetRange("12m", ANCHOR);
    const months = bucketize(twelveMonths, "month");
    expect(months).toHaveLength(12);
    expect(months.every((bucket) => !bucket.partial)).toBe(true);
    expectContiguousCover(months, twelveMonths);

    const custom = { from: "2026-02-15", to: "2026-06-10" };
    const clipped = bucketize(custom, "month");
    expect(clipped.map((bucket) => [bucket.start, bucket.end, bucket.partial])).toEqual([
      ["2026-02-15", "2026-02-28", true],
      ["2026-03-01", "2026-03-31", false],
      ["2026-04-01", "2026-04-30", false],
      ["2026-05-01", "2026-05-31", false],
      ["2026-06-01", "2026-06-10", true],
    ]);
    expectContiguousCover(clipped, custom);
  });

  it("returns nothing for an inverted range", () => {
    expect(bucketize({ from: "2026-09-02", to: "2026-09-01" }, "day")).toEqual([]);
  });
});

describe("alignComparisonBuckets", () => {
  it("mirrors buckets into the previous period", () => {
    const range = resolvePresetRange("90d", ANCHOR);
    const buckets = bucketize(range, "week");
    const aligned = alignComparisonBuckets(buckets, range, "previous-period");
    expect(aligned).toHaveLength(buckets.length);
    expect(aligned.map((bucket) => bucket.days)).toEqual(buckets.map((bucket) => bucket.days));
    expectContiguousCover(aligned, getComparisonRange(range, "previous-period"));
  });

  it("maps months onto the same months last year", () => {
    const range = resolvePresetRange("ytd", ANCHOR);
    const aligned = alignComparisonBuckets(bucketize(range, "month"), range, "previous-year");
    expect(aligned.map((bucket) => bucket.start)).toEqual([
      "2025-01-01",
      "2025-02-01",
      "2025-03-01",
      "2025-04-01",
      "2025-05-01",
      "2025-06-01",
      "2025-07-01",
      "2025-08-01",
      "2025-09-01",
    ]);
    expectContiguousCover(aligned, getComparisonRange(range, "previous-year"));
  });

  it("absorbs the leap day when comparing daily data with the previous year", () => {
    const range = { from: "2025-02-27", to: "2025-03-02" };
    const aligned = alignComparisonBuckets(bucketize(range, "day"), range, "previous-year");
    expect(aligned.map((bucket) => [bucket.start, bucket.days])).toEqual([
      ["2024-02-27", 1],
      ["2024-02-28", 2],
      ["2024-03-01", 1],
      ["2024-03-02", 1],
    ]);
    expectContiguousCover(aligned, getComparisonRange(range, "previous-year"));
  });
});
