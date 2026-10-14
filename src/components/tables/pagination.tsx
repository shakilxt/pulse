import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { paginationItems, type PageResult } from "@/lib/filters";
import { formatInteger } from "@/lib/formatters";

interface PaginationProps {
  page: Pick<PageResult<unknown>, "page" | "pageCount" | "totalRows" | "firstRow" | "lastRow">;
  /** Link to a given page, keeping the current filters. */
  pageHref: (page: number) => string;
  /** Plural noun for the summary: "transactions". */
  noun: string;
  className?: string;
}

const STEP_CLASSES =
  "inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-sm font-medium transition-colors [&_svg]:size-4";

/** Link-based pagination: works without JavaScript, and each page has a shareable URL. */
export function Pagination({ page, pageHref, noun, className }: PaginationProps) {
  const { page: current, pageCount, totalRows, firstRow, lastRow } = page;
  const summary =
    totalRows === 0
      ? `No ${noun}`
      : `${formatInteger(firstRow)}–${formatInteger(lastRow)} of ${formatInteger(totalRows)} ${noun}`;

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      {/* Announced politely when filters change the result count. */}
      <p role="status" className="text-sm text-ink-muted tabular">
        {summary}
      </p>
      {pageCount > 1 ? (
        <nav aria-label="Pagination">
          <ul className="flex items-center gap-1">
            <li>
              <StepLink href={current > 1 ? pageHref(current - 1) : null} label="Previous page">
                <ChevronLeft aria-hidden />
                <span className="hidden sm:inline">Previous</span>
              </StepLink>
            </li>
            {paginationItems(current, pageCount).map((item, index) =>
              item === "gap" ? (
                <li key={`gap-${index}`} aria-hidden className="hidden w-6 text-center text-ink-muted sm:block">
                  &hellip;
                </li>
              ) : (
                <li key={item} className={cn(item !== current && "hidden sm:block")}>
                  <Link
                    href={pageHref(item)}
                    scroll={false}
                    aria-label={`Page ${item}`}
                    aria-current={item === current ? "page" : undefined}
                    className={cn(
                      "grid h-9 min-w-9 place-items-center rounded-md px-2 text-sm tabular transition-colors",
                      item === current
                        ? "bg-primary font-semibold text-on-primary"
                        : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                    )}
                  >
                    {formatInteger(item)}
                  </Link>
                </li>
              ),
            )}
            <li>
              <StepLink href={current < pageCount ? pageHref(current + 1) : null} label="Next page">
                <span className="hidden sm:inline">Next</span>
                <ChevronRight aria-hidden />
              </StepLink>
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

function StepLink({ href, label, children }: { href: string | null; label: string; children: ReactNode }) {
  if (href === null) {
    // A disabled link has no href: it stays in the reading order but not the tab order.
    return (
      <a aria-disabled="true" aria-label={label} role="link" className={cn(STEP_CLASSES, "text-ink-muted opacity-40")}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} scroll={false} aria-label={label} className={cn(STEP_CLASSES, "text-ink hover:bg-surface-sunken")}>
      {children}
    </Link>
  );
}
