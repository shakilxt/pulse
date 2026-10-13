"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { NAV_GROUPS, SETTINGS_NAV_ITEM, isActivePath, type NavItem } from "@/lib/navigation";
import { NAV_ICONS } from "./nav-icons";

type NavLayout = "sidebar" | "drawer";

interface NavLinkProps {
  item: NavItem;
  active: boolean;
  layout: NavLayout;
  onNavigate?: () => void;
}

function NavLink({ item, active, layout, onNavigate }: NavLinkProps) {
  const Icon = NAV_ICONS[item.key];
  const collapsible = layout === "sidebar";

  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onNavigate={onNavigate}
      className={cn(
        "focus-ring-nav group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
        collapsible && "justify-center xl:justify-start",
        active
          ? "bg-nav-active text-nav-active-ink"
          : "text-nav-ink-muted hover:bg-nav-active/60 hover:text-nav-ink",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-2 left-0 w-0.5 rounded-full bg-nav-accent transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon aria-hidden className={cn("size-[18px] shrink-0", active && "text-nav-accent")} strokeWidth={1.75} />
      <span className={cn(collapsible && "sr-only xl:not-sr-only")}>{item.label}</span>
    </Link>
  );

  if (!collapsible) return link;

  return (
    <Tooltip content={item.label} side="right" className="xl:hidden">
      {link}
    </Tooltip>
  );
}

interface NavLinksProps {
  layout: NavLayout;
  onNavigate?: () => void;
}

export function PrimaryNavLinks({ layout, onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  const collapsible = layout === "sidebar";

  return (
    <div className="flex flex-col gap-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} role="group" aria-labelledby={`nav-group-${layout}-${group.label}`}>
          <p
            id={`nav-group-${layout}-${group.label}`}
            className={cn(
              "mb-2 px-3 text-[11px] font-medium tracking-[0.18em] text-nav-ink-muted/80 uppercase",
              collapsible && "sr-only xl:not-sr-only",
            )}
          >
            {group.label}
          </p>
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => (
              <li key={item.key}>
                <NavLink
                  item={item}
                  layout={layout}
                  active={isActivePath(pathname, item.href)}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function SettingsNavLink({ layout, onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  return (
    <NavLink
      item={SETTINGS_NAV_ITEM}
      layout={layout}
      active={isActivePath(pathname, SETTINGS_NAV_ITEM.href)}
      onNavigate={onNavigate}
    />
  );
}
