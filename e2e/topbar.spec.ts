import { expect, test, type Page } from "@playwright/test";

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("global search", () => {
  test("opens from the keyboard, moves with arrows and opens the active option", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");
    await page.locator("body").press("/");
    const dialog = page.getByRole("dialog", { name: "Search workspace" });
    await expect(dialog).toBeVisible();
    const input = dialog.getByRole("combobox", { name: "Search workspace" });
    await expect(input).toBeFocused();

    await input.fill("TX-107975");
    const options = dialog.getByRole("option");
    await expect(options.first()).toHaveAccessibleName(/Transactions matching “TX-107975”/);
    await expect(options.first()).toHaveAttribute("aria-selected", "true");
    await expect(input).toHaveAttribute("aria-activedescendant", (await options.first().getAttribute("id")) ?? "");

    await input.press("ArrowDown");
    await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
    await input.press("ArrowUp");
    await input.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL("/transactions?q=TX-107975");
    expect(errors).toEqual([]);
  });

  test("jumps to a page and closes with Escape, returning focus", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Search", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Search workspace" });
    await page.keyboard.type("reports");
    await expect(dialog.getByRole("option")).toHaveCount(4);
    await dialog.getByRole("option", { name: /^Reports/ }).click();
    await expect(page).toHaveURL("/reports");

    await page.keyboard.press("Control+k");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("ignores the slash shortcut while typing in a field", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const input = page.getByRole("combobox", { name: "Search workspace" });
    await input.press("/");
    await expect(input).toHaveValue("/");
  });
});

test.describe("notifications", () => {
  test("lists demo notifications, marks them read and remembers it", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Notifications, 3 unread" });
    await trigger.click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveCount(8); // mark-all + 7 notifications
    await expect(menu).toContainText("Nothing is sent anywhere");

    await menu.getByRole("menuitem", { name: "Mark all as read" }).click();
    await expect(menu).toBeVisible();
    await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Mark all as read" })).toHaveAttribute("aria-disabled", "true");

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeFocused();

    await page.reload();
    await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
  });

  test("opens a notification's record and closes the menu", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Notifications/ }).click();
    await page.getByRole("menuitem", { name: /Unread: Payment failed/ }).click();
    await expect(page).toHaveURL(/\/transactions\?q=TX-\d+$/);
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(page.getByRole("button", { name: "Notifications, 2 unread" })).toBeVisible();
  });

  test("is fully keyboard operable", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const trigger = page.getByRole("button", { name: /^Notifications/ });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
    // Opening from the keyboard focuses the first item, "Mark all as read".
    await expect(page.getByRole("menuitem", { name: "Mark all as read" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: /4 payments pending/ })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/transactions?status=pending");
  });
});

test.describe("profile menu", () => {
  test("links to settings and offers no sign-out", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Profile and preferences for Rowan Hale" }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toContainText("There is no account or sign-in");
    await expect(menu.getByRole("menuitem", { name: /sign out|log out/i })).toHaveCount(0);
    await menu.getByRole("menuitem", { name: "Settings" }).click();
    await expect(page).toHaveURL("/settings");
    await expect(menu).toBeHidden();
  });
});

test.describe("icon-only controls", () => {
  test("every button in the top bar has an accessible name", async ({ page }) => {
    await page.goto("/");
    const buttons = page.getByRole("banner").getByRole("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      if (!(await button.isVisible())) continue;
      expect((await button.getAttribute("aria-label")) ?? (await button.innerText())).not.toBe("");
    }
  });
});
