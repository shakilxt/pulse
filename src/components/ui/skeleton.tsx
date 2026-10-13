import { cn } from "@/lib/cn";

/** Placeholder block. Decorative: pair it with a LoadingState status message. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-pulse rounded-md bg-surface-sunken", className)} />;
}
