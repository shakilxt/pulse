import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PlannedView } from "@/components/layout/planned-view";

export const metadata: Metadata = {
  title: "Customers",
};

export default function CustomersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Customers"
        description="Every fictional customer in the workspace, with spend and order history."
      />
      <PlannedView
        phase={6}
        items={[
          "Searchable customer table",
          "Status filters",
          "Sorting by spend, orders and join date",
          "Pagination",
          "Customer detail drawer",
        ]}
      />
    </>
  );
}
