import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface LoadingStateProps {
  /** What is loading, for screen readers: "Loading transactions". */
  label: string;
  /** Skeleton shapes that mirror the final layout, so nothing shifts on arrival. */
  children: ReactNode;
  className?: string;
}

export function LoadingState({ label, children, className }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className={cn(className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
