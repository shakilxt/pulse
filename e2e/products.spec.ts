import { expect, test, type Page } from "@playwright/test";

/* Expected figures come from the seeded demo data; src/lib/products.test.ts checks them against the dataset. */

const table = (page: Page) => page.getByRole("region", { name: "Products", exact: true });
const rows = (page: Page) => table(page).locator("tbody tr");
const chart = (page: Page) => page.getByRole("region", { name: "Product comparison" });
const bars = (page: Page, metric: string) => chart(page).getByRole("list", { name: `Products by ${metric}` }).getByRole("listitem");
const leader = (page: Page, label: string) => page.getByRole("region", { name: "Top performers" }).getByRole("listitem").filter({ hasText: label });

async function open(page: Page, path = "/products") {
  await page.goto(path);
  await expect(table(page)).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test("shows the period's leaders, a ranked comparison and every product", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page);
  await expect(page).toHaveTitle(/^Products · PULSE$/);
  await expect(page.getByRole("button", { name: /^Date range: Last 90 days/ })).toBeVisible();

  await expect(leader(page, "Highest revenue")).toContainText("Brand Identity Sprint");
  await expect(leader(page, "Highest revenue")).toContainText("$30,600");
  await expect(leader(page, "Most units sold")).toContainText(/Field Notes Planner.*217/);
  await expect(leader(page, "Best conversion")).toContainText(/Moodboard Toolkit.*6\.88%/);
  await expect(leader(page, "Fastest growing")).toContainText("+54.5%");

  await expect(rows(page)).toHaveCount(12);
  await expect(rows(page).first()).toContainText("Brand Identity Sprint");
  await expect(table(page)).toContainText("12 products");
  await expect(bars(page, "revenue")).toHaveCount(12);
  await expect(bars(page, "revenue").first()).toContainText(/Brand Identity Sprint\$30,600.*was \$19,800/);
  await expect(chart(page).getByRole("figure")).toContainText("Brand Identity Sprint leads with $30,600");
  expect(errors).toEqual([]);
});

test("search narrows the chart and the table together, and resets", async ({ page }) => {
  await open(page);
  const search = page.getByRole("searchbox", { name: "Search products" });
  await search.fill("templates");
  await expect(page).toHaveURL("/products?q=templates");
  await expect(rows(page)).toHaveCount(4);
  await expect(table(page)).toContainText("4 of 12 products");
  await expect(bars(page, "revenue")).toHaveCount(4);
  await expect(chart(page)).toContainText("4 of 12 products, ranked by revenue");
  // Leaders describe the whole catalogue, whatever the search.
  await expect(leader(page, "Highest revenue")).toContainText("Brand Identity Sprint");

  await search.fill("no such product");
  await expect(table(page)).toContainText("No products match these filters");
  await expect(chart(page)).toContainText("No products match the search");
  await table(page).getByRole("link", { name: "Reset filters" }).click();
  await expect(page).toHaveURL("/products");
  await expect(rows(page)).toHaveCount(12);
});

test("ranks the comparison chart by the chosen measure", async ({ page }) => {
  await open(page);
  await chart(page).getByRole("radio", { name: "Conversion" }).click();
  await expect(page).toHaveURL("/products?metric=conversion");
  await expect(bars(page, "conversion").first()).toContainText(/Moodboard Toolkit.*6\.88%/);
  await expect(bars(page, "conversion").last()).toContainText("Brand Identity Sprint1.00%");
  await chart(page).getByRole("radio", { name: "Units sold" }).click();
  await expect(page).toHaveURL("/products?metric=units");
  await expect(bars(page, "units").first()).toContainText(/Field Notes Planner.*217/);
  // The table keeps its own order.
  await expect(rows(page).first()).toContainText("Brand Identity Sprint");
});

test("sorts the table", async ({ page, isMobile }) => {
  await open(page);
  if (isMobile) {
    await page.getByRole("button", { name: "Sort: Highest revenue" }).click();
    await page.getByRole("menuitemradio", { name: "Most units sold" }).click();
  } else {
    await table(page).getByRole("link", { name: /^Units sold\s*, sort/ }).click();
  }
  await expect(page).toHaveURL("/products?sort=units.desc");
  await expect(rows(page).first()).toContainText("Field Notes Planner");
  await expect(rows(page).last()).toContainText("Brand Identity Sprint");
  if (!isMobile) {
    await table(page).getByRole("link", { name: /^Change\s*, sort/ }).click();
    await expect(page).toHaveURL("/products?sort=change.desc");
    await expect(rows(page).first()).toContainText("+54.5%");
  }
});

test("follows the period", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: /^Date range: Last 90 days/ }).click();
  await page.getByRole("button", { name: "Last 7 days" }).click();
  await expect(page).toHaveURL("/products?range=7d");
  await expect(leader(page, "Highest revenue")).toContainText("$5,400");
  await expect(leader(page, "Fastest growing")).toContainText("Portfolio Review");
  await expect(chart(page)).toContainText("Sep 24 – 30, 2026");
});
