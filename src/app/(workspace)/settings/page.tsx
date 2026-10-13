import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PlannedView } from "@/components/layout/planned-view";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Display preferences for this browser. Nothing here updates a real account."
      />
      <PlannedView
        phase={7}
        items={[
          "Workspace preferences",
          "Appearance and theme",
          "Display currency",
          "Notification preferences",
          "Display options",
        ]}
      />
    </>
  );
}
