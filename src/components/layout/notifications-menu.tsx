"use client";

import Link from "next/link";
import { Bell, CheckCheck, CreditCard, FileText, UserRound, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";
import type { NotificationItem } from "@/lib/notification-items";
import type { NotificationCategory } from "@/types/domain";
import { markNotificationsRead, useReadNotificationIds } from "./notification-read-store";

const CATEGORY_ICONS: Record<NotificationCategory, LucideIcon> = {
  payments: CreditCard,
  customers: UserRound,
  reports: FileText,
};

interface NotificationsMenuProps {
  items: NotificationItem[];
  /** The data's last day, which relative times are measured from. */
  asOfLabel: string;
}

export function NotificationsMenu({ items, asOfLabel }: NotificationsMenuProps) {
  const readIds = useReadNotificationIds();
  const isUnread = (item: NotificationItem) => !item.read && !readIds.has(item.id);
  const unread = items.filter(isUnread);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread.length > 0 ? `Notifications, ${unread.length} unread` : "Notifications"}
        >
          <Bell aria-hidden />
          {unread.length > 0 ? (
            <span
              aria-hidden
              className="absolute top-1 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-on-primary tabular ring-2 ring-canvas"
            >
              {unread.length}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[min(calc(100vw-2rem),384px)] p-0">
        <div className="flex items-center justify-between gap-3 py-2 pr-1.5 pl-4">
          <p className="text-sm font-semibold text-ink">Notifications</p>
          <DropdownMenuItem
            disabled={unread.length === 0}
            onSelect={(event) => {
              // Keep the menu open so the change is visible.
              event.preventDefault();
              markNotificationsRead(unread.map((item) => item.id));
            }}
            className="py-1.5 text-xs font-medium text-accent-ink"
          >
            <CheckCheck aria-hidden />
            Mark all as read
          </DropdownMenuItem>
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-[min(420px,60vh)] overflow-y-auto p-1.5">
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} unread={isUnread(item)} />
          ))}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <p className="px-4 py-3 text-xs leading-relaxed text-ink-muted">
          Demo notifications drawn from the sample data, timed relative to {asOfLabel}. Nothing is sent anywhere.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({ item, unread }: { item: NotificationItem; unread: boolean }) {
  const Icon = CATEGORY_ICONS[item.category];
  const body = (
    <>
      <span
        aria-hidden
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-line bg-surface text-accent-ink"
      >
        <Icon className="size-4 text-accent-ink!" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className={cn("flex-1 text-sm leading-snug text-ink", unread ? "font-semibold" : "font-medium")}>
            {unread ? <span className="sr-only">Unread: </span> : null}
            {item.title}
          </span>
          {unread ? <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" /> : null}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-ink-muted">{item.description}</span>
        <time dateTime={item.createdAt} title={item.timestampLabel} className="mt-1 block text-xs text-ink-muted">
          {item.relativeTime}
        </time>
      </span>
    </>
  );

  const classes = "items-start gap-3 px-2.5 py-2.5 [&_svg]:size-4";
  const markRead = () => markNotificationsRead([item.id]);

  if (item.href) {
    return (
      <DropdownMenuItem asChild className={classes} onSelect={markRead}>
        <Link href={item.href}>{body}</Link>
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuItem className={classes} onSelect={markRead}>
      {body}
    </DropdownMenuItem>
  );
}
