import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { WORKSPACE } from "@/lib/workspace";

interface WorkspaceIdentityProps {
  /** The workspace name from settings; null while it streams in. */
  name: string | null;
  className?: string;
}

export function WorkspaceIdentity({ name, className }: WorkspaceIdentityProps) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border border-nav-line px-3 py-2.5", className)}>
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-md bg-nav-accent/15 font-serif text-lg font-semibold text-nav-accent"
      >
        {name ? Array.from(name)[0]?.toLocaleUpperCase("en-US") : null}
      </span>
      <span className="min-w-0 flex-1">
        {name ? (
          <span className="block truncate text-sm font-medium text-nav-ink">{name}</span>
        ) : (
          <Skeleton className="my-0.5 h-4 w-28 bg-nav-line" />
        )}
        <span className="block text-xs text-nav-ink-muted">{WORKSPACE.environmentLabel}</span>
      </span>
    </div>
  );
}
