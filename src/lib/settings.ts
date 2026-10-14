/**
 * Interface preferences for the demo, kept in one first-party cookie so the
 * server can render pages in the chosen currency and period on the first
 * request. They are harmless display choices: nothing here identifies the
 * visitor, and nothing is sent to an account or remote service.
 *
 * The theme keeps its own cookie, which the head script reads before paint.
 */

import { NOTIFICATION_CATEGORIES, type NotificationCategory } from "@/types/domain";
import { RANGE_PRESETS, type RangePreset } from "./dates";
import { BASE_CURRENCY, type CurrencyCode, isCurrencyCode } from "./money";
import { WORKSPACE } from "./workspace";

export const SETTINGS_COOKIE = "pulse-settings";
export const SETTINGS_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** "page" keeps each page's own default period (30 days on Overview, 90 on Analytics…). */
export const PAGE_DEFAULT_PERIOD = "page";
export const DEFAULT_PERIOD_OPTIONS = [PAGE_DEFAULT_PERIOD, ...RANGE_PRESETS] as const;
export type DefaultPeriod = (typeof DEFAULT_PERIOD_OPTIONS)[number];

export const CHART_MOTION_OPTIONS = ["system", "off"] as const;
export type ChartMotion = (typeof CHART_MOTION_OPTIONS)[number];

export interface Settings {
  workspaceName: string;
  currency: CurrencyCode;
  defaultPeriod: DefaultPeriod;
  /** "system" animates charts unless the OS asks for reduced motion; "off" never animates. */
  chartMotion: ChartMotion;
  /** Categories shown in the notifications menu. */
  notifications: Record<NotificationCategory, boolean>;
}

export const DEFAULT_SETTINGS: Settings = {
  workspaceName: WORKSPACE.name,
  currency: BASE_CURRENCY,
  defaultPeriod: PAGE_DEFAULT_PERIOD,
  chartMotion: "system",
  notifications: { payments: true, customers: true, reports: true },
};

// ---------------------------------------------------------------------------
// Validation

export const WORKSPACE_NAME_MIN = 2;
export const WORKSPACE_NAME_MAX = 40;
/** Letters (any script), digits, spaces and a little punctuation. */
const WORKSPACE_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} &'’.,-]*$/u;

/** Trims and collapses runs of spaces. */
export function normalizeWorkspaceName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** A message describing what is wrong with a workspace name, or null when it is fine. */
export function validateWorkspaceName(value: string): string | null {
  const name = normalizeWorkspaceName(value);
  if (name.length === 0) return "Enter a workspace name.";
  if (name.length < WORKSPACE_NAME_MIN) return `Use at least ${WORKSPACE_NAME_MIN} characters.`;
  if (name.length > WORKSPACE_NAME_MAX) return `Use ${WORKSPACE_NAME_MAX} characters or fewer.`;
  if (!WORKSPACE_NAME_PATTERN.test(name)) {
    return "Start with a letter or number, and use only letters, numbers, spaces and & ' . , -";
  }
  return null;
}

export type SettingsErrors = Partial<Record<keyof Settings, string>>;

export function validateSettings(settings: Settings): SettingsErrors {
  const errors: SettingsErrors = {};
  const nameError = validateWorkspaceName(settings.workspaceName);
  if (nameError) errors.workspaceName = nameError;
  return errors;
}

// ---------------------------------------------------------------------------
// Cookie format

function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}

/**
 * The cookie holds a query string ("currency=EUR&period=90d&notify=payments.reports")
 * that has been percent-encoded once more for the cookie header. Unknown keys
 * are ignored and invalid values fall back to their defaults, so a hand-edited
 * or outdated cookie can never break a page.
 */
export function serializeSettings(settings: Settings): string {
  const params = new URLSearchParams();
  const name = normalizeWorkspaceName(settings.workspaceName);
  if (name !== DEFAULT_SETTINGS.workspaceName) params.set("name", name);
  if (settings.currency !== DEFAULT_SETTINGS.currency) params.set("currency", settings.currency);
  if (settings.defaultPeriod !== DEFAULT_SETTINGS.defaultPeriod) params.set("period", settings.defaultPeriod);
  if (settings.chartMotion !== DEFAULT_SETTINGS.chartMotion) params.set("motion", settings.chartMotion);
  const notify = NOTIFICATION_CATEGORIES.filter((category) => settings.notifications[category]);
  if (notify.length !== NOTIFICATION_CATEGORIES.length) params.set("notify", notify.join(".") || "none");
  return params.toString();
}

/** Parses the decoded cookie value. Anything missing or invalid takes its default. */
export function parseSettings(value: string | null | undefined): Settings {
  if (!value) return DEFAULT_SETTINGS;
  const params = new URLSearchParams(value);

  const name = params.get("name");
  const workspaceName = name !== null && validateWorkspaceName(name) === null ? normalizeWorkspaceName(name) : DEFAULT_SETTINGS.workspaceName;
  const currency = params.get("currency");
  const period = params.get("period");
  const motion = params.get("motion");
  const notify = params.get("notify");
  const enabled = notify === null ? null : new Set(notify.split("."));
  const shows = (category: NotificationCategory) => enabled === null || enabled.has(category);

  return {
    workspaceName,
    currency: isCurrencyCode(currency) ? currency : DEFAULT_SETTINGS.currency,
    defaultPeriod: isOneOf(DEFAULT_PERIOD_OPTIONS, period) ? period : DEFAULT_SETTINGS.defaultPeriod,
    chartMotion: isOneOf(CHART_MOTION_OPTIONS, motion) ? motion : DEFAULT_SETTINGS.chartMotion,
    notifications: { payments: shows("payments"), customers: shows("customers"), reports: shows("reports") },
  };
}

/** A `document.cookie` assignment that stores the settings, or clears the cookie when they are all defaults. */
export function serializeSettingsCookie(settings: Settings): string {
  const value = serializeSettings(settings);
  return value
    ? `${SETTINGS_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${SETTINGS_COOKIE_MAX_AGE}; SameSite=Lax`
    : `${SETTINGS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** Reads the settings from a `document.cookie`-style string. */
export function readSettingsFromCookieString(cookieString: string): Settings {
  for (const part of cookieString.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1 || part.slice(0, separator).trim() !== SETTINGS_COOKIE) continue;
    try {
      return parseSettings(decodeURIComponent(part.slice(separator + 1).trim()));
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
}

/** The period a page opens on: the saved default, or the page's own when none is saved. */
export function resolveDefaultPeriod(settings: Settings, pageDefault: RangePreset): RangePreset {
  return settings.defaultPeriod === PAGE_DEFAULT_PERIOD ? pageDefault : settings.defaultPeriod;
}

export function settingsEqual(a: Settings, b: Settings): boolean {
  return serializeSettings(a) === serializeSettings(b);
}
