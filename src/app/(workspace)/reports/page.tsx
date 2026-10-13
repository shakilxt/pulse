import type { Metadata } from "next";
import { Suspense } from "react";
import { PeriodToolbar } from "@/components/filters/period-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { ReportExports } from "@/components/reports/report-exports";
import { ReportPreview } from "@/components/reports/report-preview";
import { ReportsSkeleton } from "@/components/reports/reports-skeleton";
import { getDataset } from "@/data";
import type { DateRange, RangePreset } from "@/lib/dates";
import { REPORTS_DEFAULT_PRESET, type Report, buildReport, reportCsvRows } from "@/lib/reports";
import { type DateRangeState, type SearchParamsRecord, parseDateRangeParams } from "@/lib/search-params";
import { resolveDefaultPeriod } from "@/lib/settings";
import { getSettings } from "@/lib/settings.server";

export const metadata: Metadata = {
  title: "Reports",
};

interface ReportsData {
  state: DateRangeState;
  defaultPreset: RangePreset;
  report: Report;
}

async function loadReport(searchParams: Promise<SearchParamsRecord>): Promise<ReportsData> {
  const [params, settings] = await Promise.all([searchParams, getSettings()]);
  const dataset = getDataset();
  const defaultPreset = resolveDefaultPeriod(settings, REPORTS_DEFAULT_PRESET);
  const state = parseDateRangeParams(params, { bounds: dataset.span, defaultPreset });
  const report = buildReport(dataset, state, { workspaceName: settings.workspaceName, currency: settings.currency });
  return { state, defaultPreset, report };
}

/** The heading is static; the period, preview and export files depend on the URL and stream in. */
export default function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const dataset = getDataset();
  const data = loadReport(searchParams);
  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Reports"
        description="A period summary of revenue, customers and product performance, with CSV files generated locally from the demo data."
      />
      <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-12">
        <Suspense fallback={<ReportsSkeleton />}>
          <ReportsContent data={data} bounds={dataset.span} />
        </Suspense>
      </div>
    </>
  );
}

async function ReportsContent({ data, bounds }: { data: Promise<ReportsData>; bounds: DateRange }) {
  const { state, defaultPreset, report } = await data;
  const files = report.tables.map((table) => ({
    id: table.id,
    title: table.title,
    description: table.description,
    fileName: table.fileName,
    ...reportCsvRows(table),
  }));
  return (
    <>
      <PeriodToolbar
        state={state}
        bounds={bounds}
        defaultPreset={defaultPreset}
        comparisonRange={report.comparison.summary ? report.comparison.range : null}
      />
      <ReportExports files={files} currency={report.currency} />
      <ReportPreview report={report} />
    </>
  );
}
