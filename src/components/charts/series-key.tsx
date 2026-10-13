import { cn } from "@/lib/cn";

export type SeriesMark = "line" | "dashed" | "bar" | "dot";

/** The small colour key beside a series name. It mirrors the mark: a stroke for lines, a block for bars and areas, a dot for a marked point. */
export function SeriesKey({ color, mark, className }: { color: string; mark: SeriesMark; className?: string }) {
  if (mark === "bar" || mark === "dot") {
    return (
      <span
        aria-hidden
        className={cn("inline-block size-2.5 shrink-0", mark === "dot" ? "rounded-full" : "rounded-[3px]", className)}
        style={{ backgroundColor: color }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn("inline-block w-3.5 shrink-0 border-t-2", mark === "dashed" && "border-dashed", className)}
      style={{ borderColor: color }}
    />
  );
}

export interface LegendItem {
  label: string;
  color: string;
  mark: SeriesMark;
  /** Extra detail after the label, such as the comparison dates. */
  detail?: string;
}

/** Always present for two or more series, so identity never rests on colour alone. */
export function ChartLegend({ items, className }: { items: readonly LegendItem[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <SeriesKey color={item.color} mark={item.mark} />
          <span>
            <span className="font-medium text-ink">{item.label}</span>
            {item.detail ? <span className="tabular"> · {item.detail}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
