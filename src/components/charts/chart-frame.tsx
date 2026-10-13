import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { ChartBoundary } from "./chart-boundary";

export interface ChartTableColumn {
  label: string;
  align?: "start" | "end";
}

export interface ChartTable {
  caption: string;
  columns: readonly ChartTableColumn[];
  /** Pre-formatted cells; the first cell names the row. */
  rows: ReadonlyArray<{ key: string; cells: readonly string[] }>;
}

interface ChartFrameProps {
  id: string;
  title: string;
  description?: ReactNode;
  /** Headline figure beside the title. */
  aside?: ReactNode;
  legend?: ReactNode;
  /** One or two sentences that state what the chart shows. Always visible. */
  summary: string;
  table: ChartTable;
  /** Fixed plot height, so nothing shifts while the chart draws. */
  plotClassName: string;
  /** Supporting content after the summary, such as a breakdown list. */
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * The panel every chart sits in: heading, the plot at a fixed height, a
 * written summary, and the same figures as a table. The plot is the only
 * part that needs JavaScript; everything else is server-rendered text.
 */
export function ChartFrame({
  id,
  title,
  description,
  aside,
  legend,
  summary,
  table,
  plotClassName,
  footer,
  className,
  children,
}: ChartFrameProps) {
  const titleId = `${id}-title`;
  const summaryId = `${id}-summary`;
  return (
    <section aria-labelledby={titleId} data-pending-region="" className={cn("flex flex-col rounded-xl border border-line bg-surface p-5 sm:p-6", className)}>
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-base font-semibold text-ink">
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
        </div>
        {aside}
      </header>
      {legend ? <div className="mt-4">{legend}</div> : null}
      <ChartFigure titleId={titleId} summaryId={summaryId} summary={summary} plotClassName={plotClassName}>
        {children}
      </ChartFigure>
      {footer}
      <ChartDataTable table={table} />
    </section>
  );
}

interface ChartFigureProps {
  titleId: string;
  summaryId: string;
  summary: string;
  plotClassName: string;
  className?: string;
  children: ReactNode;
}

/** The plot at a fixed height with its written summary as the caption. */
export function ChartFigure({ titleId, summaryId, summary, plotClassName, className, children }: ChartFigureProps) {
  return (
    <figure aria-labelledby={titleId} aria-describedby={summaryId} className={cn("mt-4 flex flex-1 flex-col", className)}>
      <div className={cn("relative -mx-1", plotClassName)}>
        <ChartBoundary>{children}</ChartBoundary>
      </div>
      <figcaption id={summaryId} className="mt-4 text-sm leading-relaxed text-ink-muted">
        {summary}
      </figcaption>
    </figure>
  );
}

/** The chart's figures as a table, collapsed by default. */
export function ChartDataTable({ table }: { table: ChartTable }) {
  return (
    <details className="group mt-3 border-t border-line pt-3">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm text-sm font-medium text-accent-ink select-none hover:underline hover:underline-offset-4 [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="size-4 transition-transform group-open:rotate-90" />
        Data table
      </summary>
      <div
        role="region"
        aria-label={table.caption}
        tabIndex={0}
        className="mt-3 max-h-72 overflow-auto rounded-md border border-line"
      >
        <table className="w-full text-left text-sm tabular">
          <caption className="sr-only">{table.caption}</caption>
          <thead className="sticky top-0 bg-surface-sunken text-xs text-ink-muted">
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  className={cn("px-3 py-2 font-medium whitespace-nowrap", column.align === "end" && "text-right")}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {table.rows.map((row) => (
              <tr key={row.key}>
                {row.cells.map((cell, index) =>
                  index === 0 ? (
                    <th key={index} scope="row" className="px-3 py-1.5 font-normal whitespace-nowrap text-ink">
                      {cell}
                    </th>
                  ) : (
                    <td
                      key={index}
                      className={cn(
                        "px-3 py-1.5 whitespace-nowrap text-ink",
                        table.columns[index]?.align === "end" && "text-right",
                      )}
                    >
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
