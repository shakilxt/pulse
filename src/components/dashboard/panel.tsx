import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface PanelProps {
  id: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** A titled dashboard panel. Dims while the page fetches a new period. */
export function Panel({ id, title, description, action, className, children }: PanelProps) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      data-pending-region=""
      className={cn("flex flex-col rounded-xl border border-line bg-surface p-5 sm:p-6", className)}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-base font-semibold text-ink">
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** "View all" style link to the page that holds the full list. */
export function PanelLink({ href, children, label }: { href: string; children: ReactNode; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-1 rounded-sm text-sm font-medium text-accent-ink hover:underline hover:underline-offset-4"
    >
      {children}
      <ArrowRight aria-hidden className="size-4" />
    </Link>
  );
}
