import { describe, expect, it } from "vitest";
import {
  THEME_COOKIE,
  THEME_INIT_SCRIPT,
  parseThemePreference,
  readThemeFromCookieString,
  serializeThemeCookie,
} from "./theme";

describe("parseThemePreference", () => {
  it("accepts known preferences", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("system")).toBe("system");
  });

  it("falls back to system for missing or unknown values", () => {
    expect(parseThemePreference(undefined)).toBe("system");
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference("")).toBe("system");
    expect(parseThemePreference("purple")).toBe("system");
  });
});

describe("readThemeFromCookieString", () => {
  it("finds the theme cookie among others", () => {
    expect(readThemeFromCookieString(`a=1; ${THEME_COOKIE}=dark; b=2`)).toBe("dark");
  });

  it("ignores cookies whose name only contains the theme cookie name", () => {
    expect(readThemeFromCookieString(`x${THEME_COOKIE}=dark`)).toBe("system");
  });

  it("returns system when absent or invalid", () => {
    expect(readThemeFromCookieString("")).toBe("system");
    expect(readThemeFromCookieString(`${THEME_COOKIE}=sepia`)).toBe("system");
  });
});

describe("serializeThemeCookie", () => {
  it("round-trips through the reader", () => {
    const cookie = serializeThemeCookie("light").split(";")[0] ?? "";
    expect(readThemeFromCookieString(cookie)).toBe("light");
  });
});

describe("THEME_INIT_SCRIPT", () => {
  function run(cookie: string): string | null {
    let attribute: string | null = null;
    const document = {
      cookie,
      documentElement: {
        setAttribute: (_name: string, value: string) => {
          attribute = value;
        },
      },
    };
    new Function("document", THEME_INIT_SCRIPT)(document);
    return attribute;
  }

  it("applies explicit light and dark preferences", () => {
    expect(run(`${THEME_COOKIE}=dark`)).toBe("dark");
    expect(run(`other=1; ${THEME_COOKIE}=light`)).toBe("light");
  });

  it("leaves the attribute unset for system or unknown values", () => {
    expect(run(`${THEME_COOKIE}=system`)).toBeNull();
    expect(run(`${THEME_COOKIE}=darkish`)).toBeNull();
    expect(run(`x${THEME_COOKIE}=dark`)).toBeNull();
    expect(run("")).toBeNull();
  });
});
