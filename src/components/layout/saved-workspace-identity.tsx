import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getSettings } from "@/lib/settings.server";
import { WorkspaceIdentity } from "./workspace-identity";

async function SavedName({ className }: { className?: string }) {
  const { workspaceName } = await getSettings();
  return <WorkspaceIdentity name={workspaceName} className={className} />;
}

/** The workspace identity with the name saved in settings, streamed in because it reads a cookie. */
export function SavedWorkspaceIdentity({ className }: { className?: string }) {
  return (
    <Suspense fallback={<WorkspaceIdentity name={null} className={className} />}>
      <SavedName className={className} />
    </Suspense>
  );
}

async function SavedNameText() {
  const { workspaceName } = await getSettings();
  return workspaceName;
}

/** Just the saved workspace name as text, for the breadcrumb. */
export function SavedWorkspaceName() {
  return (
    <Suspense fallback={<Skeleton className="inline-block h-4 w-24 align-middle" />}>
      <SavedNameText />
    </Suspense>
  );
}
