"use client";

import Link from "next/link";
import { Info, Monitor, Moon, Settings2, Sun, type LucideIcon } from "lucide-react";
import { setThemePreference, useThemePreference } from "@/components/theme/theme-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isThemePreference, type ThemePreference } from "@/lib/theme";
import { WORKSPACE } from "@/lib/workspace";

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: LucideIcon }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * The demo persona, a link to settings and the theme choice. There is no
 * account, so there is deliberately no sign-out.
 */
export function ProfileMenu() {
  const theme = useThemePreference();
  const { profile } = WORKSPACE;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={`Profile and preferences for ${profile.name}`}
        className="grid size-10 shrink-0 place-items-center rounded-full transition-opacity hover:opacity-85"
      >
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-full bg-botanical text-xs font-semibold tracking-wide text-nav-ink ring-1 ring-gold/60 ring-offset-2 ring-offset-canvas"
        >
          {profile.initials}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <div className="flex items-center gap-3 px-2.5 pt-2 pb-2.5">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full bg-botanical text-xs font-semibold text-nav-ink"
          >
            {profile.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{profile.name}</p>
            <p className="truncate text-xs text-ink-muted">
              {profile.role} · {WORKSPACE.name}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings2 aria-hidden />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => {
            if (isThemePreference(value)) setThemePreference(value);
          }}
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon aria-hidden />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <p className="flex gap-2 px-2.5 py-2 text-xs leading-relaxed text-ink-muted">
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          Demo profile. There is no account or sign-in.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
