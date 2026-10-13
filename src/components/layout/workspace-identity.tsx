import { cn } from "@/lib/cn";
import { WORKSPACE } from "@/lib/workspace";

interface WorkspaceIdentityProps {
  className?: string;
}

export function WorkspaceIdentity({ className }: WorkspaceIdentityProps) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border border-nav-line px-3 py-2.5", className)}>
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-md bg-nav-accent/15 font-serif text-lg font-semibold text-nav-accent"
      >
        {WORKSPACE.initial}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-nav-ink">{WORKSPACE.name}</span>
        <span className="block text-xs text-nav-ink-muted">{WORKSPACE.environmentLabel}</span>
      </span>
    </div>
  );
}
