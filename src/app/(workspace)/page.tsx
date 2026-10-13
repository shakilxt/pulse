import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PlannedView } from "@/components/layout/planned-view";

export const metadata: Metadata = {
  title: "Overview",
};

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        eyebrow="Fernhill Studio"
        title="Overview"
        description="A calm read on revenue, customers and orders across the demo workspace."
      />
      <PlannedView
        phase={4}
        items={[
          "Editorial greeting with landscape panel",
          "Date-range selector",
          "Four KPI summaries with comparisons",
          "Revenue growth chart",
          "Revenue breakdown",
          "Revenue versus expenses",
          "Customer acquisition trend",
          "Recent transactions",
          "Top-performing products",
        ]}
      />
    </>
  );
}
