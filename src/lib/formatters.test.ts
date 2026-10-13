import { describe, expect, it } from "vitest";
import {
  changeDigits,
  describeChange,
  formatChange,
  formatCompactNumber,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatInteger,
  formatMetricValue,
  formatMoney,
  formatPercent,
  formatRelativeTime,
} from "./formatters";

describe("formatMoney", () => {
  it("formats minor units in the chosen currency", () => {
    expect(formatMoney(8_421_050, "USD")).toBe("$84,210.50");
    expect(formatMoney(8_421_050, "USD", { whole: true })).toBe("$84,211");
    // Base-currency amounts are converted at the fixed demo rates before formatting.
    expect(formatMoney(123_450, "EUR")).toBe("€1,135.74");
    expect(formatMoney(-123_450, "GBP")).toBe("-£975.26");
  });

  it("abbreviates large values without padding small ones", () => {
    expect(formatMoney(8_421_050, "USD", { compact: true })).toBe("$84.2K");
    expect(formatMoney(123_456_700, "USD", { compact: true })).toBe("$1.2M");
    expect(formatMoney(95_000, "USD", { compact: true })).toBe("$950");
  });
});

describe("number formatting", () => {
  it("formats integers, compact numbers and percentages", () => {
    expect(formatInteger(12_480)).toBe("12,480");
    expect(formatCompactNumber(12_480)).toBe("12.5K");
    expect(formatPercent(0.0342)).toBe("3.4%");
    expect(formatPercent(0.5, 0)).toBe("50%");
  });
});

describe("formatChange", () => {
  it("formats relative changes with a sign", () => {
    expect(formatChange({ kind: "relative", value: 0.124 })).toBe("+12.4%");
    expect(formatChange({ kind: "relative", value: -0.031 })).toBe("-3.1%");
  });

  it("formats percentage-point changes distinctly", () => {
    expect(formatChange({ kind: "points", value: 0.40000000000000036 })).toBe("+0.4 pp");
    expect(formatChange({ kind: "points", value: -1.25 })).toBe("-1.3 pp");
  });

  it("drops the sign when a change rounds to zero", () => {
    expect(formatChange({ kind: "relative", value: -0.00004 })).toBe("0.0%");
    expect(formatChange({ kind: "points", value: 0.04 })).toBe("0.0 pp");
  });

  it("labels new and unavailable comparisons", () => {
    expect(formatChange({ kind: "new" })).toBe("New");
    expect(formatChange({ kind: "unavailable" })).toBe("—");
  });
});

describe("KPI formatting", () => {
  it("formats each metric format and the missing value", () => {
    expect(formatMetricValue(5_754_800, "currency", "USD")).toBe("$57,548");
    expect(formatMetricValue(3740, "integer", "USD")).toBe("3,740");
    expect(formatMetricValue(0.010527, "percentage", "USD")).toBe("1.05%");
    expect(formatMetricValue(null, "currency", "USD")).toBe("—");
    expect(formatChange({ kind: "points", value: 0.0809 }, changeDigits("percentage"))).toBe("+0.08 pp");
  });

  it("describes changes in words", () => {
    expect(describeChange({ kind: "relative", value: 0.0633 })).toBe("up 6.3%");
    expect(describeChange({ kind: "relative", value: -0.12 })).toBe("down 12.0%");
    expect(describeChange({ kind: "points", value: -0.081 }, 2)).toBe("down 0.08 percentage points");
    expect(describeChange({ kind: "relative", value: 0 })).toBe("no change");
    expect(describeChange({ kind: "new" })).toBe("new this period, nothing to compare with");
    expect(describeChange({ kind: "unavailable" })).toBe("no comparison data");
  });
});

describe("date formatting", () => {
  it("writes the long form for headings", () => {
    expect(formatDate("2026-09-30", "long")).toBe("Wednesday, September 30, 2026");
  });

  it("formats ISO dates in UTC", () => {
    expect(formatDate("2026-09-30")).toBe("Sep 30, 2026");
    expect(formatDate("2026-09-30", "short")).toBe("Sep 30");
    expect(formatDate("2026-09-30", "month")).toBe("Sep 2026");
    expect(formatDate("2026-09-30", "weekday")).toBe("Wed, Sep 30");
    expect(formatDate("2026-01-01", "monthShort")).toBe("Jan");
  });

  it("collapses shared parts of a range", () => {
    // Intl puts thin spaces (U+2009) around the en dash.
    expect(formatDateRange({ from: "2026-09-01", to: "2026-09-30" })).toBe("Sep 1\u2009–\u200930, 2026");
    expect(formatDateRange({ from: "2025-10-01", to: "2026-09-30" })).toBe("Oct 1, 2025\u2009–\u2009Sep 30, 2026");
    expect(formatDateRange({ from: "2026-09-30", to: "2026-09-30" })).toBe("Sep 30, 2026");
  });

  it("formats timestamps in UTC", () => {
    expect(formatDateTime("2026-09-30T14:20:00Z")).toBe("Sep 30, 2026, 2:20 PM UTC");
  });

  it("describes elapsed time against a fixed clock", () => {
    const now = "2026-09-30T18:00:00Z";
    expect(formatRelativeTime("2026-09-30T15:00:00Z", now)).toBe("3 hours ago");
    expect(formatRelativeTime("2026-09-29T18:00:00Z", now)).toBe("yesterday");
    expect(formatRelativeTime("2026-09-30T17:15:00Z", now)).toBe("45 minutes ago");
    expect(formatRelativeTime("2026-09-30T17:59:30Z", now)).toBe("just now");
  });
});
