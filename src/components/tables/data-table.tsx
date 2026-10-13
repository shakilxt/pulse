import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { SortDirection } from "@/lib/filters";
import type { SortState } from "@/lib/search-params";
import { SortableHeader } from "./sortable-header";

/** Columns that drop out on narrow screens; the detail drawer still shows everything. */
type Breakpoint = "sm" | "md" | "lg" | "xl" | "wide";

const HIDE_BELOW: Record<Breakpoint, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
  /** 1440px: `xl` is 1280px, where the sidebar still takes 264px of it. */
  wide: "hidden min-[90rem]:table-cell",
};

export interface DataTableColumn<Row, Key extends string = string> {
  id: string;
  header: string;
  cell: (row: Row) => ReactNode;
  align?: "start" | "end";
  /** When set, the header sorts by this key. */
  sortKey?: Key;
  /** Direction a column starts in when first chosen; defaults to ascending. */
  initialDirection?: SortDirection;
  hideBelow?: Breakpoint;
  /** The column that names the row (identifier or name) is a row header. */
  rowHeader?: boolean;
  className?: string;
}

interface DataTableProps<Row, Key extends string> {
  /** Visible to screen readers; describes the table and its current filters. */
  caption: string;
  columns: readonly DataTableColumn<Row, Key>[];
  rows: readonly Row[];
  getRowId: (row: Row) => string;
  sort?: SortState<Key>;
  /** Link that applies a sort; called for each sortable column. */
  sortHref?: (key: Key, initialDirection: SortDirection) => string;
  /** Shown in place of the body when there are no rows. */
  empty?: ReactNode;
  className?: string;
}

/**
 * Server-rendered record table. It receives one page of rows already
 * filtered and sorted on the server, so it ships no table logic to the
 * browser. Rows become clickable when a cell renders a RecordDrawerTrigger.
 */
export function DataTable<Row, Key extends string>({
  caption,
  columns,
  rows,
  getRowId,
  sort,
  sortHref,
  empty,
  className,
}: DataTableProps<Row, Key>) {
  return (
    // `relative` keeps the visually hidden header text inside the scroller, so it can't widen the page.
    <div className={cn("relative overflow-x-auto", className)}>
      <table className="w-full border-collapse text-sm tabular">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs">
            {columns.map((column) => {
              const classes = cn(column.hideBelow && HIDE_BELOW[column.hideBelow], column.className);
              if (column.sortKey && sortHref) {
                const initial = column.initialDirection ?? "asc";
                return (
                  <SortableHeader
                    key={column.id}
                    label={column.header}
                    direction={sort?.key === column.sortKey ? sort.direction : null}
                    href={sortHref(column.sortKey, initial)}
                    align={column.align}
                    className={classes}
                  />
                );
              }
              return (
                <th
                  key={column.id}
                  scope="col"
                  className={cn(
                    "h-10 px-3 font-medium whitespace-nowrap text-ink-muted",
                    column.align === "end" && "text-right",
                    classes,
                  )}
                >
                  {column.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{empty}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={getRowId(row)}
                className="relative border-b border-line transition-colors last:border-b-0 hover:bg-surface-sunken/60"
              >
                {columns.map((column) => {
                  const Cell = column.rowHeader ? "th" : "td";
                  return (
                    <Cell
                      key={column.id}
                      scope={column.rowHeader ? "row" : undefined}
                      className={cn(
                        "h-14 px-3 text-left font-normal text-ink",
                        column.align === "end" && "text-right",
                        column.hideBelow && HIDE_BELOW[column.hideBelow],
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </Cell>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
