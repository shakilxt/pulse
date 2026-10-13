import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { ThemeMenu } from "@/components/theme/theme-menu";
import { CurrentSection } from "./current-section";
import { DemoBadge } from "./demo-badge";
import { MobileNav } from "./mobile-nav";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <MobileNav />
        <Link href="/" aria-label="PULSE overview" className="rounded-md text-accent-ink md:hidden">
          <LogoMark className="size-7" />
        </Link>
        <CurrentSection />
        <div className="ml-auto flex items-center gap-2">
          <DemoBadge className="hidden sm:inline-flex" />
          <ThemeMenu />
        </div>
      </div>
    </header>
  );
}
