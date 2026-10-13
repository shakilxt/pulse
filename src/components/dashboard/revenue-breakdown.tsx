import { PieChart } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatInteger, formatMetricValue } from "@/lib/formatters";
import type { CurrencyCode } from "@/lib/money";
import type { CategoryShare } from "@/lib/overview";
import { Panel } from "./panel";
import { ShareBar } from "./share-bar";

/** Revenue by product category, as shares that add up to 100%. */
interface RevenueBreakdownProps {
  categories: readonly CategoryShare[];
  totalMinor: number;
  currency: CurrencyCode;
}

export function RevenueBreakdown({ categories, totalMinor, currency }: RevenueBreakdownProps) {
  const leader = categories.reduce<CategoryShare | undefined>(
    (best, row) => (best === undefined || row.revenueMinor > best.revenueMinor ? row : best),
    undefined,
  );
  return (
    <Panel id="breakdown" title="Revenue by category" description="Share of revenue from completed orders" className="lg:col-span-4">
      {totalMinor === 0 || !leader ? (
        <EmptyState
          icon={PieChart}
          title="No revenue in this period"
          description="Choose a longer date range to see how revenue splits across categories."
          className="flex-1 py-8"
        />
      ) : (
        <>
          <p className="mt-5 text-sm text-ink-muted">
            <span className="font-serif text-[40px] leading-none font-medium text-ink">{leader.sharePercent}%</span>
            <span className="ml-2">from {leader.category.toLowerCase()}</span>
          </p>
          <ul className="mt-5 space-y-4">
            {categories.map((row) => (
              <li key={row.category}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{row.category}</span>
                  <span className="text-ink tabular">
                    {formatMetricValue(row.revenueMinor, "currency", currency)}
                    <span className="ml-2 inline-block w-9 text-right text-ink-muted">{row.sharePercent}%</span>
                  </span>
                </div>
                <ShareBar fraction={row.sharePercent / 100} className="mt-2" />
                <p className="mt-1.5 text-xs text-ink-muted tabular">
                  {row.orders === 1 ? "1 order" : `${formatInteger(row.orders)} orders`}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-auto flex justify-between border-t border-line pt-4 text-sm">
            <span className="text-ink-muted">Total revenue</span>
            <span className="font-semibold text-ink tabular">{formatMetricValue(totalMinor, "currency", currency)}</span>
          </p>
        </>
      )}
    </Panel>
  );
}
