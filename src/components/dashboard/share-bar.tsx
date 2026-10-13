import { cn } from "@/lib/cn";

/** A thin horizontal bar for a part of a whole. Decorative: the figure beside it carries the value. */
export function ShareBar({ fraction, size = "md", className }: { fraction: number; size?: "sm" | "md"; className?: string }) {
  const width = `${Math.min(Math.max(fraction, 0), 1) * 100}%`;
  return (
    <span aria-hidden className={cn("block w-full overflow-hidden rounded-full bg-surface-sunken", size === "sm" ? "h-1" : "h-1.5", className)}>
      <span className="block h-full rounded-full bg-chart-1" style={{ width }} />
    </span>
  );
}
