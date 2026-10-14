"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { MAX_SEARCH_LENGTH, PARAM, parseSearchParam } from "@/lib/search-params";
import { useQueryNavigation } from "./use-query-navigation";

const DEBOUNCE_MS = 300;

interface SearchInputProps {
  /** The search currently applied (from the URL, parsed on the server). */
  value: string;
  /** Visible to screen readers: "Search transactions". */
  label: string;
  placeholder: string;
  className?: string;
}

/**
 * Debounced search that writes `?q=` and returns to page 1. Enter applies at
 * once; Escape clears. External changes to the URL (Reset filters, back
 * button) flow back into the field.
 */
export function SearchInput({ value, label, placeholder, className }: SearchInputProps) {
  const id = useId();
  const { navigate, isPending } = useQueryNavigation();
  const [text, setText] = useState(value);
  // The search this field last sent, and the URL value it last saw. When the
  // URL changes to something we didn't send, it came from outside: adopt it.
  const [sent, setSent] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== sent) {
      setSent(value);
      setText(value);
    }
  }

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function apply(next: string) {
    clearTimeout(timer.current);
    const query = parseSearchParam(next);
    setSent(query);
    navigate({ [PARAM.query]: query || null, [PARAM.page]: null });
  }

  function handleChange(next: string) {
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => apply(next), DEBOUNCE_MS);
  }

  return (
    <div className={cn("relative", className)} data-pending={isPending ? "" : undefined}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted">
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
      </span>
      <input
        id={id}
        type="search"
        value={text}
        maxLength={MAX_SEARCH_LENGTH}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply(text);
          } else if (event.key === "Escape" && text !== "") {
            event.preventDefault();
            setText("");
            apply("");
          }
        }}
        className={cn(
          "h-10 w-full rounded-md border border-line-strong bg-surface pr-10 pl-9 text-sm text-ink transition-colors placeholder:text-ink-muted",
          "hover:border-ink-muted [&::-webkit-search-cancel-button]:appearance-none",
        )}
      />
      {text !== "" ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setText("");
            apply("");
          }}
          className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-ink"
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
