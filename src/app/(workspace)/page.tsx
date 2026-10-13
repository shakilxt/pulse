import type { Metadata } from "next";
import { Suspense } from "react";
import { AcquisitionPanel } from "@/components/dashboard/acquisition-panel";
import { CashflowPanel } from "@/components/dashboard/cashflow-panel";
import { GreetingPanel } from "@/components/dashboard/greeting-panel";
import { MetricStrip } from "@/components/dashboard/metric-strip";
import { OverviewSkeleton } from "@/components/dashboard/overview-skeleton";
import { PeriodPanel } from "@/components/dashboard/period-panel";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { RevenueBreakdown } from "@/components/dashboard/revenue-breakdown";
import { RevenuePanel } from "@/components/dashboard/revenue-panel";
import { TopProducts } from "@/components/dashboard/top-products";
import { Skeleton } from "@/components/ui/skeleton";
import { getDataset } from "@/data";
import type { DateRange, RangePreset } from "@/lib/dates";
import { formatDate } from "@/lib/formatters";
import { type Overview, buildOverview, salutationFor } from "@/lib/overview";
import { type DateRangeState, type SearchParamsRecord, parseDateRangeParams } from "@/lib/search-params";
import { WORKSPACE } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Overview",
};

const DEFAULT_PRESET: RangePreset = "30d";

interface OverviewData {
  state: DateRangeState;
  overview: Overview;
}

async function loadOverview(searchParams: Promise<SearchParamsRecord>): Promise<OverviewData> {
  const params = await searchParams;
  const dataset = getDataset();
  const state = parseDateRangeParams(params, { bounds: dataset.span, defaultPreset: DEFAULT_PRESET });
  return { state, overview: buildOverview(dataset, state, WORKSPACE.name) };
}

/**
 * The greeting frame is part of the static shell; everything that depends on
 * the date range in the URL streams in behind skeletons that match its layout.
 */
export default function OverviewPage({ searchParams }: PageProps<"/">) {
  const dataset = getDataset();
  const data = loadOverview(searchParams);

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <GreetingPanel
        salutation={salutationFor(dataset.now)}
        firstName={WORKSPACE.profile.firstName}
        eyebrow={`${formatDate(dataset.span.to, "long")} · ${WORKSPACE.environmentLabel}`}
        summary={
          <Suspense
            fallback={
              <span className="block space-y-2" aria-hidden>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </span>
            }
          >
            <GreetingSummary data={data} />
          </Suspense>
        }
      />
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent data={data} bounds={dataset.span} />
      </Suspense>
    </div>
  );
}

async function GreetingSummary({ data }: { data: Promise<OverviewData> }) {
  const { overview } = await data;
  return (
    <p data-pending-region="" aria-live="polite">
      {overview.greeting.summary}
    </p>
  );
}

async function OverviewContent({ data, bounds }: { data: Promise<OverviewData>; bounds: DateRange }) {
  const { state, overview } = await data;
  return (
    <>
      <PeriodPanel
        state={state}
        bounds={bounds}
        defaultPreset={DEFAULT_PRESET}
        comparisonRange={overview.comparison.summary ? overview.comparison.range : null}
      />
      <MetricStrip metrics={overview.metrics} />
      <RevenuePanel overview={overview} />
      <RevenueBreakdown categories={overview.categories} totalMinor={overview.current.revenueMinor} />
      <CashflowPanel
        {...overview.cashflow}
        revenueMinor={overview.current.revenueMinor}
        profitMinor={overview.current.profitMinor}
        className="lg:col-span-7"
      />
      <AcquisitionPanel overview={overview} />
      <RecentTransactions rows={overview.recentTransactions} />
      <TopProducts products={overview.topProducts} />
    </>
  );
}
