import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  /** A way forward, usually "Reset filters" or a wider date range. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon: Icon = SearchX, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <span aria-hidden className="mb-4 grid size-11 place-items-center rounded-full border border-line bg-surface-sunken">
        <Icon className="size-5 text-gold-ink" strokeWidth={1.75} />
      </span>
      <p className="text-base font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
