export const THEME_COOKIE = "pulse-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return isThemePreference(value) ? value : "system";
}

/** Reads the theme preference from a `document.cookie`-style string. */
export function readThemeFromCookieString(cookieString: string): ThemePreference {
  for (const part of cookieString.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === THEME_COOKIE) {
      return parseThemePreference(decodeURIComponent(rest.join("=")));
    }
  }
  return "system";
}

export function serializeThemeCookie(preference: ThemePreference): string {
  return `${THEME_COOKIE}=${preference}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Runs in <head> before first paint. It only ever sets "light" or "dark";
 * "system" (or no cookie) leaves the attribute off so CSS follows the OS.
 * Built from constants only — no user input is interpolated.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=(light|dark)(?:;|$)/);if(m)document.documentElement.setAttribute("data-theme",m[1])}catch(e){}})()`;
