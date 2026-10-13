import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the products grid, so the content arrives without moving anything. */
export function ProductsSkeleton() {
  return (
    <>
      <div role="status" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center lg:col-span-12">
        <span className="sr-only">Loading products for the selected period</span>
        <Skeleton className="h-11 w-full sm:w-64" />
        <Skeleton className="h-9 w-full sm:w-80" />
      </div>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:col-span-12 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="bg-surface p-4 sm:p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-3 h-5 w-40" />
            <Skeleton className="mt-2 h-7 w-24" />
            <Skeleton className="mt-3 h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-line bg-surface p-5 sm:p-6 lg:col-span-12">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        {Array.from({ length: 12 }, (_, index) => (
          <Skeleton key={index} className="mt-3 h-5 w-full" />
        ))}
      </div>
    </>
  );
}
