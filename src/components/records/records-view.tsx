import type { ReactNode } from "react";
import { SearchX } from "lucide-react";
import { ResetFiltersLink } from "@/components/tables/table-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingState } from "@/components/ui/loading-state";

interface RecordsViewProps {
  /** Names the results region: "Transactions". */
  label: string;
  toolbar: ReactNode;
  /** Result count and totals for the filtered rows, above the table. */
  summary: ReactNode;
  pagination: ReactNode;
  children: ReactNode;
}

/**
 * A record page's body: filters in one row, then a card holding the result
 * summary, the table and its pagination. The card dims while new results load.
 */
export function RecordsView({ label, toolbar, summary, pagination, children }: RecordsViewProps) {
  return (
    <div className="mt-7 flex flex-col gap-4">
      {toolbar}
      <section aria-label={label} data-pending-region="" className="min-w-0 rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3 text-sm text-ink-muted tabular sm:px-5">
          {summary}
        </div>
        <div className="px-1 sm:px-2">{children}</div>
        <div className="border-t border-line px-4 py-3 sm:px-5">{pagination}</div>
      </section>
    </div>
  );
}

/** What a record table shows when the filters leave nothing. */
export function NoMatchingRecords({ noun, hint, resetHref }: { noun: string; hint: string; resetHref: string }) {
  return (
    <EmptyState
      icon={SearchX}
      title={`No ${noun} match these filters`}
      description={hint}
      action={<ResetFiltersLink href={resetHref} className="border border-line-strong" />}
    />
  );
}

/** Placeholder with the same outline as RecordsView, shown while the first results stream in. */
export function RecordsSkeleton({ label, filters }: { label: string; filters: number }) {
  return (
    <LoadingState label={`Loading ${label.toLowerCase()}`} className="mt-7 flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Skeleton className="h-10 w-full sm:max-w-sm sm:flex-1" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: filters }, (_, index) => (
            <Skeleton key={index} className="h-10 w-36" />
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-4 py-3.5 sm:px-5">
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="divide-y divide-line px-4 sm:px-5">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="flex h-14 items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="hidden h-4 flex-1 sm:block" />
              <Skeleton className="ml-auto h-5 w-20 rounded-full sm:ml-0" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="border-t border-line px-4 py-4 sm:px-5">
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </LoadingState>
  );
}
