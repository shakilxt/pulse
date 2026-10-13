/**
 * Options for the global search palette. The palette never searches data in
 * the browser: it offers to open the matching record table with the query
 * applied (`/customers?q=…`), where the server does the filtering.
 */

import { matchesSearch, tokenize } from "./filters";
import { ALL_NAV_ITEMS, type NavKey } from "./navigation";
import { PARAM, hrefWithParams, parseSearchParam } from "./search-params";

export type SearchScope = Extract<NavKey, "customers" | "transactions" | "products">;

export interface SearchOption {
  id: string;
  group: "records" | "pages";
  label: string;
  description: string;
  href: string;
  /** The section the option leads to, which also picks its icon. */
  section: NavKey;
}

const SCOPES: Record<SearchScope, { label: string; href: string; fields: string }> = {
  customers: { label: "Customers", href: "/customers", fields: "names, emails and IDs" },
  transactions: { label: "Transactions", href: "/transactions", fields: "IDs, customers and payment methods" },
  products: { label: "Products", href: "/products", fields: "names and categories" },
};

const DEFAULT_ORDER: readonly SearchScope[] = ["customers", "transactions", "products"];

/** Puts the most likely table first: an ID prefix or an email decides it. */
export function rankScopes(query: string): SearchScope[] {
  const text = query.trim().toLowerCase();
  let first: SearchScope | null = null;
  if (/^cu-?\d/.test(text) || text.includes("@")) first = "customers";
  else if (/^tx-?\d/.test(text)) first = "transactions";
  else if (/^pr-?\d/.test(text)) first = "products";
  if (!first) return [...DEFAULT_ORDER];
  return [first, ...DEFAULT_ORDER.filter((scope) => scope !== first)];
}

export function buildSearchOptions(rawQuery: string): SearchOption[] {
  const query = parseSearchParam(rawQuery);
  const tokens = tokenize(query);

  const pages: SearchOption[] = ALL_NAV_ITEMS.filter((item) =>
    matchesSearch([item.label, item.description], tokens),
  ).map((item) => ({
    id: `page-${item.key}`,
    group: "pages",
    label: item.label,
    description: item.description,
    href: item.href,
    section: item.key,
  }));

  if (query === "") return pages;

  const records: SearchOption[] = rankScopes(query).map((scope) => ({
    id: `records-${scope}`,
    group: "records",
    label: `${SCOPES[scope].label} matching “${query}”`,
    description: `Searches ${SCOPES[scope].fields}`,
    href: hrefWithParams(SCOPES[scope].href, "", { [PARAM.query]: query }),
    section: scope,
  }));

  return [...records, ...pages];
}
