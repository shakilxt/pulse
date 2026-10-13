/**
 * CSV generation following RFC 4180: comma-separated fields, CRLF line endings,
 * and fields containing commas, quotes or line breaks wrapped in double quotes
 * with inner quotes doubled. A UTF-8 byte-order mark lets Excel detect the
 * encoding.
 */

export type CsvValue = string | number | null | undefined;

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => CsvValue;
}

const BOM = "﻿";
const LINE_BREAK = "\r\n";

export const CSV_MIME_TYPE = "text/csv;charset=utf-8";

/** Text starting with these characters is run as a formula by spreadsheet apps. */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]|^\s|\s$/;

/**
 * Escapes one field. Numbers are written as plain digits; text that a
 * spreadsheet would evaluate as a formula is prefixed with an apostrophe
 * (OWASP CSV-injection guidance) before quoting.
 */
export function escapeCsvField(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";

  const text = FORMULA_TRIGGER.test(value) ? `'${value}` : value;
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv<T>(
  columns: readonly CsvColumn<T>[],
  rows: readonly T[],
  { includeBom = true }: { includeBom?: boolean } = {},
): string {
  const lines = [
    columns.map((column) => escapeCsvField(column.header)).join(","),
    ...rows.map((row) => columns.map((column) => escapeCsvField(column.value(row))).join(",")),
  ];
  return `${includeBom ? BOM : ""}${lines.join(LINE_BREAK)}${LINE_BREAK}`;
}

/** "pulse-revenue-2026-09-01-to-2026-09-30.csv" from readable parts. */
export function csvFileName(...parts: string[]): string {
  const slug = parts
    .map((part) =>
      part
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean)
    .join("-");
  return `${slug || "export"}.csv`;
}
