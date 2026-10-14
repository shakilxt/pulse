import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

function Block({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn("rounded-xl border border-line bg-surface p-5 sm:p-6", className)}>{children}</div>;
}

/** Mirrors the analytics grid, so panels arrive without moving anything. */
export function AnalyticsSkeleton() {
  return (
    <>
      <Block className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-4 lg:col-span-12">
        <div role="status">
          <span className="sr-only">Loading analytics for the selected period</span>
        </div>
        <Skeleton className="h-11 w-full sm:w-64" />
        <Skeleton className="h-9 w-full sm:w-80" />
      </Block>
      <Block className="p-0 sm:p-0 lg:col-span-12">
        <div className="p-5 sm:p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="bg-surface px-4 pt-4 pb-3.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-2 h-7 w-24" />
                <Skeleton className="mt-2 h-5 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid border-t border-line lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="p-5 sm:p-6">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="mt-4 h-64 w-full sm:h-80" />
          </div>
          <div className="border-t border-line p-5 sm:p-6 lg:border-t-0 lg:border-l">
            <Skeleton className="h-3 w-36" />
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="mt-5 h-10 w-full" />
            ))}
          </div>
        </div>
      </Block>
      <Block className="lg:col-span-7">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-6 h-60 w-full sm:h-72" />
      </Block>
      <Block className="lg:col-span-5">
        <Skeleton className="h-5 w-40" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
          <Skeleton key={index} className="mt-4 h-6 w-full" />
        ))}
      </Block>
      <Block className="lg:col-span-7">
        <Skeleton className="h-5 w-44" />
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="mt-5 h-7 w-full" />
        ))}
      </Block>
      <Block className="lg:col-span-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-5 h-8 w-24" />
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="mt-5 h-7 w-full" />
        ))}
      </Block>
    </>
  );
}
