import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the reports layout, so the preview arrives without moving anything. */
export function ReportsSkeleton() {
  return (
    <>
      <div role="status" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center lg:col-span-12">
        <span className="sr-only">Loading the report for the selected period</span>
        <Skeleton className="h-11 w-full sm:w-64" />
        <Skeleton className="h-9 w-full sm:w-80" />
      </div>
      <div className="rounded-xl border border-line bg-surface p-5 sm:p-6 lg:col-span-12">
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-line bg-surface p-5 sm:p-8 lg:col-span-12">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-8 w-80 max-w-full" />
        <Skeleton className="mt-6 h-4 w-full max-w-3xl" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className="mt-4 h-5 w-full" />
        ))}
      </div>
    </>
  );
}
