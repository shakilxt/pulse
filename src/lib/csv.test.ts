import { describe, expect, it } from "vitest";
import { csvFileName, escapeCsvField, toCsv } from "./csv";

describe("escapeCsvField", () => {
  it("leaves plain values alone", () => {
    expect(escapeCsvField("Field Notes Planner")).toBe("Field Notes Planner");
    expect(escapeCsvField(1234.5)).toBe("1234.5");
    expect(escapeCsvField(-12)).toBe("-12");
    expect(escapeCsvField(null)).toBe("");
    expect(escapeCsvField(undefined)).toBe("");
    expect(escapeCsvField(Number.NaN)).toBe("");
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(escapeCsvField("Hart, Zoë")).toBe('"Hart, Zoë"');
    expect(escapeCsvField('The "Canopy" kit')).toBe('"The ""Canopy"" kit"');
    expect(escapeCsvField("line one\nline two")).toBe('"line one\nline two"');
    expect(escapeCsvField("line one\r\nline two")).toBe('"line one\r\nline two"');
    expect(escapeCsvField(" padded ")).toBe('" padded "');
  });

  it("neutralises text a spreadsheet would run as a formula", () => {
    expect(escapeCsvField("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(escapeCsvField("+1 555")).toBe("'+1 555");
    expect(escapeCsvField("-note")).toBe("'-note");
    expect(escapeCsvField("@handle")).toBe("'@handle");
    expect(escapeCsvField('=HYPERLINK("x","y")')).toBe(`"'=HYPERLINK(""x"",""y"")"`);
  });
});

describe("toCsv", () => {
  const columns = [
    { header: "Customer", value: (row: { name: string; total: number }) => row.name },
    { header: "Total (USD)", value: (row: { name: string; total: number }) => row.total },
  ];

  it("writes a BOM, a header row and CRLF line endings", () => {
    const csv = toCsv(columns, [
      { name: "Hart, Zoë", total: 120.5 },
      { name: "Ana Lindqvist", total: 89 },
    ]);
    expect(csv).toBe('﻿Customer,Total (USD)\r\n"Hart, Zoë",120.5\r\nAna Lindqvist,89\r\n');
  });

  it("can omit the BOM and handles no rows", () => {
    expect(toCsv(columns, [], { includeBom: false })).toBe("Customer,Total (USD)\r\n");
  });
});

describe("csvFileName", () => {
  it("builds a safe, readable file name", () => {
    expect(csvFileName("PULSE", "Revenue summary", "2026-09-01", "to", "2026-09-30")).toBe(
      "pulse-revenue-summary-2026-09-01-to-2026-09-30.csv",
    );
    expect(csvFileName("../..", "")).toBe("export.csv");
  });
});
