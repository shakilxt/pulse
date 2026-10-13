import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PlannedView } from "@/components/layout/planned-view";

export const metadata: Metadata = {
  title: "Transactions",
};

export default function TransactionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Transactions"
        description="Illustrative order history. No payment provider is connected."
      />
      <PlannedView
        phase={6}
        items={[
          "Search by ID or customer",
          "Status and date filters",
          "Sorting and pagination",
          "Status badges",
          "Transaction detail drawer",
        ]}
      />
    </>
  );
}
