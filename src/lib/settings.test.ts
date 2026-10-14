import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  SETTINGS_COOKIE,
  type Settings,
  parseSettings,
  readSettingsFromCookieString,
  resolveDefaultPeriod,
  serializeSettings,
  serializeSettingsCookie,
  validateWorkspaceName,
} from "./settings";

const custom: Settings = {
  workspaceName: "Ash & Oak Studio",
  currency: "EUR",
  defaultPeriod: "90d",
  chartMotion: "off",
  notifications: { payments: true, customers: false, reports: false },
};

describe("settings cookie", () => {
  it("leaves defaults out, so an untouched visitor stores nothing", () => {
    expect(serializeSettings(DEFAULT_SETTINGS)).toBe("");
    expect(serializeSettingsCookie(DEFAULT_SETTINGS)).toBe(`${SETTINGS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`);
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips through the cookie header, including awkward characters", () => {
    const cookie = serializeSettingsCookie(custom);
    expect(cookie).toMatch(/^pulse-settings=[^;\s,]+; Path=\/; Max-Age=31536000; SameSite=Lax$/);
    const header = `pulse-theme=dark; ${cookie.split(";")[0]}; other=1`;
    expect(readSettingsFromCookieString(header)).toEqual(custom);
  });

  it("keeps every notification category off when all are switched off", () => {
    const none = { ...custom, notifications: { payments: false, customers: false, reports: false } };
    expect(parseSettings(serializeSettings(none)).notifications).toEqual(none.notifications);
  });

  it("falls back per field for invalid or hand-edited values", () => {
    const parsed = parseSettings("currency=JPY&period=forever&motion=wild&name=%3Cscript%3E&notify=reports.spam");
    expect(parsed).toEqual({ ...DEFAULT_SETTINGS, notifications: { payments: false, customers: false, reports: true } });
    expect(readSettingsFromCookieString("pulse-settings=%E0%A4%A")).toEqual(DEFAULT_SETTINGS);
  });
});

describe("validateWorkspaceName", () => {
  it.each([
    ["", "Enter a workspace name."],
    ["   ", "Enter a workspace name."],
    ["A", "Use at least 2 characters."],
    ["x".repeat(41), "Use 40 characters or fewer."],
    ["<b>Studio</b>", "Start with a letter or number, and use only letters, numbers, spaces and & ' . , -"],
    ["-Studio", "Start with a letter or number, and use only letters, numbers, spaces and & ' . , -"],
  ])("rejects %j", (value, message) => {
    expect(validateWorkspaceName(value)).toBe(message);
  });

  it.each(["Fernhill Studio", "Ash & Oak", "Café Lumière", "O'Neill Design Co.", "  Spaced   out  "])("accepts %j", (value) => {
    expect(validateWorkspaceName(value)).toBeNull();
  });
});

describe("resolveDefaultPeriod", () => {
  it("uses the page's own default unless one is saved", () => {
    expect(resolveDefaultPeriod(DEFAULT_SETTINGS, "90d")).toBe("90d");
    expect(resolveDefaultPeriod({ ...DEFAULT_SETTINGS, defaultPeriod: "7d" }, "90d")).toBe("7d");
  });
});
