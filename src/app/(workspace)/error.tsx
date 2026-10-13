"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto mt-16 max-w-md text-center">
      <TriangleAlert aria-hidden className="mx-auto mb-4 size-6 text-warning" strokeWidth={1.75} />
      <h1 className="font-serif text-3xl font-medium text-ink">This view didn&rsquo;t load</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Something went wrong while preparing this page. Your preferences are unaffected.
      </p>
      <Button variant="primary" className="mt-6" onClick={() => retry()}>
        <RotateCcw aria-hidden />
        Try again
      </Button>
    </div>
  );
}
