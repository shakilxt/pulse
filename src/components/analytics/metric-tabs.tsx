"use client";

import { startTransition, useOptimistic } from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { ChangeBadge } from "@/components/dashboard/change-badge";
import { useQueryNavigation } from "@/components/filters/use-query-navigation";
import { isKeyboardFocus } from "@/components/ui/segmented-control";
import type { ChangeSentiment } from "@/lib/metrics";
import type { Change } from "@/lib/calculations";
import { PARAM } from "@/lib/search-params";

export interface MetricTabOption<T extends string> {
  value: T;
  label: string;
  /** The period's figure, already formatted. */
  figure: string;
  change: Change;
  sentiment: ChangeSentiment;
  digits: number;
}

interface MetricTabsProps<T extends string> {
  options: readonly MetricTabOption<T>[];
  value: T;
  defaultValue: T;
}

/**
 * Chooses the chart's metric (`?metric=`). Each option doubles as a summary
 * tile: its figure and change for the period. It is a radio group, so Tab
 * enters it and the arrow keys move between metrics. The choice shows at
 * once while the chart for it loads.
 */
export function MetricTabs<T extends string>({ options, value, defaultValue }: MetricTabsProps<T>) {
  const { navigate, isPending } = useQueryNavigation();
  const [shown, setShown] = useOptimistic(value);

  function select(next: T) {
    startTransition(() => {
      setShown(next);
      navigate({ [PARAM.metric]: next === defaultValue ? null : next });
    });
  }

  return (
    <RadioGroupPrimitive.Root
      aria-label="Chart metric"
      value={shown}
      orientation="horizontal"
      data-pending={isPending ? "trend" : undefined}
      onValueChange={(next) => {
        const option = options.find((candidate) => candidate.value === next);
        if (option) select(option.value);
      }}
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4"
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          onFocus={(event) => {
            if (option.value !== shown && isKeyboardFocus(event.currentTarget)) select(option.value);
          }}
          className="group relative flex min-w-0 flex-col items-start bg-surface px-4 pt-4 pb-3.5 text-left transition-colors hover:bg-surface-sunken data-[state=checked]:bg-sage/45 focus-visible:z-10 focus-visible:-outline-offset-2"
        >
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[3px] bg-transparent transition-colors group-data-[state=checked]:bg-chart-1"
          />
          <span className="text-sm font-medium text-ink-muted group-data-[state=checked]:text-ink">{option.label}</span>
          <span className="mt-1.5 text-xl font-semibold tracking-tight text-ink tabular sm:text-2xl">{option.figure}</span>
          <ChangeBadge change={option.change} sentiment={option.sentiment} digits={option.digits} className="mt-2" />
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
