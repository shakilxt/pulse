"use client";

import { usePathname } from "next/navigation";
import { findActiveNavItem } from "@/lib/navigation";
import { WORKSPACE } from "@/lib/workspace";

/** Workspace / section trail. The page's own <h1> stays the primary heading. */
export function CurrentSection() {
  const pathname = usePathname();
  const item = findActiveNavItem(pathname);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-2 text-sm">
        <li className="hidden truncate text-ink-muted sm:block">{WORKSPACE.name}</li>
        {item ? (
          <>
            <li aria-hidden className="hidden text-line-strong sm:block">
              /
            </li>
            <li aria-current="page" className="truncate font-medium text-ink">
              {item.label}
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}
