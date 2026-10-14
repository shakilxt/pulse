import { cn } from "@/lib/cn";
import { formatDate, formatDateRange } from "@/lib/formatters";
import { BASE_CURRENCY, DEMO_EXCHANGE_RATE_NOTE } from "@/lib/money";
import { type Report, type ReportTable, SUMMARY_NOTES } from "@/lib/reports";

/** One report table as the preview shows it: CSV-only columns and section rows handled. */
function PreviewTable({ table }: { table: ReportTable }) {
  const visible = table.columns.map((column, index) => ({ column, index })).filter(({ column }) => !column.csvOnly);
  const titleId = `report-${table.id}`;
  return (
    <section aria-labelledby={titleId} className="border-t border-line pt-6">
      <h3 id={titleId} className="font-serif text-xl font-medium text-ink">
        {table.title}
      </h3>
      <p className="mt-1 text-sm text-ink-muted">{table.description}</p>
      <div role="region" aria-labelledby={titleId} tabIndex={0} className="scroll-shadow-x mt-4 overflow-x-auto rounded-md">
        <table className="w-full text-sm tabular" data-report-table={table.id}>
          <caption className="sr-only">{table.title}</caption>
          <thead>
            <tr className="border-b border-line-strong text-xs text-ink-muted">
              {visible.map(({ column }, position) => (
                <th
                  key={column.header}
                  scope="col"
                  className={cn(
                    "py-2 font-medium whitespace-nowrap",
                    position === 0 ? "pr-4 text-left" : "px-3 last:pr-0",
                    column.align === "end" ? "text-right" : "text-left",
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) =>
              row.section ? (
                <tr key={row.key}>
                  <th
                    scope="colgroup"
                    colSpan={visible.length}
                    className="pt-4 pb-1.5 text-left text-xs font-semibold tracking-[0.12em] text-gold-ink uppercase"
                  >
                    {row.cells[0]?.display}
                  </th>
                </tr>
              ) : (
                <tr
                  key={row.key}
                  data-row={row.key}
                  className={cn("border-b border-line", row.total && "border-t-2 border-b-0 border-t-line-strong font-semibold text-ink")}
                >
                  {visible.map(({ column, index }, position) => {
                    const value = row.cells[index]?.display ?? "";
                    return position === 0 ? (
                      <th key={column.header} scope="row" className="py-2 pr-4 text-left font-normal whitespace-nowrap text-ink">
                        {row.total ? <span className="font-semibold">{value}</span> : value}
                      </th>
                    ) : (
                      <td
                        key={column.header}
                        className={cn(
                          "px-3 py-2 whitespace-nowrap last:pr-0",
                          column.align === "end" ? "text-right" : "text-left",
                          row.total ? "text-ink" : "text-ink-muted",
                          position === 1 && column.align === "end" && "text-ink",
                        )}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      {table.id === "summary" ? (
        <ul className="mt-3 space-y-1 text-xs leading-relaxed text-ink-muted">
          {SUMMARY_NOTES.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** The report as a document: a heading block, a short overview, then each table the CSV files hold. */
export function ReportPreview({ report }: { report: Report }) {
  const comparison = report.comparison.summary ? report.comparison.range : null;
  return (
    <article aria-labelledby="report-title" data-pending-region="" className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-8 lg:col-span-12">
      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-gold-ink uppercase">Report preview</p>
          <h2 id="report-title" className="mt-2 font-serif text-3xl font-medium text-ink">
            {report.workspaceName} performance report
          </h2>
          <p className="mt-2 text-sm text-ink-muted tabular">
            <span className="font-medium text-ink">{formatDateRange(report.range)}</span>
            {comparison ? (
              <>
                {" "}
                compared with <span className="font-medium text-ink">{formatDateRange(comparison)}</span>
              </>
            ) : (
              " · no comparison data for this period"
            )}
          </p>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs text-ink-muted">
          <dt>Data through</dt>
          <dd className="text-ink tabular">{formatDate(report.dataThrough)}</dd>
          <dt>Currency</dt>
          <dd className="text-ink">{report.currency}</dd>
          <dt>Source</dt>
          <dd className="text-ink">Fictional demo data</dd>
        </dl>
      </header>
      <p className="mt-6 max-w-3xl text-base leading-relaxed text-ink" aria-live="polite">
        {report.overview}
      </p>
      {report.currency === BASE_CURRENCY ? null : <p className="mt-2 text-xs text-ink-muted">{DEMO_EXCHANGE_RATE_NOTE}</p>}
      <div className="mt-6 space-y-8">
        {report.tables.map((table) => (
          <PreviewTable key={table.id} table={table} />
        ))}
      </div>
    </article>
  );
}
