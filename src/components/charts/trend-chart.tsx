"use client";

import { useId } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/lib/chart-series";
import { formatCompactMetric, formatMetricValue } from "@/lib/formatters";
import type { MetricFormat } from "@/types/domain";
import { AXIS_TICK, CHART_COLORS, CHART_MARGIN, Y_AXIS_WIDTH } from "./chart-theme";
import { ChartTooltipCard, type TooltipRow } from "./chart-tooltip";
import { useReducedMotion } from "./use-reduced-motion";

interface TrendChartProps {
  points: readonly TrendPoint[];
  format: MetricFormat;
  /** Series name in the tooltip: "Revenue", "Conversion rate". */
  seriesLabel: string;
  /** Name of the dashed series: "Previous period" or "Same period last year". */
  comparisonName: string;
  /** Totals fill down to the axis; rates are a plain line, since the area under a rate means nothing. */
  variant: "area" | "line";
  /** The point to mark in gold, chosen on the server so the chart and its summary agree. */
  peakDate: string | null;
  /** Accessible name for the drawing; the panel's summary describes it. */
  label: string;
}

/**
 * One metric over time: the period as an area or line, the comparison period
 * as a dashed line, and the strongest point marked in gold.
 */
export function TrendChart({ points, format, seriesLabel, comparisonName, variant, peakDate, label }: TrendChartProps) {
  const gradientId = `${useId()}-trend`;
  const reducedMotion = useReducedMotion();
  const data = [...points];
  const axisLabels = new Map(points.map((point) => [point.date, point.axisLabel]));
  const hasComparison = points.some((point) => point.previousValue !== null);
  const compact = (value: number) => formatCompactMetric(value, format);
  const full = (value: number | null) => formatMetricValue(value, format);

  const peakIndex = points.findIndex((point) => point.date === peakDate);
  const peak = points[peakIndex];
  // Keep the peak's label inside the plot when the peak sits near either edge.
  const peakLabelPosition =
    peakIndex >= points.length * 0.85 ? "left" : peakIndex <= points.length * 0.15 ? "right" : "top";
  // A single bucket has no line to draw, so each series shows as a dot instead.
  const single = points.length === 1;
  const seriesProps = {
    dataKey: "value",
    name: seriesLabel,
    type: "monotone" as const,
    stroke: CHART_COLORS.primary,
    strokeWidth: 2,
    dot: single ? { r: 5, fill: CHART_COLORS.primary, stroke: "var(--surface)", strokeWidth: 2 } : false,
    activeDot: { r: 5, fill: CHART_COLORS.primary, stroke: "var(--surface)", strokeWidth: 2 },
    isAnimationActive: !reducedMotion,
    animationDuration: 500,
  };

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
        tickFormatter={compact}
        tick={AXIS_TICK}
        tickLine={false}
        axisLine={false}
        width={Y_AXIS_WIDTH}
        tickCount={5}
        allowDecimals={format !== "integer"}
      />
      <Tooltip
        cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
        isAnimationActive={false}
        content={({ active, activeIndex }) => {
          const point = active && activeIndex !== null && activeIndex !== undefined ? points[Number(activeIndex)] : undefined;
          if (!point) return null;
          const rows: TooltipRow[] = [{ label: seriesLabel, value: full(point.value), color: CHART_COLORS.primary, mark: "line" }];
          if (point.previousLabel !== null) {
            rows.push({
              label: comparisonName,
              value: full(point.previousValue),
              color: CHART_COLORS.neutral,
              mark: "dashed",
              detail: point.previousLabel,
            });
          }
          return <ChartTooltipCard title={point.label} rows={rows} />;
        }}
      />
      {hasComparison ? (
        <Line
          dataKey="previousValue"
          name={comparisonName}
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
      {variant === "area" ? <Area {...seriesProps} fill={`url(#${gradientId})`} /> : <Line {...seriesProps} />}
      {peak && peak.value !== null ? (
        <ReferenceDot
          x={peak.date}
          y={peak.value}
          r={5}
          fill={CHART_COLORS.highlight}
          stroke="var(--surface)"
          strokeWidth={2}
          label={{
            value: `Peak ${compact(peak.value)}`,
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
