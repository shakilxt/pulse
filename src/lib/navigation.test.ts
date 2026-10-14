import { describe, expect, it } from "vitest";
import { ALL_NAV_ITEMS, findActiveNavItem, isActivePath } from "./navigation";

describe("isActivePath", () => {
  it("matches the overview only on the root path", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/analytics", "/")).toBe(false);
  });

  it("matches a section and its nested segments", () => {
    expect(isActivePath("/customers", "/customers")).toBe(true);
    expect(isActivePath("/customers/", "/customers")).toBe(true);
    expect(isActivePath("/customers/CUS-0001", "/customers")).toBe(true);
  });

  it("does not match sibling paths that share a prefix", () => {
    expect(isActivePath("/customers-archive", "/customers")).toBe(false);
  });

  it("ignores query strings and hashes", () => {
    expect(isActivePath("/transactions?page=2", "/transactions")).toBe(true);
    expect(isActivePath("/?range=30d", "/")).toBe(true);
  });
});

describe("navigation config", () => {
  it("has unique keys and hrefs", () => {
    const keys = ALL_NAV_ITEMS.map((item) => item.key);
    const hrefs = ALL_NAV_ITEMS.map((item) => item.href);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("resolves exactly one active item per route", () => {
    for (const item of ALL_NAV_ITEMS) {
      const matches = ALL_NAV_ITEMS.filter((candidate) => isActivePath(item.href, candidate.href));
      expect(matches).toEqual([item]);
      expect(findActiveNavItem(item.href)).toBe(item);
    }
  });

  it("returns undefined for unknown routes", () => {
    expect(findActiveNavItem("/does-not-exist")).toBeUndefined();
  });
});
