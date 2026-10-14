"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Notifications the visitor has marked as read, kept in localStorage so the
 * choice survives a reload. Only demo notification IDs are stored. If storage
 * is unavailable (private mode, blocked), it falls back to memory for the visit.
 */
const STORAGE_KEY = "pulse-read-notifications";

const listeners = new Set<() => void>();
let memoryFallback = "";

function read(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return memoryFallback;
  }
}

function write(value: string): void {
  memoryFallback = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Memory fallback already holds the value.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function parse(raw: string): ReadonlySet<string> {
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value)) return new Set(value.filter((item): item is string => typeof item === "string"));
  } catch {
    // Empty or malformed storage counts as nothing read.
  }
  return new Set();
}

export function useReadNotificationIds(): ReadonlySet<string> {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  return useMemo(() => parse(raw), [raw]);
}

export function markNotificationsRead(ids: readonly string[]): void {
  const next = new Set(parse(read()));
  const before = next.size;
  for (const id of ids) next.add(id);
  if (next.size !== before) write(JSON.stringify([...next].sort()));
}
