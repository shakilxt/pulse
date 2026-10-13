"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { hrefWithParams } from "@/lib/search-params";

export type QueryPatch = Record<string, string | null | undefined>;

/**
 * Applies a patch to the current URL's query and lets the server re-render
 * the page for it. Uses `replace` (filters shouldn't flood the history) and
 * keeps the scroll position. `isPending` stays true until the new render
 * arrives, so controls can show progress while the old data stays on screen.
 *
 * The patch is merged onto `window.location` at call time rather than a
 * value captured during render, so a debounced search never undoes a filter
 * chosen while it was waiting.
 */
export function useQueryNavigation() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(patch: QueryPatch) {
    const { pathname, search } = window.location;
    const href = hrefWithParams(pathname, search, patch);
    if (href === `${pathname}${search}`) return;
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return { navigate, isPending };
}
