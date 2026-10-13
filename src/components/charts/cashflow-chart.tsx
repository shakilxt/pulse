"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { CashflowPoint } from "@/lib/chart-series";
import { formatMoney } from "@/lib/formatters";
import { AXIS_TICK, BAR_RADIUS, CASHFLOW_SERIES, CHART_COLORS, CHART_MARGIN, MAX_BAR_SIZE, Y_AXIS_WIDTH } from "./chart-theme";
import { ChartTooltipCard } from "./chart-tooltip";
import { useReducedMotion } from "./use-reduced-motion";

interface CashflowChartProps {
  points: readonly CashflowPoint[];
  label: string;
}

const compactMoney = (value: number) => formatMoney(value, { compact: true });
const wholeMoney = (value: number) => formatMoney(value, { whole: true });

/** Revenue and expenses side by side on one money axis, with net profit in the readout. */
export function CashflowChart({ points, label }: CashflowChartProps) {
  const reducedMotion = useReducedMotion();
  const axisLabels = new Map(points.map((point) => [point.date, point.axisLabel]));

  return (
    <BarChart
      responsive
      data={[...points]}
      margin={CHART_MARGIN}
      barGap={2}
      barCategoryGap="20%"
      title={label}
      style={{ width: "100%", height: "100%" }}
    >
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
      <YAxis tickFormatter={compactMoney} tick={AXIS_TICK} tickLine={false} axisLine={false} width={Y_AXIS_WIDTH} tickCount={5} />
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
                { label: CASHFLOW_SERIES.revenue.label, value: wholeMoney(point.revenueMinor), color: CASHFLOW_SERIES.revenue.color, mark: "bar" },
                { label: CASHFLOW_SERIES.expenses.label, value: wholeMoney(point.expensesMinor), color: CASHFLOW_SERIES.expenses.color, mark: "bar" },
              ]}
              footer={
                <span className="flex justify-between gap-4">
                  <span>{point.profitMinor >= 0 ? "Net profit" : "Net loss"}</span>
                  <span className="font-semibold text-ink tabular">{wholeMoney(Math.abs(point.profitMinor))}</span>
                </span>
              }
            />
          );
        }}
      />
      <Bar
        dataKey="revenueMinor"
        name={CASHFLOW_SERIES.revenue.label}
        fill={CASHFLOW_SERIES.revenue.color}
        radius={BAR_RADIUS}
        maxBarSize={MAX_BAR_SIZE}
        isAnimationActive={!reducedMotion}
        animationDuration={450}
      />
      <Bar
        dataKey="expensesMinor"
        name={CASHFLOW_SERIES.expenses.label}
        fill={CASHFLOW_SERIES.expenses.color}
        radius={BAR_RADIUS}
        maxBarSize={MAX_BAR_SIZE}
        isAnimationActive={!reducedMotion}
        animationDuration={450}
      />
    </BarChart>
  );
}
