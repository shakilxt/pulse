import { FilterMenu } from "@/components/filters/filter-menu";
import { SearchInput } from "@/components/filters/search-input";
import { ChangeBadge } from "@/components/dashboard/change-badge";
import { ShareBar } from "@/components/dashboard/share-bar";
import { NoMatchingRecords, RecordsView } from "@/components/records/records-view";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { formatInteger, formatMoney, formatPercent } from "@/lib/formatters";
import { changeSentiment } from "@/lib/metrics";
import type { CurrencyCode } from "@/lib/money";
import {
  PRODUCT_DEFAULT_SORT,
  PRODUCT_SORT_LABELS,
  PRODUCT_SORT_OPTIONS,
  type ProductPerformanceView,
  type ProductRow,
  type ProductSortKey,
} from "@/lib/products";
import { PARAM, hrefWithParams, nextSort, serializeSort, sortToParam } from "@/lib/search-params";

const PATH = "/products";

function columnsFor(currency: CurrencyCode, hasComparison: boolean): DataTableColumn<ProductRow, ProductSortKey>[] {
  return [
    {
      id: "name",
      header: "Product",
      sortKey: "name",
      rowHeader: true,
      cell: (row) => (
        <>
          <span className="block max-w-56 truncate font-medium text-ink">{row.name}</span>
          <span className="block text-xs font-normal text-ink-muted">
            <span className="font-mono">{row.id}</span>
            <span className="md:hidden"> · {row.category}</span>
          </span>
        </>
      ),
    },
    { id: "category", header: "Category", sortKey: "category", hideBelow: "md", cell: (row) => row.category },
    {
      id: "revenue",
      header: "Revenue",
      sortKey: "revenue",
      initialDirection: "desc",
      align: "end",
      cell: (row) => (
        <span className="flex flex-col items-end gap-1">
          <span className="font-medium whitespace-nowrap tabular">{formatMoney(row.revenueMinor, currency, { whole: true })}</span>
          {/* Phones drop the change column; the badge rides under the revenue instead. */}
          {hasComparison ? (
            <ChangeBadge change={row.revenueChange} sentiment={changeSentiment(row.revenueChange, "higher-is-better")} className="sm:hidden" />
          ) : null}
        </span>
      ),
    },
    ...(hasComparison
      ? [
          {
            id: "change",
            header: "Change",
            sortKey: "change" as const,
            initialDirection: "desc" as const,
            align: "end" as const,
            hideBelow: "sm" as const,
            cell: (row: ProductRow) => (
              <ChangeBadge change={row.revenueChange} sentiment={changeSentiment(row.revenueChange, "higher-is-better")} />
            ),
          },
        ]
      : []),
    {
      id: "units",
      header: "Units sold",
      sortKey: "units",
      initialDirection: "desc",
      align: "end",
      hideBelow: "md",
      cell: (row) => formatInteger(row.unitsSold),
    },
    {
      id: "conversion",
      header: "Conversion",
      sortKey: "conversion",
      initialDirection: "desc",
      align: "end",
      hideBelow: "lg",
      cell: (row) => (row.conversionRate === null ? "—" : formatPercent(row.conversionRate, 2)),
    },
    {
      id: "share",
      header: "Share of revenue",
      hideBelow: "wide",
      cell: (row) => (
        <span className="flex min-w-36 items-center gap-2">
          <ShareBar fraction={row.share} />
          <span className="w-12 shrink-0 text-right text-ink-muted tabular">{formatPercent(row.share)}</span>
        </span>
      ),
    },
  ];
}

interface ProductTableProps {
  view: ProductPerformanceView;
  /** The current query string, so links keep every other parameter. */
  search: string;
}

/** Every product's figures for the period: search, sorting and the change against the comparison period. */
export function ProductTable({ view, search }: ProductTableProps) {
  const { query, rows, currency } = view;
  const hasComparison = view.comparison.summary !== null;
  const resetHref = hrefWithParams(PATH, search, { [PARAM.query]: null });
  const sortLabel = PRODUCT_SORT_LABELS[query.sort.key];

  return (
    <RecordsView
      label="Products"
      className="lg:col-span-12"
      toolbar={null}
      summary={
        <>
          <p>
            <span className="font-semibold text-ink">{formatInteger(rows.length)}</span>{" "}
            {view.filtered ? `of ${formatInteger(view.totalCount)} ` : ""}
            {rows.length === 1 ? "product" : "products"}
          </p>
          <p>
            Revenue <span className="font-semibold text-ink">{formatMoney(view.shownRevenueMinor, currency, { whole: true })}</span>
            {view.filtered ? ` of ${formatMoney(view.totalRevenueMinor, currency, { whole: true })}` : ""}
            {hasComparison ? <span> · changes {view.comparisonLabel}</span> : null}
          </p>
        </>
      }
    >
      <DataTable
        caption={`Products sorted by ${sortLabel.label}, ${sortLabel[query.sort.direction]}${view.filtered ? ", filtered" : ""}`}
        columns={columnsFor(currency, hasComparison)}
        rows={rows}
        getRowId={(row) => row.id}
        sort={query.sort}
        sortHref={(key, initial) =>
          hrefWithParams(PATH, search, { [PARAM.sort]: sortToParam(nextSort(query.sort, key, initial), PRODUCT_DEFAULT_SORT) })
        }
        empty={
          <NoMatchingRecords
            noun="products"
            hint="Try a product name, a category such as Courses, or an ID such as PR-04."
            resetHref={resetHref}
          />
        }
      />
    </RecordsView>
  );
}

/**
 * Search and, on narrow screens, the sort menu. It sits above the chart and
 * the table because the search filters both.
 */
export function ProductToolbar({ view, search }: ProductTableProps) {
  const { query } = view;
  const hasComparison = view.comparison.summary !== null;
  const resetHref = hrefWithParams(PATH, search, { [PARAM.query]: null });
  const sortOption = PRODUCT_SORT_OPTIONS.find((option) => option.value === serializeSort(query.sort))?.value ?? "revenue.desc";
  const sortOptions = hasComparison ? PRODUCT_SORT_OPTIONS : PRODUCT_SORT_OPTIONS.filter((option) => !option.value.startsWith("change."));
  return (
    <TableToolbar
      className="lg:col-span-12"
      search={<SearchInput value={query.search} label="Search products" placeholder="Search product, category or ID" />}
      filters={
        // Units and conversion are hidden below lg, so every order is also offered in a menu.
        <FilterMenu
          label="Sort"
          param={PARAM.sort}
          highlightActive={false}
          options={sortOptions}
          value={sortOption}
          defaultValue={serializeSort(PRODUCT_DEFAULT_SORT)}
          className="max-sm:flex-1 lg:hidden"
        />
      }
      resetHref={resetHref}
      filtersActive={view.filtered}
    />
  );
}
