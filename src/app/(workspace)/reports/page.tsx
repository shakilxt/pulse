import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PlannedView } from "@/components/layout/planned-view";

export const metadata: Metadata = {
  title: "Reports",
};

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Reports"
        description="Period summaries prepared from the demo ledger, ready to download as CSV."
      />
      <PlannedView
        phase={7}
        items={[
          "Revenue summary",
          "Customer summary",
          "Performance metrics",
          "Period selection",
          "Report preview",
          "Local CSV export",
        ]}
      />
    </>
  );
}
