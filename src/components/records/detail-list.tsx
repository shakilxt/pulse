import type { ReactNode } from "react";

/** Label and value pairs in a drawer, ruled like a small table. */
export function DetailList({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-line rounded-lg border border-line">{children}</dl>;
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 px-4 py-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  );
}
