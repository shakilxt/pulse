"use client";

import { useSyncExternalStore } from "react";
import { useSavedSettings } from "@/components/settings/settings-store";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * True when the visitor asks for less motion, in the OS or by turning chart
 * animation off in settings. The server assumes reduced motion, so hydration
 * never starts an animation the visitor did not want.
 */
export function useReducedMotion(): boolean {
  const { chartMotion } = useSavedSettings();
  const systemReduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
  return chartMotion === "off" || systemReduced;
}
