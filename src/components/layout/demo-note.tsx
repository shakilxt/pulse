import { Leaf } from "lucide-react";
import { cn } from "@/lib/cn";

interface DemoNoteProps {
  className?: string;
}

export function DemoNote({ className }: DemoNoteProps) {
  return (
    <div className={cn("rounded-lg border border-nav-line p-3.5 text-xs leading-relaxed text-nav-ink-muted", className)}>
      <p className="mb-1 flex items-center gap-1.5 font-medium text-nav-ink">
        <Leaf aria-hidden className="size-3.5 text-nav-accent" strokeWidth={1.75} />
        Illustrative data
      </p>
      Every figure in this workspace is fictional and generated for demonstration.
    </div>
  );
}
