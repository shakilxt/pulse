"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  /** Accessible name for the group, e.g. "Chart metric". */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Arrow keys move focus and choose in one step. Radix only selects on focus
 * when its document-level key listener has already seen the arrow key, which
 * React's handlers outrun on the first press, so selection follows keyboard
 * focus here. Pointer focus is left to the click.
 */
export function isKeyboardFocus(element: Element): boolean {
  return element.matches(":focus-visible");
}

/**
 * A single choice among a few options, shown side by side. It is a radio
 * group: Tab enters it, arrow keys move between options and select them.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onValueChange,
  size = "md",
  className,
}: SegmentedControlProps<T>) {
  return (
    <RadioGroupPrimitive.Root
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        const option = options.find((candidate) => candidate.value === next);
        if (option) onValueChange(option.value);
      }}
      orientation="horizontal"
      className={cn(
        "inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface-sunken p-0.5",
        className,
      )}
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          onFocus={(event) => {
            if (option.value !== value && isKeyboardFocus(event.currentTarget)) onValueChange(option.value);
          }}
          className={cn(
            "shrink-0 rounded-md font-medium whitespace-nowrap text-ink-muted transition-colors hover:text-ink",
            "data-[state=checked]:bg-surface data-[state=checked]:text-ink data-[state=checked]:shadow-hairline data-[state=checked]:ring-1 data-[state=checked]:ring-line",
            size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
          )}
        >
          {option.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
