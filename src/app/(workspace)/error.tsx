"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

export default function WorkspaceError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      size="page"
      title="This view didn’t load"
      description="Something went wrong while preparing this page. Your preferences are unaffected."
      action={
        <Button variant="primary" onClick={() => retry()}>
          <RotateCcw aria-hidden />
          Try again
        </Button>
      }
    />
  );
}
