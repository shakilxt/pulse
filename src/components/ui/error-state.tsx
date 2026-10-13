import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

interface ErrorStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Page-level errors use the serif display heading; panel errors stay compact. */
  size?: "page" | "panel";
  className?: string;
}

/** Announced on appearance. Never shows raw error details to the visitor. */
export function ErrorState({ title, description, action, size = "panel", className }: ErrorStateProps) {
  const page = size === "page";
  return (
    <div role="alert" className={cn("flex flex-col items-center text-center", page ? "mx-auto mt-16 max-w-md" : "px-6 py-10", className)}>
      <TriangleAlert aria-hidden className={cn("mb-4 text-warning", page ? "size-6" : "size-5")} strokeWidth={1.75} />
      {page ? (
        <h1 className="font-serif text-3xl font-medium text-ink">{title}</h1>
      ) : (
        <p className="text-base font-semibold text-ink">{title}</p>
      )}
      {description ? <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
