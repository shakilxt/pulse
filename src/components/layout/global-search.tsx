"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { type SearchOption, buildSearchOptions } from "@/lib/global-search";
import { MAX_SEARCH_LENGTH } from "@/lib/search-params";
import { NAV_ICONS } from "./nav-icons";

/** True when a key press is meant for a text field rather than a page shortcut. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Workspace search. Opens with the button, "/" or Ctrl/⌘ K, and offers to
 * open a record table filtered by the query or to jump to a page. Nothing is
 * searched in the browser; the destination page filters on the server.
 */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey) && !event.altKey) {
        event.preventDefault();
        setOpen((current) => !current);
      } else if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target)) {
        event.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-keyshortcuts="/ Control+K Meta+K"
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center gap-2.5 rounded-md text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink",
          "lg:h-10 lg:w-64 lg:justify-start lg:border lg:border-line-strong/70 lg:bg-surface lg:px-3 lg:hover:border-ink-muted lg:hover:bg-surface",
        )}
      >
        <Search aria-hidden className="size-4 shrink-0" />
        <span className="sr-only lg:not-sr-only lg:flex-1 lg:text-left">Search</span>
        <kbd
          aria-hidden
          className="hidden h-5 min-w-5 place-items-center rounded border border-line px-1 font-sans text-xs text-ink-muted lg:grid"
        >
          /
        </kbd>
      </DialogTrigger>
      <DialogContent className="overflow-hidden">
        <SearchPalette
          onChoose={(option) => {
            setOpen(false);
            router.push(option.href);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * ARIA combobox: focus stays in the input while arrow keys move the active
 * option (announced via aria-activedescendant) and Enter opens it. Mounted
 * only while the dialog is open, so each opening starts empty.
 */
function SearchPalette({ onChoose }: { onChoose: (option: SearchOption) => void }) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const options = useMemo(() => buildSearchOptions(query), [query]);
  const active = options[Math.min(activeIndex, options.length - 1)];
  const optionId = (option: SearchOption) => `${baseId}-${option.id}`;
  const activeId = active ? optionId(active) : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const groups = [
    { key: "records", label: "Search records", options: options.filter((option) => option.group === "records") },
    { key: "pages", label: "Go to", options: options.filter((option) => option.group === "pages") },
  ].filter((group) => group.options.length > 0);

  function move(delta: number) {
    if (options.length === 0) return;
    const current = active ? options.indexOf(active) : 0;
    setActiveIndex((current + delta + options.length) % options.length);
  }

  return (
    <>
      <DialogTitle className="sr-only">Search workspace</DialogTitle>
      <DialogDescription className="sr-only">
        Type to search customers, transactions and products, or to jump to a page.
      </DialogDescription>
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search aria-hidden className="size-[18px] shrink-0 text-ink-muted" />
        <input
          role="combobox"
          aria-label="Search workspace"
          aria-expanded={options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          maxLength={MAX_SEARCH_LENGTH}
          placeholder="Search records or jump to a page"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              move(1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              move(-1);
            } else if (event.key === "Enter" && active) {
              event.preventDefault();
              onChoose(active);
            }
          }}
          className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
        />
      </div>

      <div id={listId} role="listbox" aria-label="Suggestions" className="max-h-[min(400px,55vh)] overflow-y-auto p-2">
        {groups.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-ink-muted">No pages match.</p>
        ) : (
          groups.map((group) => (
            <div key={group.key} role="group" aria-labelledby={`${baseId}-${group.key}`} className="not-first:mt-2">
              <p
                id={`${baseId}-${group.key}`}
                className="px-3 pt-2 pb-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase"
              >
                {group.label}
              </p>
              {group.options.map((option) => {
                const Icon = NAV_ICONS[option.section];
                const selected = option === active;
                return (
                  <div
                    key={option.id}
                    id={optionId(option)}
                    role="option"
                    aria-selected={selected}
                    onPointerMove={() => {
                      if (!selected) setActiveIndex(options.indexOf(option));
                    }}
                    onClick={() => onChoose(option)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5",
                      selected && "bg-sage",
                    )}
                  >
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface text-accent-ink"
                    >
                      <Icon className="size-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{option.label}</span>
                      <span className="block truncate text-xs text-ink-muted">{option.description}</span>
                    </span>
                    <CornerDownLeft aria-hidden className={cn("size-4 shrink-0 text-ink-muted", !selected && "invisible")} />
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div aria-hidden className="flex items-center gap-4 border-t border-line bg-surface-sunken/60 px-4 py-2.5 text-xs text-ink-muted">
        <span>
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move
        </span>
        <span>
          <Kbd>↵</Kbd> to open
        </span>
        <span>
          <Kbd>esc</Kbd> to close
        </span>
      </div>
    </>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-grid h-5 min-w-5 place-items-center rounded border border-line bg-surface px-1 font-sans text-[11px]">
      {children}
    </kbd>
  );
}
