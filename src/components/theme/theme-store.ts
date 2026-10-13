"use client";

import { useSyncExternalStore } from "react";
import { readThemeFromCookieString, serializeThemeCookie, type ThemePreference } from "@/lib/theme";

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ThemePreference {
  return readThemeFromCookieString(document.cookie);
}

function getServerSnapshot(): ThemePreference {
  return "system";
}

export function applyThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", preference);
  }
}

export function setThemePreference(preference: ThemePreference): void {
  applyThemePreference(preference);
  document.cookie = serializeThemeCookie(preference);
  for (const listener of listeners) listener();
}

export function readStoredThemePreference(): ThemePreference {
  return getSnapshot();
}

/** Current theme preference, kept in sync across every component that reads it. */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
