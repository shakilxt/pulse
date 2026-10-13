import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SortDirection } from "@/lib/filters";

interface SortableHeaderProps {
  label: string;
  /** This column's direction when it is the active sort, otherwise null. */
  direction: SortDirection | null;
  /** Link that applies this column's next sort state. */
  href: string;
  align?: "start" | "end";
  className?: string;
}

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

/**
 * Column header that sorts through a link, so sorting works before hydration
 * and the state lives in the URL. `aria-sort` announces the current order; the
 * hidden hint says what activating the link will do.
 */
export function SortableHeader({ label, direction, href, align = "start", className }: SortableHeaderProps) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;
  const nextLabel = direction === "asc" ? "descending" : "ascending";

  return (
    <th scope="col" aria-sort={direction ? ARIA_SORT[direction] : undefined} className={cn("p-0", className)}>
      <Link
        href={href}
        scroll={false}
        replace
        className={cn(
          "group inline-flex h-10 w-full items-center gap-1.5 px-3 font-medium whitespace-nowrap transition-colors hover:text-ink",
          align === "end" && "justify-end",
          direction ? "text-ink" : "text-ink-muted",
        )}
      >
        {label}
        <Icon
          aria-hidden
          className={cn("size-3.5 shrink-0", direction ? "text-accent-ink" : "opacity-40 group-hover:opacity-80")}
        />
        <span className="sr-only">{direction ? `, sort ${nextLabel}` : ", sort"}</span>
      </Link>
    </th>
  );
}
