import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

function Block({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn("rounded-xl border border-line bg-surface p-5 sm:p-6", className)}>{children}</div>;
}

/** Mirrors the overview grid, so panels arrive without moving anything. */
export function OverviewSkeleton() {
  return (
    <>
      <Block className="lg:col-span-4">
        <div role="status">
          <span className="sr-only">Loading the overview for the selected period</span>
        </div>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-12 w-full" />
        <Skeleton className="mt-6 h-4 w-full" />
        <Skeleton className="mt-4 h-4 w-5/6" />
        <Skeleton className="mt-4 h-4 w-2/3" />
      </Block>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:col-span-12 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="bg-surface p-4 sm:p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-28" />
            <Skeleton className="mt-4 h-5 w-36" />
          </div>
        ))}
      </div>
      <Block className="lg:col-span-8">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-6 h-64 w-full sm:h-80" />
      </Block>
      <Block className="lg:col-span-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-6 h-10 w-24" />
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="mt-6 h-6 w-full" />
        ))}
      </Block>
      <Block className="lg:col-span-7">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-6 h-60 w-full sm:h-72" />
      </Block>
      <Block className="lg:col-span-5">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-6 h-44 w-full sm:h-48" />
      </Block>
      <Block className="lg:col-span-8">
        <Skeleton className="h-5 w-44" />
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="mt-5 h-8 w-full" />
        ))}
      </Block>
      <Block className="lg:col-span-4">
        <Skeleton className="h-5 w-32" />
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="mt-5 h-9 w-full" />
        ))}
      </Block>
    </>
  );
}
