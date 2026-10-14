"use client";

import {
  createContext,
  use,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

export interface RecordPanel {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  content: ReactNode;
}

interface RecordDrawerContextValue {
  open: (id: string, trigger: HTMLElement) => void;
}

const RecordDrawerContext = createContext<RecordDrawerContextValue | null>(null);

interface RecordDrawerProps {
  /**
   * Detail panels for the rows on the current page, rendered on the server
   * and keyed by record ID. Only visible rows are included, so the drawer
   * opens instantly without shipping the dataset.
   */
  panels: Record<string, RecordPanel>;
  /** Names the record type for the close button: "Close transaction details". */
  noun: string;
  children: ReactNode;
}

export function RecordDrawer({ panels, noun, children }: RecordDrawerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // Rows change with filters and pages; a panel that is no longer listed closes.
  const panel = selectedId === null ? undefined : panels[selectedId];

  // Close when the page is hidden by a navigation, so returning never finds it open.
  useLayoutEffect(() => () => setSelectedId(null), []);

  const contextValue: RecordDrawerContextValue = {
    open: (id, trigger) => {
      triggerRef.current = trigger;
      setSelectedId(id);
    },
  };

  return (
    <RecordDrawerContext value={contextValue}>
      {children}
      <Drawer open={panel !== undefined} onOpenChange={(open) => !open && setSelectedId(null)}>
        {panel ? (
          <DrawerContent
            title={panel.title}
            description={panel.description}
            eyebrow={panel.eyebrow}
            closeLabel={`Close ${noun} details`}
            onCloseAutoFocus={(event) => {
              // The opener lives in a table row, not a Radix trigger, so return focus to it by hand.
              const trigger = triggerRef.current;
              if (trigger?.isConnected) {
                event.preventDefault();
                trigger.focus();
              }
            }}
          >
            {panel.content}
          </DrawerContent>
        ) : null}
      </Drawer>
    </RecordDrawerContext>
  );
}

interface RecordDrawerTriggerProps {
  id: string;
  /** Full accessible name: "View transaction TX-100231". */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * The row's primary cell. It is a real button (Tab, Enter, Space), and its
 * hit area stretches over the whole row so a pointer can click anywhere.
 */
export function RecordDrawerTrigger({ id, label, children, className }: RecordDrawerTriggerProps) {
  const context = use(RecordDrawerContext);
  if (!context) throw new Error("RecordDrawerTrigger must be rendered inside a RecordDrawer.");

  return (
    <button
      type="button"
      data-row-trigger=""
      aria-label={label}
      aria-haspopup="dialog"
      onClick={(event) => context.open(id, event.currentTarget)}
      className={cn(
        "text-left font-medium text-ink outline-none hover:underline hover:decoration-line-strong hover:underline-offset-4",
        // The stretched hit area doubles as the focus ring, outlining the whole row.
        "after:absolute after:inset-0 after:rounded-sm after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-focus focus-visible:after:ring-inset",
        className,
      )}
    >
      {children}
    </button>
  );
}
