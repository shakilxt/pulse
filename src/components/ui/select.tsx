import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Native select with brand styling. The platform control gives the best
 * keyboard, screen-reader and mobile behaviour for settings-style choices.
 */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-md border border-line-strong bg-surface pr-9 pl-3 text-sm text-ink transition-colors",
          "hover:border-ink-muted aria-invalid:border-danger disabled:opacity-50",
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
      />
    </span>
  );
}
