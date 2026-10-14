import { FilterMenu, type FilterOption } from "@/components/filters/filter-menu";
import { SearchInput } from "@/components/filters/search-input";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Pagination } from "@/components/tables/pagination";
import { RecordDrawer, RecordDrawerTrigger } from "@/components/tables/record-drawer";
import { STATUS_META, StatusBadge } from "@/components/tables/status-badge";
import { TableToolbar } from "@/components/tables/table-toolbar";
import {
  CUSTOMER_DEFAULT_SORT,
  CUSTOMER_SORT_LABELS,
  CUSTOMER_SORT_OPTIONS,
  CUSTOMER_STATUS_FILTERS,
  type CustomerList,
  type CustomerRow,
  type CustomerSortKey,
  type CustomerStatusFilter,
} from "@/lib/customers";
import { formatDate, formatInteger, formatMoney } from "@/lib/formatters";
import type { CurrencyCode } from "@/lib/money";
import { PARAM, hrefWithParams, nextSort, serializeSort, sortToParam } from "@/lib/search-params";
import { customerPanel } from "./customer-details";
import { NoMatchingRecords, RecordsView } from "./records-view";

const PATH = "/customers";

const columnsFor = (currency: CurrencyCode): DataTableColumn<CustomerRow, CustomerSortKey>[] => [
  {
    id: "name",
    header: "Customer",
    sortKey: "name",
    rowHeader: true,
    cell: (row) => (
      <>
        <RecordDrawerTrigger id={row.id} label={`View customer ${row.name}`} className="block max-w-56 truncate">
          {row.name}
        </RecordDrawerTrigger>
        <span className="block max-w-56 truncate text-xs font-normal text-ink-muted">{row.email}</span>
      </>
    ),
  },
  { id: "status", header: "Status", hideBelow: "sm", cell: (row) => <StatusBadge status={row.status} /> },
  {
    id: "joined",
    header: "First purchase",
    sortKey: "joined",
    initialDirection: "desc",
    hideBelow: "lg",
    cell: (row) => <span className="whitespace-nowrap">{formatDate(row.joinedAt)}</span>,
  },
  {
    id: "lastOrder",
    header: "Last order",
    sortKey: "lastOrder",
    initialDirection: "desc",
    hideBelow: "lg",
    cell: (row) => <span className="whitespace-nowrap text-ink-muted">{row.lastOrderAt ? formatDate(row.lastOrderAt) : "—"}</span>,
  },
  { id: "channel", header: "Channel", hideBelow: "wide", cell: (row) => <span className="whitespace-nowrap text-ink-muted">{row.channelName}</span> },
  {
    id: "orders",
    header: "Orders",
    sortKey: "orders",
    initialDirection: "desc",
    align: "end",
    hideBelow: "sm",
    cell: (row) => formatInteger(row.orderCount),
  },
  {
    id: "spend",
    header: "Total spend",
    sortKey: "spend",
    initialDirection: "desc",
    align: "end",
    cell: (row) => (
      <span className="flex flex-col items-end gap-1">
        <span className="font-medium whitespace-nowrap tabular">{formatMoney(row.totalSpendMinor, currency)}</span>
        {/* Phones drop the status column; the badge rides under the amount instead. */}
        <StatusBadge status={row.status} className="sm:hidden" />
      </span>
    ),
  },
];

interface CustomerTableProps {
  list: CustomerList;
  /** The current query string, so links keep every other parameter. */
  search: string;
  currency: CurrencyCode;
}

/** The customer directory: search, status filter, the table with detail drawers, and pagination. */
export function CustomerTable({ list, search, currency }: CustomerTableProps) {
  const { query, page, statusCounts } = list;
  const resetHref = hrefWithParams(PATH, search, { [PARAM.query]: null, [PARAM.status]: null, [PARAM.page]: null });
  const sortLabel = CUSTOMER_SORT_LABELS[query.sort.key];
  const statusOptions: FilterOption<CustomerStatusFilter>[] = CUSTOMER_STATUS_FILTERS.map((status) => {
    const meta = status === "all" ? null : STATUS_META[status];
    return {
      value: status,
      label: meta?.label ?? "All",
      icon: meta ? <meta.icon aria-hidden /> : undefined,
      count: formatInteger(statusCounts[status]),
    };
  });
  const sortOption =
    CUSTOMER_SORT_OPTIONS.find((option) => option.value === serializeSort(query.sort))?.value ?? "spend.desc";
  const panels = Object.fromEntries(
    page.rows.map((row) => {
      const activity = list.activity[row.id] ?? { recent: [], transactionCount: 0 };
      return [row.id, customerPanel(row, activity, list.activeWindow, currency)];
    }),
  );

  return (
    <RecordsView
      label="Customers"
      toolbar={
        <TableToolbar
          search={<SearchInput value={query.search} label="Search customers" placeholder="Search name, email or ID" />}
          filters={
            <>
              <FilterMenu
                label="Status"
                param={PARAM.status}
                options={statusOptions}
                value={query.status}
                defaultValue="all"
                className="max-sm:flex-1"
              />
              {/* Several sortable columns are hidden below lg, so every order is also offered in a menu. */}
              <FilterMenu
                label="Sort"
                param={PARAM.sort}
                highlightActive={false}
                options={CUSTOMER_SORT_OPTIONS}
                value={sortOption}
                defaultValue={serializeSort(CUSTOMER_DEFAULT_SORT)}
                className="max-sm:flex-1 lg:hidden"
              />
            </>
          }
          resetHref={resetHref}
          filtersActive={list.filtered}
        />
      }
      summary={
        <>
          <p>
            <span className="font-semibold text-ink">{formatInteger(page.totalRows)}</span>{" "}
            {list.filtered ? `of ${formatInteger(list.totalCount)} ` : ""}
            {page.totalRows === 1 ? "customer" : "customers"}
          </p>
          <p>Active means a purchase since {formatDate(list.activeWindow.from)}</p>
        </>
      }
      pagination={
        <Pagination
          page={page}
          noun="customers"
          pageHref={(target) => hrefWithParams(PATH, search, { [PARAM.page]: target === 1 ? null : String(target) })}
        />
      }
    >
      <RecordDrawer panels={panels} noun="customer">
        <DataTable
          caption={`Customers sorted by ${sortLabel.label}, ${sortLabel[query.sort.direction]}${list.filtered ? ", filtered" : ""}`}
          columns={columnsFor(currency)}
          rows={page.rows}
          getRowId={(row) => row.id}
          sort={query.sort}
          sortHref={(key, initial) =>
            hrefWithParams(PATH, search, {
              [PARAM.sort]: sortToParam(nextSort(query.sort, key, initial), CUSTOMER_DEFAULT_SORT),
              [PARAM.page]: null,
            })
          }
          empty={
            <NoMatchingRecords
              noun="customers"
              hint="Try part of a name, an email address or a customer ID such as CU-10042."
              resetHref={resetHref}
            />
          }
        />
      </RecordDrawer>
    </RecordsView>
  );
}
