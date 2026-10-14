"use client";

import { startTransition, useOptimistic, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type DateRange, RANGE_PRESET_LABELS } from "@/lib/dates";
import { formatDateRange } from "@/lib/formatters";
import {
  ALL_DATES,
  DATE_FILTER_PRESETS,
  type DateFilterPreset,
  type DateFilterState,
  PARAM,
  dateFilterToParams,
  resolveDateFilterPreset,
} from "@/lib/search-params";
import { CustomRangeForm, PresetList } from "./date-range-picker";
import { filterTriggerClasses } from "./filter-menu";
import { useQueryNavigation } from "./use-query-navigation";

const ALL_DATES_LABEL = "All dates";

function presetLabel(preset: DateFilterPreset): string {
  return preset === ALL_DATES ? ALL_DATES_LABEL : RANGE_PRESET_LABELS[preset];
}

interface DateFilterProps {
  /** The applied filter, parsed from the URL on the server. */
  value: DateFilterState;
  /** First and last day with data. */
  bounds: DateRange;
  className?: string;
}

/**
 * Date filter for record tables. It sits in the toolbar beside the other
 * filters and looks like them, starts from all dates, and returns to page 1.
 */
export function DateFilter({ value, bounds, className }: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const { navigate, isPending } = useQueryNavigation();
  const [shown, setShown] = useOptimistic(value);

  function apply(next: DateFilterState) {
    setOpen(false);
    startTransition(() => {
      setShown(next);
      navigate({ ...dateFilterToParams(next), [PARAM.page]: null });
    });
  }

  const rangeText = formatDateRange(shown.range);
  const label = shown.preset === "custom" ? rangeText : presetLabel(shown.preset);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-pending={isPending ? "" : undefined}
        aria-label={shown.preset === "custom" ? `Date: ${label}. Change dates` : `Date: ${label}, ${rangeText}. Change dates`}
        className={filterTriggerClasses(shown.preset !== ALL_DATES, className)}
      >
        <CalendarDays aria-hidden className="text-ink-muted" />
        <span className="flex-1 text-left tabular">
          <span className="text-ink-muted">Date:</span> {label}
        </span>
        <ChevronDown aria-hidden className="text-ink-muted" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(calc(100vw-2rem),340px)] p-0">
        <PresetList
          items={DATE_FILTER_PRESETS.map((preset) => ({
            value: preset,
            label: presetLabel(preset),
            range: resolveDateFilterPreset(preset, bounds),
          }))}
          current={shown.preset}
          onSelect={(preset) => apply({ preset, range: resolveDateFilterPreset(preset, bounds) })}
        />
        <CustomRangeForm initial={shown.range} bounds={bounds} onApply={(range) => apply({ preset: "custom", range })} />
      </PopoverContent>
    </Popover>
  );
}
