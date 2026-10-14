export type NavKey =
  | "overview"
  | "analytics"
  | "reports"
  | "customers"
  | "transactions"
  | "products"
  | "settings";

export interface NavItem {
  key: NavKey;
  href: string;
  label: string;
  description: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Insights",
    items: [
      { key: "overview", href: "/", label: "Overview", description: "Workspace performance at a glance" },
      { key: "analytics", href: "/analytics", label: "Analytics", description: "Trends, comparisons and acquisition" },
      { key: "reports", href: "/reports", label: "Reports", description: "Period summaries and CSV export" },
    ],
  },
  {
    label: "Records",
    items: [
      { key: "customers", href: "/customers", label: "Customers", description: "Customer directory" },
      { key: "transactions", href: "/transactions", label: "Transactions", description: "Transaction history" },
      { key: "products", href: "/products", label: "Products", description: "Product and service performance" },
    ],
  },
];

export const SETTINGS_NAV_ITEM: NavItem = {
  key: "settings",
  href: "/settings",
  label: "Settings",
  description: "Workspace and display preferences",
};

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((group) => group.items), SETTINGS_NAV_ITEM];

/** "/" matches only itself; other items match their own path and nested segments. */
export function isActivePath(pathname: string, href: string): boolean {
  const path = normalizePath(pathname);
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

export function findActiveNavItem(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => isActivePath(pathname, item.href));
}

function normalizePath(pathname: string): string {
  const withoutQuery = pathname.split(/[?#]/)[0] ?? "/";
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) return withoutQuery.slice(0, -1);
  return withoutQuery || "/";
}
