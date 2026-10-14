import type { Notification } from "@/types/domain";
import { formatDateTime, formatRelativeTime } from "./formatters";

/** What the notifications menu needs, with times formatted on the server against the demo clock. */
export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  category: Notification["category"];
  href: string | null;
  /** Read in the generated data; the visitor can mark more as read. */
  read: boolean;
  createdAt: string;
  /** "3 hours ago", relative to the data's end rather than the wall clock. */
  relativeTime: string;
  /** "Sep 30, 2026, 5:15 PM UTC". */
  timestampLabel: string;
}

export function toNotificationItems(notifications: readonly Notification[], now: string): NotificationItem[] {
  return notifications.map((notification) => ({
    id: notification.id,
    title: notification.title,
    description: notification.description,
    category: notification.category,
    href: notification.href,
    read: notification.read,
    createdAt: notification.createdAt,
    relativeTime: formatRelativeTime(notification.createdAt, now),
    timestampLabel: formatDateTime(notification.createdAt),
  }));
}
