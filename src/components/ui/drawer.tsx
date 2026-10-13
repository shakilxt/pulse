"use client";

import type { ComponentProps, ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/cn";
import { DialogCloseButton, DialogOverlay } from "./dialog";

export const Drawer = DialogPrimitive.Root;

interface DrawerContentProps extends Omit<ComponentProps<typeof DialogPrimitive.Content>, "title"> {
  title: ReactNode;
  /** Short context under the title, announced as the dialog's description. */
  description?: ReactNode;
  /** Optional row of actions or metadata pinned under the header. */
  eyebrow?: ReactNode;
  closeLabel?: string;
  children: ReactNode;
}

/**
 * Right-hand sheet for record details. Full width on phones, a fixed column
 * from `sm`. Header stays put while the body scrolls.
 */
export function DrawerContent({
  title,
  description,
  eyebrow,
  closeLabel = "Close details",
  className,
  children,
  ...props
}: DrawerContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        // Without a description, opt out explicitly so Radix doesn't point at a missing element.
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-line bg-surface text-ink shadow-pop outline-none sm:w-[440px]",
          "data-[state=open]:animate-drawer-in-right",
          className,
        )}
        {...props}
      >
        <header className="flex items-start gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            {eyebrow ? <div className="mb-1.5 text-xs font-medium text-ink-muted">{eyebrow}</div> : null}
            <DialogPrimitive.Title className="text-lg leading-snug font-semibold text-ink">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm text-ink-muted wrap-anywhere">{description}</DialogPrimitive.Description>
            ) : null}
          </div>
          <DialogCloseButton label={closeLabel} className="-mt-1 -mr-2" />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
