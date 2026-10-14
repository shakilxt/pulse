"use client";

import { useLayoutEffect } from "react";
import { applyThemePreference, readStoredThemePreference } from "./theme-store";

/**
 * The inline head script applies the theme before first paint. In development,
 * React Strict Mode remounts <html> and clears attributes it does not manage,
 * so re-apply the stored preference here. In production this is a no-op.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyThemePreference(readStoredThemePreference());
  }, []);

  return null;
}
