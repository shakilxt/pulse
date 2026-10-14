import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Automated WCAG 2.2 A/AA checks with axe-core on every route, in both themes,
 * and on the overlays that only exist once opened. Automated rules catch a
 * subset of problems; keyboard behaviour is covered by the feature specs.
 */

const ROUTES = [
  { path: "/", heading: "Overview" },
  { path: "/analytics", heading: "Analytics" },
  { path: "/reports", heading: "Reports" },
  { path: "/customers", heading: "Customers" },
  { path: "/transactions", heading: "Transactions" },
  { path: "/products", heading: "Products" },
  { path: "/settings", heading: "Settings" },
  { path: "/transactions?q=no-such-record", heading: "Transactions" },
] as const;

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function open(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

async function expectNoViolations(page: Page, include?: string, disabledRules: string[] = []) {
  const builder = new AxeBuilder({ page }).withTags(TAGS).disableRules(disabledRules);
  if (include) builder.include(include);
  const { violations } = await builder.analyze();
  const summary = violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    targets: violation.nodes.slice(0, 5).map((node) => node.target.join(" ")),
  }));
  expect(summary).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    for (const route of ROUTES) {
      test(`${route.path} has no detectable WCAG A/AA violations`, async ({ page }) => {
        await open(page, route.path, route.heading);
        await expectNoViolations(page);
      });
    }

    test("the 404 page has no detectable violations", async ({ page }) => {
      await page.goto("/does-not-exist");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoViolations(page);
    });
  });
}

test.describe("overlays", () => {
  test("transaction drawer", async ({ page }) => {
    await open(page, "/transactions", "Transactions");
    await page.getByRole("button", { name: "View transaction TX-107984" }).click();
    await expect(page.getByRole("dialog", { name: "$24.00" })).toBeVisible();
    await expectNoViolations(page, '[role="dialog"]');
  });

  test("customer drawer", async ({ page }) => {
    await open(page, "/customers?q=Hana+Ingleby", "Customers");
    await page.getByRole("button", { name: /^View customer Hana Ingleby/ }).click();
    await expect(page.getByRole("dialog", { name: "Hana Ingleby" })).toBeVisible();
    await expectNoViolations(page, '[role="dialog"]');
  });

  test("date range picker", async ({ page }) => {
    await open(page, "/analytics", "Analytics");
    await page.getByRole("button", { name: /^Date range:/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoViolations(page, '[role="dialog"]');
  });

  test("notifications menu", async ({ page }) => {
    await open(page, "/", "Overview");
    await page.getByRole("button", { name: /^Notifications/ }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    // A scrolling ARIA menu manages focus itself: Tab is not used inside it, and
    // arrow keys move focus to every item, scrolling it into view. axe only
    // credits tabbable content, so this rule is checked by the keyboard test
    // "reaches the end of a long list from the keyboard" in topbar.spec.ts.
    await expectNoViolations(page, '[role="menu"]', ["scrollable-region-focusable"]);
  });

  test("workspace search", async ({ page }) => {
    await open(page, "/", "Overview");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Search workspace" });
    await dialog.getByRole("combobox", { name: "Search workspace" }).fill("re");
    await expect(dialog.getByRole("option").first()).toBeVisible();
    await expectNoViolations(page, '[role="dialog"]');
  });

  test("settings with a validation error", async ({ page }) => {
    await open(page, "/settings", "Settings");
    await page.getByRole("textbox", { name: "Workspace name" }).fill("!");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("textbox", { name: "Workspace name" })).toHaveAttribute("aria-invalid", "true");
    await expectNoViolations(page);
  });
});

test.describe("mobile navigation drawer", () => {
  test.skip(({ isMobile }) => !isMobile, "Drawer is only used on narrow screens");

  test("has no detectable violations when open", async ({ page }) => {
    await open(page, "/", "Overview");
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
    await expectNoViolations(page, '[role="dialog"]');
  });
});
