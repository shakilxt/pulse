import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { getDataset } from "@/data";
import { formatDate } from "@/lib/formatters";
import { toNotificationItems } from "@/lib/notification-items";
import { CurrentSection } from "./current-section";
import { DemoBadge } from "./demo-badge";
import { GlobalSearch } from "./global-search";
import { MobileNav } from "./mobile-nav";
import { NotificationsMenu } from "./notifications-menu";
import { ProfileMenu } from "./profile-menu";

export function Topbar() {
  const dataset = getDataset();
  const notifications = toNotificationItems(dataset.notifications, dataset.now);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <MobileNav />
        <Link href="/" aria-label="PULSE overview" className="rounded-md text-accent-ink md:hidden">
          <LogoMark className="size-7" />
        </Link>
        <CurrentSection />
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <GlobalSearch />
          {/* Phones get the demo note in the navigation drawer instead. */}
          <span className="hidden sm:contents">
            <DemoBadge />
          </span>
          <NotificationsMenu items={notifications} asOfLabel={formatDate(dataset.span.to)} />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
