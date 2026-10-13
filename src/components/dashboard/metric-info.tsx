"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MetricInfoProps {
  label: string;
  description: string;
}

/** A click-to-open definition, so it works for touch and keyboard as well as a pointer. */
export function MetricInfo({ label, description }: MetricInfoProps) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`How ${label.toLowerCase()} is calculated`}
        className="-m-1.5 grid size-8 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
      >
        <Info aria-hidden className="size-4" strokeWidth={1.75} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3 text-sm leading-relaxed text-ink">
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-ink-muted">{description}</p>
      </PopoverContent>
    </Popover>
  );
}
