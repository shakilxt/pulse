/**
 * Validation for the custom date-range form. The URL parser clamps and swaps
 * bad values silently; the form instead explains what to fix, next to the
 * field that needs it.
 */

import { type DateRange, isIsoDate } from "./dates";
import { formatDate } from "./formatters";

export type DateRangeField = "from" | "to";

export type DateRangeInputResult =
  | { ok: true; range: DateRange }
  | { ok: false; errors: Partial<Record<DateRangeField, string>> };

export function validateDateRangeInput(from: string, to: string, bounds: DateRange): DateRangeInputResult {
  const errors: Partial<Record<DateRangeField, string>> = {};
  const available = `Choose a date between ${formatDate(bounds.from)} and ${formatDate(bounds.to)}.`;

  for (const [field, value, label] of [
    ["from", from, "a start date"],
    ["to", to, "an end date"],
  ] as const) {
    if (value === "") errors[field] = `Enter ${label}.`;
    else if (!isIsoDate(value)) errors[field] = "Enter a real date.";
    else if (value < bounds.from || value > bounds.to) errors[field] = available;
  }

  if (!errors.from && !errors.to && from > to) {
    errors.to = "The end date must be on or after the start date.";
  }

  if (errors.from || errors.to) return { ok: false, errors };
  return { ok: true, range: { from, to } };
}
