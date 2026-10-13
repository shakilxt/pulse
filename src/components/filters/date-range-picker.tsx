"use client";

import { startTransition, useId, useOptimistic, useRef, useState, type FormEvent } from "react";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { type DateRangeField, validateDateRangeInput } from "@/lib/date-range-input";
import { type DateRange, RANGE_PRESET_LABELS, RANGE_PRESETS, type RangePreset, resolvePresetRange } from "@/lib/dates";
import { formatDate, formatDateRange } from "@/lib/formatters";
import { type DateRangeState, PARAM, dateRangeToParams } from "@/lib/search-params";
import { useQueryNavigation } from "./use-query-navigation";

interface DateRangePickerProps {
  /** The applied range, parsed from the URL on the server. */
  value: DateRangeState;
  /** First and last day with data; custom dates must fall inside. */
  bounds: DateRange;
  defaultPreset: RangePreset;
  /** Which edge of the trigger the panel lines up with. */
  align?: "start" | "end";
  className?: string;
}

/**
 * Preset ranges apply in one click; a custom range is a small form with
 * validation messages tied to each date field. The comparison mode in the URL
 * is kept as it is, and tables return to page 1.
 */
export function DateRangePicker({ value, bounds, defaultPreset, align = "start", className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const { navigate, isPending } = useQueryNavigation();
  const [shown, setShown] = useOptimistic(value);

  function apply(next: DateRangeState) {
    setOpen(false);
    startTransition(() => {
      setShown(next);
      navigate({ ...dateRangeToParams(next, defaultPreset), [PARAM.page]: null });
    });
  }

  const presetLabel = shown.preset === "custom" ? "Custom range" : RANGE_PRESET_LABELS[shown.preset];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-pending={isPending ? "" : undefined}
        aria-label={`Date range: ${presetLabel}, ${formatDateRange(shown.range)}. Change date range`}
        className={cn(
          "inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-md border border-line-strong bg-surface py-1.5 pr-2.5 pl-3 text-left transition-colors hover:bg-surface-sunken [&_svg]:size-4 [&_svg]:shrink-0",
          className,
        )}
      >
        <CalendarDays aria-hidden className="text-accent-ink" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-sm font-medium text-ink">{presetLabel}</span>
          <span className="text-xs font-normal text-ink-muted tabular">{formatDateRange(shown.range)}</span>
        </span>
        <ChevronDown aria-hidden className="ml-1 text-ink-muted" />
      </PopoverTrigger>
      <PopoverContent align={align} className="w-[min(calc(100vw-2rem),340px)] p-0">
        <PresetList
          items={RANGE_PRESETS.map((preset) => ({
            value: preset,
            label: RANGE_PRESET_LABELS[preset],
            range: resolvePresetRange(preset, bounds.to),
          }))}
          current={shown.preset}
          onSelect={(preset) =>
            apply({ preset, range: resolvePresetRange(preset, bounds.to), comparison: shown.comparison })
          }
        />
        {/* The popover unmounts when closed, so each opening starts from the applied range. */}
        <CustomRangeForm
          initial={shown.range}
          bounds={bounds}
          onApply={(range) => apply({ preset: "custom", range, comparison: shown.comparison })}
        />
      </PopoverContent>
    </Popover>
  );
}

export interface PresetItem<P extends string> {
  value: P;
  label: string;
  range: DateRange;
}

/** One-click ranges, each showing the dates it resolves to. */
export function PresetList<P extends string>({
  items,
  current,
  onSelect,
}: {
  items: readonly PresetItem<P>[];
  current: P | "custom";
  onSelect: (preset: P) => void;
}) {
  const headingId = useId();
  return (
    <div className="p-1.5">
      <p id={headingId} className="px-2.5 pt-1.5 pb-1 text-xs font-medium tracking-wide text-ink-muted uppercase">
        Quick ranges
      </p>
      <ul aria-labelledby={headingId} className="flex flex-col">
        {items.map(({ value: preset, label, range }) => {
          const selected = preset === current;
          return (
            <li key={preset}>
              <button
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(preset)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-sage",
                  selected && "font-medium",
                )}
              >
                <span className="flex-1">{label}</span>
                <span className="text-xs text-ink-muted tabular">{formatDateRange(range, "short")}</span>
                <Check aria-hidden className={cn("size-4 shrink-0 text-ink", !selected && "invisible")} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** A from–to pair of native date inputs, validated against the data span with messages tied to each field. */
export function CustomRangeForm({
  initial,
  bounds,
  onApply,
}: {
  initial: DateRange;
  bounds: DateRange;
  onApply: (range: DateRange) => void;
}) {
  const baseId = useId();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [errors, setErrors] = useState<Partial<Record<DateRangeField, string>>>({});
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateDateRangeInput(from, to, bounds);
    if (result.ok) {
      setErrors({});
      onApply(result.range);
      return;
    }
    setErrors(result.errors);
    (result.errors.from ? fromRef : toRef).current?.focus();
  }

  const fields = [
    { field: "from", label: "Start date", value: from, set: setFrom, ref: fromRef },
    { field: "to", label: "End date", value: to, set: setTo, ref: toRef },
  ] as const;

  return (
    <form noValidate onSubmit={handleSubmit} className="border-t border-line p-4" aria-labelledby={`${baseId}-title`}>
      <p id={`${baseId}-title`} className="text-xs font-medium tracking-wide text-ink-muted uppercase">
        Custom range
      </p>
      <p id={`${baseId}-hint`} className="mt-1 text-xs text-ink-muted">
        Data runs from {formatDate(bounds.from)} to {formatDate(bounds.to)}.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {fields.map(({ field, label, value, set, ref }) => {
          const inputId = `${baseId}-${field}`;
          const error = errors[field];
          return (
            <div key={field} className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={inputId} className="text-sm font-medium text-ink">
                {label}
              </label>
              <input
                ref={ref}
                id={inputId}
                type="date"
                value={value}
                min={bounds.from}
                max={bounds.to}
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${inputId}-error` : `${baseId}-hint`}
                onChange={(event) => {
                  set(event.target.value);
                  if (error) setErrors((current) => ({ ...current, [field]: undefined }));
                }}
                className="h-10 w-full min-w-0 rounded-md border border-line-strong bg-surface px-2.5 text-sm text-ink tabular aria-invalid:border-danger"
              />
              {error ? (
                <p id={`${inputId}-error`} className="text-xs leading-snug text-danger">
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <Button type="submit" variant="primary" size="sm" className="mt-4 w-full">
        Apply custom range
      </Button>
    </form>
  );
}
