import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Landscape } from "@/components/brand/landscape";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-canvas">
      <header className="relative z-10 px-6 pt-6 sm:px-10">
        <Link href="/" aria-label="PULSE overview" className="inline-flex rounded-md text-accent-ink">
          <Logo />
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-start px-6 pt-[12vh] sm:px-10 lg:pt-[16vh]">
        <div className="max-w-xl">
          <p className="mb-4 text-xs font-medium tracking-[0.24em] text-gold-ink uppercase">Error 404</p>
          <h1 className="font-serif text-5xl leading-[1.02] font-medium tracking-tight text-ink sm:text-6xl">
            This path fades <em className="text-accent-ink">into the mist.</em>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-muted">
            The page you were looking for doesn&rsquo;t exist in this workspace. It may have moved, or the
            link may be incomplete.
          </p>
          <Link href="/" className={buttonClasses({ variant: "primary", className: "mt-8" })}>
            <ArrowLeft aria-hidden />
            Back to overview
          </Link>
        </div>
      </main>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42vh] min-h-56">
        <Landscape fade="strong" />
      </div>
    </div>
  );
}
