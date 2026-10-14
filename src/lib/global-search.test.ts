import { describe, expect, it } from "vitest";
import { buildSearchOptions, rankScopes } from "./global-search";

describe("rankScopes", () => {
  it("puts the table an ID prefix or email points at first", () => {
    expect(rankScopes("TX-107975")[0]).toBe("transactions");
    expect(rankScopes("cu-13500")[0]).toBe("customers");
    expect(rankScopes("pr12")[0]).toBe("products");
    expect(rankScopes("amara@example.com")[0]).toBe("customers");
    expect(rankScopes("amara")).toEqual(["customers", "transactions", "products"]);
  });

  it("always offers every table exactly once", () => {
    for (const query of ["TX-1", "PR-01", "", "x"]) expect([...rankScopes(query)].sort()).toEqual(["customers", "products", "transactions"]);
  });
});

describe("buildSearchOptions", () => {
  it("lists every destination for an empty query", () => {
    const options = buildSearchOptions("   ");
    expect(options.every((option) => option.group === "pages")).toBe(true);
    expect(options.map((option) => option.href)).toEqual([
      "/",
      "/analytics",
      "/reports",
      "/customers",
      "/transactions",
      "/products",
      "/settings",
    ]);
  });

  it("offers record searches with the cleaned query in the link", () => {
    const options = buildSearchOptions("  Amara   Galloway ");
    expect(options.slice(0, 3).map((option) => option.href)).toEqual([
      "/customers?q=Amara+Galloway",
      "/transactions?q=Amara+Galloway",
      "/products?q=Amara+Galloway",
    ]);
    expect(options[0]?.label).toBe("Customers matching “Amara Galloway”");
  });

  it("matches destinations by name or description", () => {
    const pages = (query: string) =>
      buildSearchOptions(query)
        .filter((option) => option.group === "pages")
        .map((option) => option.label);
    expect(pages("csv")).toEqual(["Reports"]);
    expect(pages("trans")).toEqual(["Transactions"]);
    expect(pages("zzz")).toEqual([]);
  });

  it("encodes characters that would break the query string", () => {
    const [first] = buildSearchOptions("a&b=c #1");
    expect(first?.href).toBe("/customers?q=a%26b%3Dc+%231");
  });
});
