import Link from "next/link";
import { Suspense } from "react";
import { LogoMark } from "@/components/brand/logo";
import { getDataset } from "@/data";
import { formatDate } from "@/lib/formatters";
import { type NotificationItem, toNotificationItems } from "@/lib/notification-items";
import { getSettings } from "@/lib/settings.server";
import { CurrentSection } from "./current-section";
import { DemoBadge } from "./demo-badge";
import { GlobalSearch } from "./global-search";
import { MobileNav } from "./mobile-nav";
import { NotificationsMenu } from "./notifications-menu";
import { ProfileMenu } from "./profile-menu";
import { SavedWorkspaceIdentity, SavedWorkspaceName } from "./saved-workspace-identity";

export function Topbar() {
  const dataset = getDataset();
  const notifications = toNotificationItems(dataset.notifications, dataset.now);
  const asOfLabel = formatDate(dataset.span.to);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <MobileNav identity={<SavedWorkspaceIdentity />} />
        <Link href="/" aria-label="PULSE overview" className="rounded-md text-accent-ink md:hidden">
          <LogoMark className="size-7" />
        </Link>
        <CurrentSection workspace={<SavedWorkspaceName />} />
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <GlobalSearch />
          {/* Phones get the demo note in the navigation drawer instead. */}
          <span className="hidden sm:contents">
            <DemoBadge />
          </span>
          <Suspense fallback={<NotificationsMenu items={null} hiddenCount={0} asOfLabel={asOfLabel} />}>
            <SavedNotificationsMenu items={notifications} asOfLabel={asOfLabel} />
          </Suspense>
          <Suspense fallback={<ProfileMenu workspaceName={null} />}>
            <SavedProfileMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

/** Only the categories switched on in settings; reads a cookie, so it streams in. */
async function SavedNotificationsMenu({ items, asOfLabel }: { items: NotificationItem[]; asOfLabel: string }) {
  const { notifications } = await getSettings();
  const shown = items.filter((item) => notifications[item.category]);
  return <NotificationsMenu items={shown} hiddenCount={items.length - shown.length} asOfLabel={asOfLabel} />;
}

async function SavedProfileMenu() {
  const { workspaceName } = await getSettings();
  return <ProfileMenu workspaceName={workspaceName} />;
}
