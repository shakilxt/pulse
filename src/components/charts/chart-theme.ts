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
