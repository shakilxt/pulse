import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CustomerTable } from "@/components/records/customer-table";
import { RecordsSkeleton } from "@/components/records/records-view";
import { getDataset } from "@/data";
import { type CustomerList, listCustomers, parseCustomerQuery } from "@/lib/customers";
import type { CurrencyCode } from "@/lib/money";
import { type SearchParamsRecord, toUrlSearchParams } from "@/lib/search-params";
import { getSettings } from "@/lib/settings.server";

export const metadata: Metadata = {
  title: "Customers",
};

interface CustomersData {
  list: CustomerList;
  search: string;
  currency: CurrencyCode;
}

async function loadCustomers(searchParams: Promise<SearchParamsRecord>): Promise<CustomersData> {
  const [params, settings] = await Promise.all([searchParams, getSettings()]);
  return {
    currency: settings.currency,
    list: listCustomers(getDataset(), parseCustomerQuery(params)),
    search: toUrlSearchParams(params).toString(),
  };
}

/** The heading is static; filters, rows and pagination depend on the URL and stream in. */
export default function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const data = loadCustomers(searchParams);
  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Customers"
        description="Every fictional customer in the workspace, with lifetime spend and order history."
      />
      <Suspense fallback={<RecordsSkeleton label="Customers" filters={1} />}>
        <CustomersContent data={data} />
      </Suspense>
    </>
  );
}

async function CustomersContent({ data }: { data: Promise<CustomersData> }) {
  const { list, search, currency } = await data;
  return <CustomerTable list={list} search={search} currency={currency} />;
}
