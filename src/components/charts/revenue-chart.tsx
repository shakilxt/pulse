"use client";

import { useId } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, Tooltip, XAxis, YAxis } from "recharts";
import type { RevenueTrendPoint } from "@/lib/chart-series";
import { formatMoney } from "@/lib/formatters";
import { AXIS_TICK, CHART_COLORS, CHART_MARGIN, Y_AXIS_WIDTH } from "./chart-theme";
import { ChartTooltipCard, type TooltipRow } from "./chart-tooltip";
import { useReducedMotion } from "./use-reduced-motion";

interface RevenueChartProps {
  points: readonly RevenueTrendPoint[];
  /** Accessible name for the drawing; the panel's summary describes it. */
  label: string;
}

const compactMoney = (value: number) => formatMoney(value, { compact: true });
const wholeMoney = (value: number) => formatMoney(value, { whole: true });

/**
 * The overview's hero chart: revenue for the period as an area, the
 * comparison period as a dashed line, and the strongest point marked in gold.
 */
export function RevenueChart({ points, label }: RevenueChartProps) {
  const gradientId = `${useId()}-revenue`;
  const reducedMotion = useReducedMotion();
  const data = [...points];
  const axisLabels = new Map(points.map((point) => [point.date, point.axisLabel]));
  const hasComparison = points.some((point) => point.previousRevenueMinor !== null);
  const peak = points.reduce<RevenueTrendPoint | undefined>(
    (best, point) => (best === undefined || point.revenueMinor > best.revenueMinor ? point : best),
    undefined,
  );
  // Keep the peak's label inside the plot when the peak sits near either edge.
  const peakIndex = peak ? points.indexOf(peak) : -1;
  const peakLabelPosition =
    peakIndex >= points.length * 0.85 ? "left" : peakIndex <= points.length * 0.15 ? "right" : "top";
  // A single bucket has no line to draw, so each series shows as a dot instead.
  const single = points.length === 1;

  return (
    <ComposedChart
      responsive
      data={data}
      margin={{ ...CHART_MARGIN, top: 28 }}
      title={label}
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.18} />
          <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
      <XAxis
        dataKey="date"
        tickFormatter={(date: string) => axisLabels.get(date) ?? ""}
        tick={AXIS_TICK}
        tickLine={false}
        axisLine={{ stroke: CHART_COLORS.grid }}
        interval="preserveStartEnd"
        minTickGap={24}
        tickMargin={8}
      />
      <YAxis
        tickFormatter={compactMoney}
        tick={AXIS_TICK}
        tickLine={false}
        axisLine={false}
        width={Y_AXIS_WIDTH}
        tickCount={5}
      />
      <Tooltip
        cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
        isAnimationActive={false}
        content={({ active, activeIndex }) => {
          const point = active && activeIndex !== null && activeIndex !== undefined ? points[Number(activeIndex)] : undefined;
          if (!point) return null;
          const rows: TooltipRow[] = [
            { label: "Revenue", value: wholeMoney(point.revenueMinor), color: CHART_COLORS.primary, mark: "line" },
          ];
          if (point.previousRevenueMinor !== null) {
            rows.push({
              label: "Previous period",
              value: wholeMoney(point.previousRevenueMinor),
              color: CHART_COLORS.neutral,
              mark: "dashed",
              detail: point.previousLabel ?? undefined,
            });
          }
          return <ChartTooltipCard title={point.label} rows={rows} />;
        }}
      />
      {hasComparison ? (
        <Line
          dataKey="previousRevenueMinor"
          name="Previous period"
          type="monotone"
          stroke={CHART_COLORS.neutral}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={single ? { r: 4, fill: CHART_COLORS.neutral, stroke: "var(--surface)", strokeWidth: 2, strokeDasharray: "" } : false}
          activeDot={false}
          isAnimationActive={!reducedMotion}
          animationDuration={500}
        />
      ) : null}
      <Area
        dataKey="revenueMinor"
        name="Revenue"
        type="monotone"
        stroke={CHART_COLORS.primary}
        strokeWidth={2}
        fill={`url(#${gradientId})`}
        dot={single ? { r: 5, fill: CHART_COLORS.primary, stroke: "var(--surface)", strokeWidth: 2 } : false}
        activeDot={{ r: 5, fill: CHART_COLORS.primary, stroke: "var(--surface)", strokeWidth: 2 }}
        isAnimationActive={!reducedMotion}
        animationDuration={500}
      />
      {peak && points.length > 1 ? (
        <ReferenceDot
          x={peak.date}
          y={peak.revenueMinor}
          r={5}
          fill={CHART_COLORS.highlight}
          stroke="var(--surface)"
          strokeWidth={2}
          label={{
            value: `Peak ${compactMoney(peak.revenueMinor)}`,
            position: peakLabelPosition,
            offset: 10,
            fill: "var(--ink)",
            fontSize: 12,
            fontWeight: 500,
          }}
        />
      ) : null}
    </ComposedChart>
  );
}
