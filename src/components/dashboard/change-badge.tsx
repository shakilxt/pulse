import { Minus, MoveDownRight, MoveUpRight } from "lucide-react";
import type { Change } from "@/lib/calculations";
import { changeDirection } from "@/lib/calculations";
import { cn } from "@/lib/cn";
import { describeChange, formatChange } from "@/lib/formatters";
import type { ChangeSentiment } from "@/lib/metrics";

const SENTIMENT_CLASSES: Record<ChangeSentiment, string> = {
  positive: "bg-positive-soft text-positive",
  negative: "bg-danger-soft text-danger",
  neutral: "bg-surface-sunken text-ink-muted",
};

interface ChangeBadgeProps {
  change: Change;
  /** Whether the move is good news for this metric; colours follow it, the arrow follows the direction. */
  sentiment: ChangeSentiment;
  digits?: number;
  className?: string;
}

/** "+6.3%" with an arrow. Direction is carried by the arrow and sign, never by colour alone. */
export function ChangeBadge({ change, sentiment, digits = 1, className }: ChangeBadgeProps) {
  const direction = changeDirection(change);
  const Icon = direction === "up" ? MoveUpRight : direction === "down" ? MoveDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap tabular",
        SENTIMENT_CLASSES[sentiment],
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={2.25} />
      <span aria-hidden>{change.kind === "unavailable" ? "No data" : formatChange(change, digits)}</span>
      <span className="sr-only">{describeChange(change, digits)}</span>
    </span>
  );
}
