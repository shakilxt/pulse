import { describe, expect, it } from "vitest";
import type { Notification } from "@/types/domain";
import { toNotificationItems } from "./notification-items";

const notification: Notification = {
  id: "NT-002",
  title: "Payment failed",
  description: "A demo charge didn't go through.",
  createdAt: "2026-09-30T14:40:00Z",
  read: false,
  category: "payments",
  href: "/transactions?q=TX-100001",
};

describe("toNotificationItems", () => {
  it("formats times against the demo clock, not the wall clock", () => {
    const [item] = toNotificationItems([notification], "2026-09-30T17:40:00Z");
    expect(item).toEqual({
      ...notification,
      relativeTime: "3 hours ago",
      timestampLabel: "Sep 30, 2026, 2:40 PM UTC",
    });
  });

  it("keeps the generated order", () => {
    const items = toNotificationItems(
      [notification, { ...notification, id: "NT-001", createdAt: "2026-09-28T08:00:00Z" }],
      "2026-09-30T17:40:00Z",
    );
    expect(items.map((item) => [item.id, item.relativeTime])).toEqual([
      ["NT-002", "3 hours ago"],
      ["NT-001", "2 days ago"],
    ]);
  });
});
