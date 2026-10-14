"use client";

import { useMemo, useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, type Settings, readSettingsFromCookieString, serializeSettingsCookie } from "@/lib/settings";

/**
 * The saved settings as the browser sees them. The server reads the same
 * cookie for the parts it renders (currency, period, names); client-only
 * behaviour such as chart motion reads it here.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSavedSettings(): Settings {
  // The cookie string is a primitive, so the snapshot stays stable between changes.
  const cookie = useSyncExternalStore(
    subscribe,
    () => document.cookie,
    () => "",
  );
  return useMemo(() => (cookie ? readSettingsFromCookieString(cookie) : DEFAULT_SETTINGS), [cookie]);
}

export function readSavedSettings(): Settings {
  return readSettingsFromCookieString(document.cookie);
}

export function writeSavedSettings(settings: Settings): void {
  document.cookie = serializeSettingsCookie(settings);
  for (const listener of listeners) listener();
}
