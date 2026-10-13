import { CashflowChart } from "@/components/charts/cashflow-chart";
import { ChartFrame } from "@/components/charts/chart-frame";
import { CASHFLOW_SERIES } from "@/components/charts/chart-theme";
import { ChartLegend } from "@/components/charts/series-key";
import { safeRatio } from "@/lib/calculations";
import { bucketNoun } from "@/lib/chart-series";
import { formatMetricValue, formatPercent } from "@/lib/formatters";
import type { Overview } from "@/lib/overview";

export function CashflowPanel({ overview }: { overview: Overview }) {
  const { points, granularity, summary } = overview.cashflow;
  const { profitMinor, revenueMinor } = overview.current;
  const margin = safeRatio(profitMinor, revenueMinor);

  return (
    <ChartFrame
      id="cashflow"
      title="Revenue vs expenses"
      description={`Per ${bucketNoun(granularity)}, on one money scale`}
      className="lg:col-span-7"
      aside={
        <div className="text-right">
          <p className="text-xs text-ink-muted">{profitMinor >= 0 ? "Net profit" : "Net loss"}</p>
          <p className="text-xl font-semibold text-ink tabular">{formatMetricValue(Math.abs(profitMinor), "currency")}</p>
          {margin !== null ? <p className="text-xs text-ink-muted tabular">{formatPercent(margin)} margin</p> : null}
        </div>
      }
      legend={
        <ChartLegend
          items={[
            { label: CASHFLOW_SERIES.revenue.label, color: CASHFLOW_SERIES.revenue.color, mark: "bar" },
            { label: CASHFLOW_SERIES.expenses.label, color: CASHFLOW_SERIES.expenses.color, mark: "bar" },
          ]}
        />
      }
      summary={summary}
      plotClassName="h-60 sm:h-72 lg:h-auto lg:min-h-72 lg:flex-1"
      table={{
        caption: `Revenue and expenses per ${bucketNoun(granularity)}`,
        columns: [
          { label: "Period" },
          { label: "Revenue", align: "end" },
          { label: "Expenses", align: "end" },
          { label: "Net", align: "end" },
        ],
        rows: points.map((point) => ({
          key: point.date,
          cells: [
            point.label,
            formatMetricValue(point.revenueMinor, "currency"),
            formatMetricValue(point.expensesMinor, "currency"),
            formatMetricValue(point.profitMinor, "currency"),
          ],
        })),
      }}
    >
      <CashflowChart points={points} label="Revenue and expenses chart" />
    </ChartFrame>
  );
}
