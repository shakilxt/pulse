import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PlannedView } from "@/components/layout/planned-view";

export const metadata: Metadata = {
  title: "Analytics",
};

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Trends, comparison periods and acquisition sources for the selected range."
      />
      <PlannedView
        phase={5}
        items={[
          "Revenue, orders, customer and conversion trends",
          "Chart metric selector",
          "Comparison periods",
          "Date-range filters",
          "Summary statistics",
          "Revenue and expense comparison",
          "Acquisition-source breakdown",
          "Useful empty states",
        ]}
      />
    </>
  );
}
