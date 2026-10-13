import type { Metadata } from "next";
import { Suspense } from "react";
import { AnalyticsSkeleton } from "@/components/analytics/analytics-skeleton";
import { ChannelBreakdown } from "@/components/analytics/channel-breakdown";
import { PeriodComparison } from "@/components/analytics/period-comparison";
import { TransactionVolume } from "@/components/analytics/transaction-volume";
import { TrendExplorer } from "@/components/analytics/trend-explorer";
import { CashflowPanel } from "@/components/dashboard/cashflow-panel";
import { PeriodToolbar } from "@/components/filters/period-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { getDataset } from "@/data";
import { ANALYTICS_DEFAULT_PRESET, type Analytics, buildAnalytics, parseTrendMetric } from "@/lib/analytics";
import type { DateRange, RangePreset } from "@/lib/dates";
import { type DateRangeState, PARAM, type SearchParamsRecord, parseDateRangeParams } from "@/lib/search-params";
import { resolveDefaultPeriod } from "@/lib/settings";
import { getSettings } from "@/lib/settings.server";

export const metadata: Metadata = {
  title: "Analytics",
};

interface AnalyticsData {
  state: DateRangeState;
  defaultPreset: RangePreset;
  analytics: Analytics;
}

async function loadAnalytics(searchParams: Promise<SearchParamsRecord>): Promise<AnalyticsData> {
  const [params, settings] = await Promise.all([searchParams, getSettings()]);
  const dataset = getDataset();
  const defaultPreset = resolveDefaultPeriod(settings, ANALYTICS_DEFAULT_PRESET);
  const state = parseDateRangeParams(params, { bounds: dataset.span, defaultPreset });
  const metric = parseTrendMetric(params[PARAM.metric]);
  return { state, defaultPreset, analytics: buildAnalytics(dataset, state, metric, settings.currency) };
}

/**
 * The heading is part of the static shell; the controls and every figure
 * depend on the URL (`range`/`from`/`to`, `compare`, `metric`) and stream in
 * behind skeletons that match their layout.
 */
export default function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  const dataset = getDataset();
  const data = loadAnalytics(searchParams);

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Revenue, orders and customer acquisition over time, set against a comparison period of your choice."
      />
      <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-12">
        <Suspense fallback={<AnalyticsSkeleton />}>
          <AnalyticsContent data={data} bounds={dataset.span} />
        </Suspense>
      </div>
    </>
  );
}

async function AnalyticsContent({ data, bounds }: { data: Promise<AnalyticsData>; bounds: DateRange }) {
  const { state, defaultPreset, analytics } = await data;
  const { currency } = analytics;
  const comparisonRange = analytics.comparison.summary ? analytics.comparison.range : null;
  return (
    <>
      <PeriodToolbar
        state={state}
        bounds={bounds}
        defaultPreset={defaultPreset}
        comparisonRange={comparisonRange}
      />
      <TrendExplorer analytics={analytics} />
      <CashflowPanel
        {...analytics.cashflow}
        revenueMinor={analytics.current.revenueMinor}
        profitMinor={analytics.current.profitMinor}
        currency={currency}
        className="lg:col-span-7"
      />
      <PeriodComparison
        metrics={analytics.comparisonTable}
        range={analytics.range}
        comparisonRange={comparisonRange}
        comparisonLabel={analytics.comparisonLabel}
        currency={currency}
        className="lg:col-span-5"
      />
      <ChannelBreakdown
        rows={analytics.channels.rows}
        summary={analytics.channels.summary}
        comparisonLabel={analytics.comparisonLabel}
        hasComparison={comparisonRange !== null}
        className="lg:col-span-7"
      />
      <TransactionVolume
        rows={analytics.volume.rows}
        total={analytics.volume.total}
        summary={analytics.volume.summary}
        currency={currency}
        className="lg:col-span-5"
      />
    </>
  );
}
