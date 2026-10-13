"use client";

import type { ComponentProps, ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("text-lg font-semibold text-ink", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm leading-relaxed text-ink-muted", className)} {...props} />;
}

export function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn("fixed inset-0 z-40 bg-overlay data-[state=open]:animate-fade-in", className)}
      {...props}
    />
  );
}

/** Icon-only close control used in dialog and drawer headers. */
export function DialogCloseButton({ label = "Close", className }: { label?: string; className?: string }) {
  return (
    <DialogPrimitive.Close
      aria-label={label}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink",
        className,
      )}
    >
      <X aria-hidden className="size-[18px]" />
    </DialogPrimitive.Close>
  );
}

interface DialogContentProps extends ComponentProps<typeof DialogPrimitive.Content> {
  children: ReactNode;
}

/** Centred modal. Radix traps focus, closes on Escape and restores focus to the trigger. */
export function DialogContent({ className, children, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-[12vh] left-1/2 z-50 w-[min(calc(100vw-2rem),560px)] -translate-x-1/2 rounded-xl border border-line bg-surface-raised text-ink shadow-pop outline-none",
          "data-[state=open]:animate-dialog-in",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
