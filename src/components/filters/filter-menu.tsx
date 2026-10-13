"use client";

import { startTransition, useOptimistic, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";
import { PARAM } from "@/lib/search-params";
import { useQueryNavigation } from "./use-query-navigation";

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  /** A rendered icon element (`<CircleCheck aria-hidden />`); components can't cross from server to client. */
  icon?: ReactNode;
  /** How many rows this option would show under the other filters, already formatted. */
  count?: string;
}

interface FilterMenuProps<T extends string> {
  /** Field name shown on the trigger and as the menu heading: "Status". */
  label: string;
  /** Query key this filter writes. */
  param: string;
  options: readonly FilterOption<T>[];
  value: T;
  /** The "no filter" option; choosing it removes the key from the URL. */
  defaultValue: T;
  /** Whether a non-default choice gets the "applied filter" look; a sort order is not a filter. */
  highlightActive?: boolean;
  className?: string;
}

/** Trigger styling shared by the table filters; applied filters look different at a glance. */
export function filterTriggerClasses(active: boolean, className?: string): string {
  return cn(
    "inline-flex h-10 shrink-0 items-center justify-between gap-2 rounded-md border px-3 text-sm font-medium whitespace-nowrap text-ink transition-colors [&_svg]:size-4",
    active ? "border-accent-ink/50 bg-sage/50 hover:bg-sage" : "border-line-strong bg-surface hover:bg-surface-sunken",
    className,
  );
}

/** Single-choice filter in a menu. Choosing an option applies it, closes the menu and returns to page 1. */
export function FilterMenu<T extends string>({
  label,
  param,
  options,
  value,
  defaultValue,
  highlightActive = true,
  className,
}: FilterMenuProps<T>) {
  const { navigate, isPending } = useQueryNavigation();
  const [shown, setShown] = useOptimistic(value);
  const current = options.find((option) => option.value === shown);
  const active = highlightActive && shown !== defaultValue;

  function choose(next: T) {
    startTransition(() => {
      setShown(next);
      navigate({ [param]: next === defaultValue ? null : next, [PARAM.page]: null });
    });
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        data-pending={isPending ? "" : undefined}
        // Non-default filters look applied at a glance, alongside the visible "Label: value".
        className={filterTriggerClasses(active, className)}
      >
        <span>
          <span className="text-ink-muted">{label}:</span> {current?.label ?? shown}
        </span>
        <ChevronDown aria-hidden className="text-ink-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={shown}
          onValueChange={(next) => {
            const option = options.find((candidate) => candidate.value === next);
            if (option) choose(option.value);
          }}
        >
          {options.map(({ value: optionValue, label: optionLabel, icon, count }) => (
            <DropdownMenuRadioItem key={optionValue} value={optionValue}>
              {icon}
              <span className="flex-1">{optionLabel}</span>
              {count !== undefined ? (
                <span className="text-xs text-ink-muted tabular">
                  <span className="sr-only">, </span>
                  {count}
                </span>
              ) : null}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
