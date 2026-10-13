import type { ReactNode } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface TableToolbarProps {
  /** Usually a SearchInput; grows to fill the row. */
  search?: ReactNode;
  /** Filter controls, shown after the search. */
  filters?: ReactNode;
  /** Link that clears every filter; the button only appears while filters are active. */
  resetHref?: string;
  filtersActive?: boolean;
  className?: string;
}

/** One row of table controls above the records, wrapping on narrow screens. */
export function TableToolbar({ search, filters, resetHref, filtersActive = false, className }: TableToolbarProps) {
  return (
    <div role="search" className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      {search ? <div className="min-w-0 sm:max-w-sm sm:flex-1">{search}</div> : null}
      {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
      {resetHref && filtersActive ? <ResetFiltersLink href={resetHref} className="self-start sm:ml-auto sm:self-auto" /> : null}
    </div>
  );
}

export function ResetFiltersLink({ href, className }: { href: string; className?: string }) {
  return (
    <Link href={href} scroll={false} replace className={buttonClasses({ variant: "ghost", size: "sm", className })}>
      <RotateCcw aria-hidden />
      Reset filters
    </Link>
  );
}
