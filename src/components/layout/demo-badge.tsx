import { cn } from "@/lib/cn";

interface DemoBadgeProps {
  className?: string;
}

export function DemoBadge({ className }: DemoBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink-muted",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-gold" />
      Demo data
    </span>
  );
}
