"use client";

import type { ComponentProps } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "@/lib/cn";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({
  className,
  sideOffset = 8,
  align = "start",
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={16}
        className={cn(
          "z-50 max-h-(--radix-popover-content-available-height) overflow-y-auto rounded-lg border border-line bg-surface-raised text-ink shadow-pop outline-none",
          "origin-(--radix-popover-content-transform-origin) data-[state=open]:animate-pop",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
