import { describe, expect, it } from "vitest";
import { validateDateRangeInput } from "./date-range-input";

const bounds = { from: "2024-01-01", to: "2026-09-30" };

describe("validateDateRangeInput", () => {
  it("accepts a range inside the data, including a single day", () => {
    expect(validateDateRangeInput("2026-02-10", "2026-03-26", bounds)).toEqual({
      ok: true,
      range: { from: "2026-02-10", to: "2026-03-26" },
    });
    expect(validateDateRangeInput("2026-09-30", "2026-09-30", bounds).ok).toBe(true);
  });

  it("explains a missing or impossible date on the field it belongs to", () => {
    expect(validateDateRangeInput("", "2026-03-01", bounds)).toEqual({
      ok: false,
      errors: { from: "Enter a start date." },
    });
    expect(validateDateRangeInput("2026-02-30", "", bounds)).toEqual({
      ok: false,
      errors: { from: "Enter a real date.", to: "Enter an end date." },
    });
  });

  it("names the available span for dates outside the data", () => {
    const result = validateDateRangeInput("2023-12-31", "2026-10-01", bounds);
    expect(result).toEqual({
      ok: false,
      errors: {
        from: "Choose a date between Jan 1, 2024 and Sep 30, 2026.",
        to: "Choose a date between Jan 1, 2024 and Sep 30, 2026.",
      },
    });
  });

  it("flags a reversed range on the end date", () => {
    expect(validateDateRangeInput("2026-03-26", "2026-02-10", bounds)).toEqual({
      ok: false,
      errors: { to: "The end date must be on or after the start date." },
    });
  });
});
