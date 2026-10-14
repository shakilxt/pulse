import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { RecordsSkeleton } from "@/components/records/records-view";
import { TransactionTable } from "@/components/records/transaction-table";
import { getDataset } from "@/data";
import type { CurrencyCode } from "@/lib/money";
import { type SearchParamsRecord, toUrlSearchParams } from "@/lib/search-params";
import { getSettings } from "@/lib/settings.server";
import { type TransactionList, listTransactions, parseTransactionQuery } from "@/lib/transactions";

export const metadata: Metadata = {
  title: "Transactions",
};

interface TransactionsData {
  list: TransactionList;
  search: string;
  currency: CurrencyCode;
}

async function loadTransactions(searchParams: Promise<SearchParamsRecord>): Promise<TransactionsData> {
  const [params, settings] = await Promise.all([searchParams, getSettings()]);
  const dataset = getDataset();
  return {
    currency: settings.currency,
    list: listTransactions(dataset, parseTransactionQuery(params, dataset)),
    search: toUrlSearchParams(params).toString(),
  };
}

/** The heading is static; filters, rows and pagination depend on the URL and stream in. */
export default function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const data = loadTransactions(searchParams);
  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Transactions"
        description="Every charge in the fictional ledger, with search, status and date filters. No payment provider is connected."
      />
      <Suspense fallback={<RecordsSkeleton label="Transactions" filters={2} />}>
        <TransactionsContent data={data} />
      </Suspense>
    </>
  );
}

async function TransactionsContent({ data }: { data: Promise<TransactionsData> }) {
  const { list, search, currency } = await data;
  return <TransactionTable list={list} search={search} bounds={getDataset().span} currency={currency} />;
}
