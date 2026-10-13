import { expect, test, type Page } from "@playwright/test";

const ROUTES = [
  { path: "/", heading: "Overview", nav: "Overview" },
  { path: "/analytics", heading: "Analytics", nav: "Analytics" },
  { path: "/reports", heading: "Reports", nav: "Reports" },
  { path: "/customers", heading: "Customers", nav: "Customers" },
  { path: "/transactions", heading: "Transactions", nav: "Transactions" },
  { path: "/products", heading: "Products", nav: "Products" },
  { path: "/settings", heading: "Settings", nav: "Settings" },
] as const;

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("routes", () => {
  for (const route of ROUTES) {
    test(`${route.path} renders directly with title and heading`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(`${route.heading} · PULSE`);
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      await page.reload();
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test("unknown routes show the branded 404", async ({ page }) => {
    const response = await page.goto("/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle("Page not found · PULSE");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("This path fades");
    await page.getByRole("link", { name: "Back to overview" }).click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("desktop sidebar", () => {
  test.skip(({ isMobile }) => isMobile, "Sidebar is replaced by the drawer on mobile");

  test("navigates between sections and keeps the active state in sync", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary" });
    for (const route of ROUTES) {
      await nav.getByRole("link", { name: route.nav }).click();
      await expect(page).toHaveURL(route.path);
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      const current = nav.locator('[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveAccessibleName(route.nav);
    }
  });

  test("skip link moves focus to the main content", async ({ page }) => {
    await page.goto("/analytics");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
    await expect(page.locator("#main")).toBeFocused();
  });
});

test.describe("mobile navigation", () => {
  test.skip(({ isMobile }) => !isMobile, "Drawer is only used on narrow screens");

  test("opens, traps focus, closes with Escape and returns focus", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Open navigation" });
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "Navigation" });
    await expect(drawer).toBeVisible();

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const focusInside = await drawer.evaluate((element) => element.contains(document.activeElement));
      expect(focusInside).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("closes after choosing a destination", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open navigation" }).click();
    const drawer = page.getByRole("dialog", { name: "Navigation" });
    await drawer.getByRole("link", { name: "Transactions" }).click();
    await expect(page).toHaveURL("/transactions");
    await expect(drawer).toBeHidden();
    await expect(page.getByRole("heading", { level: 1, name: "Transactions" })).toBeVisible();

    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(drawer.locator('[aria-current="page"]')).toHaveAccessibleName("Transactions");
    await drawer.getByRole("button", { name: "Close navigation" }).click();
    await expect(drawer).toBeHidden();
  });
});

test.describe("theme", () => {
  const darkCanvas = "rgb(16, 28, 24)";
  const lightCanvas = "rgb(247, 244, 236)";

  async function canvasColor(page: Page): Promise<string> {
    return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  }

  test("follows the system preference when no choice is saved", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBeNull();
    expect(await canvasColor(page)).toBe(darkCanvas);

    await page.emulateMedia({ colorScheme: "light" });
    expect(await canvasColor(page)).toBe(lightCanvas);
  });

  test("persists an explicit choice across reloads before hydration", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/customers");
    await page.getByRole("button", { name: /^Profile and preferences/ }).click();
    await page.getByRole("menuitemradio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await canvasColor(page)).toBe(darkCanvas);

    // With JavaScript disabled for the app bundle, only the inline head script can apply the theme.
    await page.route(/\/_next\/static\/chunks\/.*\.js$/, (route) => route.abort());
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await canvasColor(page)).toBe(darkCanvas);
    await page.unroute(/\/_next\/static\/chunks\/.*\.js$/);

    await page.reload();
    await page.getByRole("button", { name: /^Profile and preferences/ }).click();
    await expect(page.getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("menuitemradio", { name: "System" }).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
    expect(await canvasColor(page)).toBe(lightCanvas);
  });
});
