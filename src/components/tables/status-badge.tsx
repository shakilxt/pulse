import { CircleCheck, CircleDashed, CircleDot, CircleX, Clock3, Undo2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CustomerStatus, TransactionStatus } from "@/types/domain";

type Tone = "positive" | "warning" | "danger" | "neutral";

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  tone: Tone;
}

/**
 * One meaning per status across every table and drawer. Each badge pairs an
 * icon and a word with its colour, so status never depends on colour alone.
 */
export const STATUS_META = {
  completed: { label: "Completed", icon: CircleCheck, tone: "positive" },
  pending: { label: "Pending", icon: Clock3, tone: "warning" },
  refunded: { label: "Refunded", icon: Undo2, tone: "neutral" },
  failed: { label: "Failed", icon: CircleX, tone: "danger" },
  active: { label: "Active", icon: CircleDot, tone: "positive" },
  inactive: { label: "Inactive", icon: CircleDashed, tone: "neutral" },
} as const satisfies Record<TransactionStatus | CustomerStatus, StatusMeta>;

export type BadgeStatus = keyof typeof STATUS_META;

const TONE_CLASSES: Record<Tone, string> = {
  positive: "bg-positive-soft text-positive",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-sunken text-ink-muted",
};

export function StatusBadge({ status, className }: { status: BadgeStatus; className?: string }) {
  const { label, icon: Icon, tone } = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full pr-2.5 pl-2 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
      {label}
    </span>
  );
}
