import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PlannedView } from "@/components/layout/planned-view";

export const metadata: Metadata = {
  title: "Products",
};

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Products"
        description="Revenue, units and conversion for each demo product and service."
      />
      <PlannedView
        phase={7}
        items={[
          "Product and service list",
          "Category, revenue and units sold",
          "Conversion indicator",
          "Search and sorting",
          "Top performers",
          "Performance comparison chart",
        ]}
      />
    </>
  );
}
