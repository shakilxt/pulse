import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, eyebrow, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn("flex flex-col gap-5 border-b border-line pb-7 md:flex-row md:items-end md:justify-between", className)}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-medium tracking-[0.2em] text-gold-ink uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight text-ink sm:text-[44px]">{title}</h1>
        {description ? <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
