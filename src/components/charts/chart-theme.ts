/**
 * Chart colours as CSS custom properties, so Recharts marks follow the active
 * theme without re-rendering. Values and their validation live in globals.css.
 */

/** Categorical slots in fixed order. Assign them by entity, never by rank. */
export const CHART_SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"] as const;

/** Beyond this many series, the rest fold into a neutral "Other". */
export const MAX_CHART_SERIES = CHART_SERIES_COLORS.length;

export const CHART_COLORS = {
  /** Single-series charts. */
  primary: "var(--chart-1)",
  /** The selected or hovered point in a single-series chart. */
  highlight: "var(--chart-3)",
  /** "Other", comparison periods and other secondary marks. */
  neutral: "var(--chart-neutral)",
  grid: "var(--chart-grid)",
  axis: "var(--ink-muted)",
} as const;

export function seriesColor(slot: number): string {
  return CHART_SERIES_COLORS[slot] ?? CHART_COLORS.neutral;
}

/** Axis tick text: muted ink, small, tabular so columns of numbers line up. */
export const AXIS_TICK = {
  fill: "var(--ink-muted)",
  fontSize: 12,
  fontVariantNumeric: "tabular-nums",
} as const;

/** Bars stay thin with a rounded data end and a square baseline. */
export const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
export const MAX_BAR_SIZE = 24;

/** Room on the left for compact money ticks ("$12.5K"). */
export const Y_AXIS_WIDTH = 52;

export const CHART_MARGIN = { top: 12, right: 8, bottom: 0, left: 0 } as const;

/** Revenue versus expenses: two series in the first two categorical slots. */
export const CASHFLOW_SERIES = {
  revenue: { label: "Revenue", color: seriesColor(0) },
  expenses: { label: "Expenses", color: seriesColor(1) },
} as const;
