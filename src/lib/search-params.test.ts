import { describe, expect, it } from "vitest";
import {
  dateRangeToParams,
  firstParam,
  mergeSearchParams,
  parseDateRangeParams,
  parseEnumParam,
  parsePageParam,
  parseSearchParam,
  parseSortParam,
  serializeSort,
} from "./search-params";

const bounds = { from: "2024-01-01", to: "2026-09-30" };
const options = { bounds, defaultPreset: "30d" as const };

describe("primitive parsers", () => {
  it("takes the first of repeated values", () => {
    expect(firstParam(["a", "b"])).toBe("a");
    expect(firstParam([])).toBeUndefined();
    expect(firstParam("a")).toBe("a");
  });

  it("accepts only listed enum values", () => {
    const statuses = ["all", "active", "inactive"] as const;
    expect(parseEnumParam("active", statuses, "all")).toBe("active");
    expect(parseEnumParam("ACTIVE", statuses, "all")).toBe("all");
    expect(parseEnumParam("<script>", statuses, "all")).toBe("all");
    expect(parseEnumParam(undefined, statuses, "all")).toBe("all");
  });

  it("cleans and caps search text", () => {
    expect(parseSearchParam("  ana    lind ")).toBe("ana lind");
    expect(parseSearchParam("x".repeat(200))).toHaveLength(80);
    expect(parseSearchParam(undefined)).toBe("");
  });

  it("accepts only positive whole page numbers", () => {
    expect(parsePageParam("3")).toBe(3);
    for (const bad of ["0", "-1", "2.5", "1e3", "03", "abc", "", "9999999", undefined]) {
      expect(parsePageParam(bad)).toBe(1);
    }
  });

  it("parses sort keys against the allowed columns", () => {
    const keys = ["date", "amount"] as const;
    const fallback = { key: "date" as const, direction: "desc" as const };
    expect(parseSortParam("amount.asc", keys, fallback)).toEqual({ key: "amount", direction: "asc" });
    expect(parseSortParam("amount", keys, fallback)).toEqual(fallback);
    expect(parseSortParam("email.asc", keys, fallback)).toEqual(fallback);
    expect(parseSortParam("amount.sideways", keys, fallback)).toEqual(fallback);
    expect(serializeSort({ key: "amount", direction: "asc" })).toBe("amount.asc");
  });
});

describe("parseDateRangeParams", () => {
  it("falls back to the default preset", () => {
    expect(parseDateRangeParams({}, options)).toEqual({
      preset: "30d",
      range: { from: "2026-09-01", to: "2026-09-30" },
      comparison: "previous-period",
    });
    expect(parseDateRangeParams({ range: "2y" }, options).preset).toBe("30d");
  });

  it("reads presets and defaults year to date to a year-on-year comparison", () => {
    expect(parseDateRangeParams({ range: "ytd" }, options)).toEqual({
      preset: "ytd",
      range: { from: "2026-01-01", to: "2026-09-30" },
      comparison: "previous-year",
    });
    expect(parseDateRangeParams({ range: "7d", compare: "previous-year" }, options).comparison).toBe(
      "previous-year",
    );
    expect(parseDateRangeParams({ range: "7d", compare: "bogus" }, options).comparison).toBe(
      "previous-period",
    );
  });

  it("reads custom ranges, swapping reversed dates and clamping to the data", () => {
    expect(parseDateRangeParams({ from: "2026-03-01", to: "2026-03-31" }, options)).toMatchObject({
      preset: "custom",
      range: { from: "2026-03-01", to: "2026-03-31" },
    });
    expect(parseDateRangeParams({ from: "2026-03-31", to: "2026-03-01" }, options).range).toEqual({
      from: "2026-03-01",
      to: "2026-03-31",
    });
    expect(parseDateRangeParams({ from: "2023-06-01", to: "2027-01-01" }, options).range).toEqual(bounds);
  });

  it("ignores invalid or out-of-span custom dates", () => {
    expect(parseDateRangeParams({ from: "2026-02-30", to: "2026-03-31" }, options).preset).toBe("30d");
    expect(parseDateRangeParams({ from: "2026-03-01" }, options).preset).toBe("30d");
    expect(parseDateRangeParams({ from: "2027-01-01", to: "2027-02-01", range: "90d" }, options).preset).toBe(
      "90d",
    );
  });

  it("round-trips through query values, omitting defaults", () => {
    const state = parseDateRangeParams({ from: "2026-03-01", to: "2026-03-31", compare: "previous-year" }, options);
    expect(dateRangeToParams(state, "30d")).toEqual({
      range: null,
      from: "2026-03-01",
      to: "2026-03-31",
      compare: "previous-year",
    });
    expect(dateRangeToParams(parseDateRangeParams({}, options), "30d")).toEqual({
      range: null,
      from: null,
      to: null,
      compare: null,
    });
    expect(dateRangeToParams(parseDateRangeParams({ range: "ytd" }, options), "30d")).toEqual({
      range: "ytd",
      from: null,
      to: null,
      compare: null,
    });
  });
});

describe("mergeSearchParams", () => {
  it("sets, replaces and removes keys", () => {
    expect(mergeSearchParams("q=ana&page=3", { page: null, status: "active" })).toBe("?q=ana&status=active");
    expect(mergeSearchParams("q=ana", { q: "" })).toBe("");
    expect(mergeSearchParams(new URLSearchParams(), { q: "a&b" })).toBe("?q=a%26b");
  });
});
