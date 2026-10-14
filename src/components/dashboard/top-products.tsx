import { PackageOpen } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatInteger, formatMetricValue, formatPercent } from "@/lib/formatters";
import type { CurrencyCode } from "@/lib/money";
import type { TopProduct } from "@/lib/overview";
import { Panel, PanelLink } from "./panel";
import { ShareBar } from "./share-bar";

/** The best-selling products of the period, ranked by revenue. */
export function TopProducts({ products, currency }: { products: readonly TopProduct[]; currency: CurrencyCode }) {
  return (
    <Panel
      id="top-products"
      title="Top products"
      description="Ranked by revenue in this period"
      className="lg:col-span-4"
      action={
        <PanelLink href="/products" label="View all products">
          All
        </PanelLink>
      }
    >
      {products.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No sales in this period"
          description="Choose a longer date range to see which products sell best."
          className="flex-1 py-8"
        />
      ) : (
        <ol className="mt-4 divide-y divide-line">
          {products.map((product, index) => (
            <li key={product.id} className="flex gap-3 py-3 first:pt-1 last:pb-0">
              <span aria-hidden className="w-5 shrink-0 text-sm leading-5 font-semibold text-gold-ink tabular">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium text-ink">{product.name}</p>
                  <p className="text-sm font-semibold text-ink tabular">{formatMetricValue(product.revenueMinor, "currency", currency)}</p>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-3 text-xs text-ink-muted tabular">
                  <span>
                    {product.category} · {product.unitsSold === 1 ? "1 unit" : `${formatInteger(product.unitsSold)} units`}
                  </span>
                  <span>{formatPercent(product.share)} of revenue</span>
                </div>
                <ShareBar fraction={product.share} size="sm" className="mt-2" />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
