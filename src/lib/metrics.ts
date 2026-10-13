/**
 * Metric definitions: one place that says what each KPI means, how it is
 * formatted, whether up is good, and how its change is measured. Labels and
 * descriptions here are what the interface shows in KPI tooltips.
 */

import type { DashboardMetric, MetricFormat } from "@/types/domain";
import type { PeriodSummary } from "./aggregations";
import { type Change, percentChange, pointChange } from "./calculations";
import { type ComparisonMode, type DateRange, type RangePreset, rangeLength } from "./dates";

export type MetricPolarity = "higher-is-better" | "lower-is-better";

interface MetricDefinition {
  label: string;
  format: MetricFormat;
  polarity: MetricPolarity;
  description: string;
  value: (summary: PeriodSummary) => number | null;
}

export const METRIC_DEFINITIONS = {
  revenue: {
    label: "Total revenue",
    format: "currency",
    polarity: "higher-is-better",
    description: "Completed orders. Refunded, failed and pending charges are excluded.",
    value: (summary) => summary.revenueMinor,
  },
  orders: {
    label: "Total orders",
    format: "integer",
    polarity: "higher-is-better",
    description: "Number of completed orders.",
    value: (summary) => summary.orders,
  },
  activeCustomers: {
    label: "Active customers",
    format: "integer",
    polarity: "higher-is-better",
    description: "Distinct customers with at least one completed order in the period.",
    value: (summary) => summary.activeCustomers,
  },
  conversionRate: {
    label: "Conversion rate",
    format: "percentage",
    polarity: "higher-is-better",
    description: "New customers as a share of visitors. Changes are shown in percentage points.",
    value: (summary) => summary.conversionRate,
  },
  newCustomers: {
    label: "New customers",
    format: "integer",
    polarity: "higher-is-better",
    description: "Customers whose first purchase falls in the period.",
    value: (summary) => summary.newCustomers,
  },
  visitors: {
    label: "Visitors",
    format: "integer",
    polarity: "higher-is-better",
    description: "Website visitors across all acquisition channels.",
    value: (summary) => summary.visitors,
  },
  averageOrderValue: {
    label: "Average order value",
    format: "currency",
    polarity: "higher-is-better",
    description: "Revenue divided by completed orders.",
    value: (summary) => summary.averageOrderValueMinor,
  },
  refunds: {
    label: "Refunds",
    format: "currency",
    polarity: "lower-is-better",
    description: "Value of orders refunded, by original order date.",
    value: (summary) => summary.refundsMinor,
  },
  expenses: {
    label: "Expenses",
    format: "currency",
    polarity: "lower-is-better",
    description: "Operating costs, payment processing fees, ad spend and service delivery.",
    value: (summary) => summary.expensesMinor,
  },
  profit: {
    label: "Net profit",
    format: "currency",
    polarity: "higher-is-better",
    description: "Revenue minus expenses.",
    value: (summary) => summary.profitMinor,
  },
} satisfies Record<string, MetricDefinition>;

export type MetricId = keyof typeof METRIC_DEFINITIONS;

/** The four headline KPIs on the overview, in display order. */
export const OVERVIEW_METRICS = ["revenue", "orders", "activeCustomers", "conversionRate"] as const satisfies readonly MetricId[];

export function getMetricDefinition(id: MetricId): MetricDefinition {
  return METRIC_DEFINITIONS[id];
}

export function buildMetric(
  id: MetricId,
  current: PeriodSummary,
  previous: PeriodSummary | null,
  comparisonLabel: string,
): DashboardMetric {
  const definition = getMetricDefinition(id);
  return {
    id,
    label: definition.label,
    value: definition.value(current),
    previousValue: previous ? definition.value(previous) : null,
    format: definition.format,
    comparisonLabel,
  };
}

/** Ratios change in percentage points; everything else changes relatively. */
export function metricChange(metric: DashboardMetric): Change {
  if (metric.format === "percentage") return pointChange(metric.value, metric.previousValue);
  if (metric.value === null) return { kind: "unavailable" };
  return percentChange(metric.value, metric.previousValue);
}

export type ChangeSentiment = "positive" | "negative" | "neutral";

/** Whether a change is good news, given which direction the metric should move. */
export function changeSentiment(change: Change, polarity: MetricPolarity): ChangeSentiment {
  if (change.kind === "unavailable") return "neutral";
  if (change.kind === "new") return polarity === "higher-is-better" ? "positive" : "negative";
  if (change.value === 0) return "neutral";
  const up = change.value > 0;
  return up === (polarity === "higher-is-better") ? "positive" : "negative";
}

const PRESET_COMPARISON_LABELS: Partial<Record<RangePreset, string>> = {
  "7d": "vs previous 7 days",
  "30d": "vs previous 30 days",
  "90d": "vs previous 90 days",
  "12m": "vs previous 12 months",
};

/** The phrase shown under each KPI, matching the comparison range actually used. */
export function describeComparison(
  preset: RangePreset | "custom",
  range: DateRange,
  mode: ComparisonMode,
): string {
  if (mode === "previous-year") return "vs same period last year";
  const presetLabel = preset === "custom" ? undefined : PRESET_COMPARISON_LABELS[preset];
  if (presetLabel) return presetLabel;
  const days = rangeLength(range);
  return days === 1 ? "vs previous day" : `vs previous ${days} days`;
}
