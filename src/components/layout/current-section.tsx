"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { findActiveNavItem } from "@/lib/navigation";

/** Workspace / section trail. The page's own <h1> stays the primary heading. */
interface CurrentSectionProps {
  /** The workspace name, rendered on the server because it reads saved settings. */
  workspace: ReactNode;
}

export function CurrentSection({ workspace }: CurrentSectionProps) {
  const pathname = usePathname();
  const item = findActiveNavItem(pathname);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-2 text-sm">
        <li className="hidden truncate text-ink-muted sm:block">{workspace}</li>
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
