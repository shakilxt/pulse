/**
 * Comparison maths shared by KPIs, chart summaries and reports.
 *
 * Ratios (conversion rate, share, margin) are stored as fractions between 0
 * and 1. A change between two ratios is reported in percentage points, never as
 * a relative percentage, so "3.0% → 3.4%" reads as "+0.4 pp" and not "+13.3%".
 */

export type Change =
  /** Relative change as a fraction: 0.124 means +12.4%. */
  | { kind: "relative"; value: number }
  /** Difference between two ratios in percentage points: 0.4 means +0.4 pp. */
  | { kind: "points"; value: number }
  /** The baseline was zero, so a relative change is undefined. */
  | { kind: "new" }
  /** No comparison data exists for the period. */
  | { kind: "unavailable" };

/** Treat floating-point dust as an exact zero so it never renders as "-0.0%". */
const EPSILON = 1e-9;

function cleanZero(value: number): number {
  return Math.abs(value) < EPSILON ? 0 : value;
}

/**
 * Relative change from `previous` to `current`.
 * - Zero baseline with a zero result is no change; with a non-zero result it is "new".
 * - A negative baseline divides by its magnitude, so improving from -100 to -50 is +50%.
 */
export function percentChange(current: number, previous: number | null): Change {
  if (previous === null || !Number.isFinite(previous) || !Number.isFinite(current)) {
    return { kind: "unavailable" };
  }
  if (previous === 0) {
    return current === 0 ? { kind: "relative", value: 0 } : { kind: "new" };
  }
  return { kind: "relative", value: cleanZero((current - previous) / Math.abs(previous)) };
}

/** Change between two ratios in percentage points. */
export function pointChange(current: number | null, previous: number | null): Change {
  if (current === null || previous === null || !Number.isFinite(current) || !Number.isFinite(previous)) {
    return { kind: "unavailable" };
  }
  return { kind: "points", value: cleanZero((current - previous) * 100) };
}

export type ChangeDirection = "up" | "down" | "flat" | "none";

export function changeDirection(change: Change): ChangeDirection {
  switch (change.kind) {
    case "relative":
    case "points":
      return change.value > 0 ? "up" : change.value < 0 ? "down" : "flat";
    case "new":
      return "up";
    case "unavailable":
      return "none";
  }
}

/** numerator ÷ denominator, or null when the denominator is zero. */
export function safeRatio(numerator: number, denominator: number): number | null {
  if (denominator === 0 || !Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  return numerator / denominator;
}

/**
 * Rounds shares to whole percentages (or `decimals` places) that always add up
 * to exactly 100, using the largest-remainder method. Returns zeros when the
 * total is zero.
 */
export function roundSharesTo100(values: readonly number[], decimals = 0): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return values.map(() => 0);

  const scale = 10 ** decimals;
  const target = 100 * scale;
  const exact = values.map((value) => (value / total) * target);
  const floored = exact.map(Math.floor);
  let remaining = target - floored.reduce((sum, value) => sum + value, 0);

  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (const { index } of order) {
    if (remaining <= 0) break;
    floored[index] = (floored[index] ?? 0) + 1;
    remaining -= 1;
  }
  return floored.map((value) => value / scale);
}

/**
 * Keeps the series named in `keepIds` (in that order) and folds everything else
 * into one combined entry. Selection is by identity, not rank, so a filter that
 * changes the numbers never repaints the series that remain.
 */
export function foldIntoOther<T extends { id: string }>(
  items: readonly T[],
  keepIds: readonly string[],
  combine: (rest: readonly T[]) => T,
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const kept = keepIds.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
  const keep = new Set(keepIds);
  const rest = items.filter((item) => !keep.has(item.id));
  return rest.length > 0 ? [...kept, combine(rest)] : kept;
}
