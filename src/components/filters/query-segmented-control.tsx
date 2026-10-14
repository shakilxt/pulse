"use client";

import { startTransition, useOptimistic } from "react";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import { useQueryNavigation } from "./use-query-navigation";

interface QuerySegmentedControlProps<T extends string> {
  label: string;
  param: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  /** Choosing the default removes the key, keeping URLs short. */
  defaultValue: T;
  size?: "sm" | "md";
  className?: string;
}

/** A segmented control bound to one query key, e.g. the analytics chart metric (`?metric=`). */
export function QuerySegmentedControl<T extends string>({
  param,
  value,
  defaultValue,
  ...props
}: QuerySegmentedControlProps<T>) {
  const { navigate, isPending } = useQueryNavigation();
  const [shown, setShown] = useOptimistic(value);

  return (
    <div data-pending={isPending ? "" : undefined} className="max-w-full">
      <SegmentedControl
        {...props}
        value={shown}
        onValueChange={(next) => {
          startTransition(() => {
            setShown(next);
            navigate({ [param]: next === defaultValue ? null : next });
          });
        }}
      />
    </div>
  );
}
