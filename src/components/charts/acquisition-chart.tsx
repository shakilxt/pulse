"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { AcquisitionTrendPoint } from "@/lib/chart-series";
import { formatCompactNumber, formatInteger, formatPercent } from "@/lib/formatters";
import { AXIS_TICK, BAR_RADIUS, CHART_COLORS, CHART_MARGIN, MAX_BAR_SIZE } from "./chart-theme";
import { ChartTooltipCard } from "./chart-tooltip";
import { useReducedMotion } from "./use-reduced-motion";

interface AcquisitionChartProps {
  points: readonly AcquisitionTrendPoint[];
  label: string;
}

/** New customers per day, week or month. The hovered column lifts to the highlight colour. */
export function AcquisitionChart({ points, label }: AcquisitionChartProps) {
  const reducedMotion = useReducedMotion();
  const axisLabels = new Map(points.map((point) => [point.date, point.axisLabel]));

  return (
    <BarChart responsive data={[...points]} margin={CHART_MARGIN} title={label} style={{ width: "100%", height: "100%" }}>
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
        tickFormatter={formatCompactNumber}
        tick={AXIS_TICK}
        tickLine={false}
        axisLine={false}
        width={36}
        allowDecimals={false}
        tickCount={4}
      />
      <Tooltip
        cursor={{ fill: "var(--surface-sunken)" }}
        isAnimationActive={false}
        content={({ active, activeIndex }) => {
          const point = active && activeIndex !== null && activeIndex !== undefined ? points[Number(activeIndex)] : undefined;
          if (!point) return null;
          return (
            <ChartTooltipCard
              title={point.label}
              rows={[
                { label: "New customers", value: formatInteger(point.newCustomers), color: CHART_COLORS.primary, mark: "bar" },
                { label: "Visitors", value: formatInteger(point.visitors) },
                {
                  label: "Conversion rate",
                  value: point.conversionRate === null ? "—" : formatPercent(point.conversionRate, 2),
                },
              ]}
            />
          );
        }}
      />
      <Bar
        dataKey="newCustomers"
        name="New customers"
        fill={CHART_COLORS.primary}
        activeBar={{ fill: CHART_COLORS.highlight }}
        radius={BAR_RADIUS}
        maxBarSize={MAX_BAR_SIZE}
        isAnimationActive={!reducedMotion}
        animationDuration={450}
      />
    </BarChart>
  );
}
