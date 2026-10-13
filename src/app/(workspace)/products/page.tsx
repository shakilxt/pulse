import type { Metadata } from "next";
import { Suspense } from "react";
import { PeriodToolbar } from "@/components/filters/period-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { ProductComparison } from "@/components/products/product-comparison";
import { ProductLeaders } from "@/components/products/product-leaders";
import { ProductTable, ProductToolbar } from "@/components/products/product-table";
import { ProductsSkeleton } from "@/components/products/products-skeleton";
import { getDataset } from "@/data";
import type { DateRange, RangePreset } from "@/lib/dates";
import { PRODUCTS_DEFAULT_PRESET, type ProductPerformanceView, buildProductPerformance, parseProductQuery } from "@/lib/products";
import { type SearchParamsRecord, toUrlSearchParams } from "@/lib/search-params";
import { resolveDefaultPeriod } from "@/lib/settings";
import { getSettings } from "@/lib/settings.server";

export const metadata: Metadata = {
  title: "Products",
};

interface ProductsData {
  view: ProductPerformanceView;
  defaultPreset: RangePreset;
  search: string;
}

async function loadProducts(searchParams: Promise<SearchParamsRecord>): Promise<ProductsData> {
  const [params, settings] = await Promise.all([searchParams, getSettings()]);
  const dataset = getDataset();
  const defaultPreset = resolveDefaultPeriod(settings, PRODUCTS_DEFAULT_PRESET);
  const query = parseProductQuery(params, { bounds: dataset.span, defaultPreset });
  return {
    view: buildProductPerformance(dataset, query, settings.currency),
    defaultPreset,
    search: toUrlSearchParams(params).toString(),
  };
}

/**
 * The heading is static; the period, leaders, chart and table depend on the
 * URL (`range`/`from`/`to`, `compare`, `q`, `sort`, `metric`) and stream in.
 */
export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  const dataset = getDataset();
  const data = loadProducts(searchParams);
  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Products"
        description="Revenue, units and conversion for each demo product and service. Illustrative catalogue, not live inventory."
      />
      <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-12">
        <Suspense fallback={<ProductsSkeleton />}>
          <ProductsContent data={data} bounds={dataset.span} />
        </Suspense>
      </div>
    </>
  );
}

async function ProductsContent({ data, bounds }: { data: Promise<ProductsData>; bounds: DateRange }) {
  const { view, defaultPreset, search } = await data;
  return (
    <>
      <PeriodToolbar
        label="Product period"
        state={view.query.dates}
        bounds={bounds}
        defaultPreset={defaultPreset}
        comparisonRange={view.comparison.summary ? view.comparison.range : null}
      />
      <ProductLeaders leaders={view.leaders} />
      <ProductToolbar view={view} search={search} />
      <ProductComparison view={view} />
      <ProductTable view={view} search={search} />
    </>
  );
}
