import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DemoNote } from "./demo-note";
import { PrimaryNavLinks, SettingsNavLink } from "./nav-links";
import { SavedWorkspaceIdentity } from "./saved-workspace-identity";

/** Icon rail from md, full sidebar from xl. Hidden below md (MobileNav takes over). */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[76px] shrink-0 flex-col border-r border-nav-line bg-nav text-nav-ink md:flex xl:w-[264px]">
      <div className="flex h-16 items-center justify-center px-4 xl:justify-start xl:px-6">
        <Link href="/" className="focus-ring-nav rounded-md text-nav-ink" aria-label="PULSE overview">
          <Logo collapsible />
        </Link>
      </div>

      <TooltipProvider delayDuration={150}>
        <nav aria-label="Primary" className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 pt-4 pb-5 xl:px-4">
          <SavedWorkspaceIdentity className="hidden xl:flex" />
          <PrimaryNavLinks layout="sidebar" />
          <div className="mt-auto flex flex-col gap-4">
            <DemoNote className="hidden xl:block" />
            <SettingsNavLink layout="sidebar" />
          </div>
        </nav>
      </TooltipProvider>
    </aside>
  );
}
