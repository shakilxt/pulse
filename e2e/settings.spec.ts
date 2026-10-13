import { expect, test, type Page } from "@playwright/test";

const nameField = (page: Page) => page.getByRole("textbox", { name: "Workspace name" });
const saveBar = (page: Page) => page.getByRole("form", { name: "Settings" }).getByRole("status");

async function open(page: Page) {
  await page.goto("/settings");
  await expect(nameField(page)).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test("ties validation messages to the field and refuses to save", async ({ page }) => {
  await open(page);
  await nameField(page).fill("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(nameField(page)).toHaveAttribute("aria-invalid", "true");
  await expect(nameField(page)).toHaveAccessibleDescription(/^Enter a workspace name\./);
  await expect(nameField(page)).toBeFocused();
  await expect(saveBar(page)).toHaveText("Settings were not saved. Fix the highlighted field and try again.");

  await nameField(page).fill("A");
  await nameField(page).blur();
  await expect(nameField(page)).toHaveAccessibleDescription(/^Use at least 2 characters\./);
  await nameField(page).fill("<Studio>");
  await expect(nameField(page)).toHaveAccessibleDescription(/^Start with a letter or number/);
  await nameField(page).fill("Ash & Oak Studio");
  await expect(nameField(page)).not.toHaveAttribute("aria-invalid");
  await expect(nameField(page)).toHaveAccessibleDescription(/^2 to 40 characters/);

  // Nothing was stored while the form was invalid.
  await page.reload();
  await expect(nameField(page)).toHaveValue("Fernhill Studio");
});

test("saved settings persist and take effect across the workspace", async ({ page }) => {
  await open(page);
  await expect(saveBar(page)).toHaveText("No unsaved changes.");
  await nameField(page).fill("Ash & Oak Studio");
  await page.getByRole("radio", { name: /^Dark/ }).check();
  await page.getByRole("radio", { name: /^EUR/ }).check();
  await page.getByRole("combobox", { name: "Default date range" }).selectOption("7d");
  await page.getByRole("radio", { name: /^Off/ }).check();
  await page.getByRole("switch", { name: /^Payments/ }).uncheck();
  await expect(saveBar(page)).toHaveText("You have unsaved changes.");

  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(saveBar(page)).toHaveText("Settings saved in this browser. Every page now uses them.");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // Persisted: a reload shows the saved values.
  await page.reload();
  await expect(nameField(page)).toHaveValue("Ash & Oak Studio");
  await expect(page.getByRole("radio", { name: /^EUR/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /^Dark/ })).toBeChecked();
  await expect(page.getByRole("combobox", { name: "Default date range" })).toHaveValue("7d");
  await expect(page.getByRole("radio", { name: /^Off/ })).toBeChecked();
  await expect(page.getByRole("switch", { name: /^Payments/ })).not.toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // In effect: name, currency and default period on the overview, with a clean URL.
  await page.goto("/");
  await expect(page.getByText(/^Ash & Oak Studio earned €[\d,]+ from [\d,]+ completed orders over the last 7 days/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Date range: Last 7 days/ })).toBeVisible();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Ash & Oak Studio");
  await page.getByRole("button", { name: /^Profile and preferences/ }).click();
  await expect(page.getByRole("menu")).toContainText("Studio lead · Ash & Oak Studio");
  await page.keyboard.press("Escape");

  // Payment notifications are hidden from the bell.
  await page.getByRole("button", { name: /^Notifications/ }).click();
  const menu = page.getByRole("menu");
  await expect(menu).toContainText("hidden by your notification settings");
  await expect(menu).not.toContainText("Payment failed");
  await expect(menu).toContainText("Monthly report ready");
  await page.keyboard.press("Escape");

  await page.goto("/transactions");
  await expect(page.getByRole("region", { name: "Transactions", exact: true }).locator("tbody tr").first()).toContainText("€");

  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Ash & Oak Studio performance report" })).toBeVisible();
  await expect(page.getByText("Converted at fixed demo rates: 1 USD = 0.92 EUR = 0.79 GBP.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Date range: Last 7 days/ })).toBeVisible();
});

test("discard and restore defaults", async ({ page }) => {
  await open(page);
  await page.getByRole("radio", { name: /^GBP/ }).check();
  await page.getByRole("button", { name: "Discard" }).click();
  await expect(page.getByRole("radio", { name: /^USD/ })).toBeChecked();
  await expect(saveBar(page)).toHaveText("No unsaved changes.");
  await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();

  await page.getByRole("radio", { name: /^GBP/ }).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(saveBar(page)).toContainText("Settings saved");
  await page.goto("/products");
  await expect(page.getByRole("region", { name: "Top performers" })).toContainText("£");

  await page.goto("/settings");
  await page.getByRole("button", { name: "Restore defaults" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(saveBar(page)).toContainText("Settings saved");
  expect((await page.context().cookies()).find((cookie) => cookie.name === "pulse-settings")).toBeUndefined();
  await page.goto("/products");
  await expect(page.getByRole("region", { name: "Top performers" })).toContainText("$");
});
