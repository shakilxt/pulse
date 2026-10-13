import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { LoadingState } from "@/components/ui/loading-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getSettings } from "@/lib/settings.server";

export const metadata: Metadata = {
  title: "Settings",
};

/** The heading is static; the form starts from the settings saved in this browser's cookie. */
export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Interface preferences for this browser. Nothing here updates a real account or a remote service."
      />
      <Suspense fallback={<SettingsSkeleton />}>
        <SavedSettingsForm />
      </Suspense>
    </>
  );
}

async function SavedSettingsForm() {
  return <SettingsForm saved={await getSettings()} />;
}

function SettingsSkeleton() {
  return (
    <LoadingState label="Loading settings" className="mt-7 divide-y divide-line rounded-xl border border-line bg-surface">
      {[0, 1, 2, 3, 4].map((index) => (
        <div key={index} className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-4 w-56" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </LoadingState>
  );
}
