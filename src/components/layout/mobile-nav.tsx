"use client";

import { type ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { DemoNote } from "./demo-note";
import { PrimaryNavLinks, SettingsNavLink } from "./nav-links";

interface MobileNavProps {
  /** The workspace identity, rendered on the server because it reads saved settings. */
  identity: ReactNode;
}

export function MobileNav({ identity }: MobileNavProps) {
  const pathname = usePathname();
  // Track the path the drawer was opened on: any route change (link, back/forward) closes it.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const close = () => setOpenedOn(null);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => setOpenedOn(next ? pathname : null)}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
          <Menu aria-hidden />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-overlay data-[state=open]:animate-fade-in md:hidden" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col bg-nav text-nav-ink shadow-pop data-[state=open]:animate-drawer-in-left md:hidden"
        >
          <div className="flex h-16 items-center justify-between px-5">
            <Logo />
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className="focus-ring-nav grid size-10 place-items-center rounded-md text-nav-ink-muted hover:bg-nav-active hover:text-nav-ink"
                aria-label="Close navigation"
              >
                <X aria-hidden className="size-5" />
              </button>
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <nav aria-label="Primary" className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pt-2 pb-6">
            {identity}
            <PrimaryNavLinks layout="drawer" onNavigate={close} />
            <div className="mt-auto flex flex-col gap-4">
              <DemoNote />
              <SettingsNavLink layout="drawer" onNavigate={close} />
            </div>
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
