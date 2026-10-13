import { cn } from "@/lib/cn";

interface LogoMarkProps {
  className?: string;
}

/** A pulse line drawn as a leaf vein inside a seed-like ring. */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn("size-8", className)}>
      <circle cx="16" cy="16" r="14.25" stroke="var(--nav-accent)" strokeWidth="1.5" />
      <path
        d="M6.5 17h4.25l2.25-5.5 3.75 10 2.5-6.5h6.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="25.5" cy="15" r="1.6" fill="var(--nav-accent)" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  /** Hide the wordmark below this breakpoint (sidebar rail). */
  collapsible?: boolean;
}

export function Logo({ className, collapsible = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span
        className={cn(
          "text-[15px] font-semibold tracking-[0.32em]",
          collapsible && "sr-only xl:not-sr-only",
        )}
      >
        PULSE
      </span>
    </span>
  );
}
