import { expect, test, type Page } from "@playwright/test";

/*
 * Expected counts come from the seeded demo data; the same filters are
 * checked against the raw dataset in src/lib/transactions.test.ts and
 * src/lib/customers.test.ts.
 */

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

const results = (page: Page, name: "Transactions" | "Customers") => page.getByRole("region", { name, exact: true });
const bodyRows = (page: Page, name: "Transactions" | "Customers") => results(page, name).locator("tbody tr");
const pageStatus = (page: Page, name: "Transactions" | "Customers") => results(page, name).getByRole("status");

async function open(page: Page, path: string, name: "Transactions" | "Customers") {
  await page.goto(path);
  await expect(results(page, name)).toBeVisible();
  await page.waitForLoadState("networkidle");
}

function amounts(texts: string[]): number[] {
  return texts.map((text) => Number((text.match(/\$([\d,]+\.\d\d)/)?.[1] ?? "NaN").replaceAll(",", "")));
}

test.describe("transactions", () => {
  test("lists the newest transactions first without console errors", async ({ page, isMobile }) => {
    const errors = collectConsoleErrors(page);
    await open(page, "/transactions", "Transactions");
    await expect(page).toHaveTitle(/^Transactions · PULSE$/);
    await expect(results(page, "Transactions")).toContainText("7,984 transactions");
    await expect(bodyRows(page, "Transactions")).toHaveCount(15);
    await expect(bodyRows(page, "Transactions").first()).toContainText("TX-107984");
    await expect(pageStatus(page, "Transactions")).toHaveText("1–15 of 7,984 transactions");
    if (isMobile) await expect(page.getByRole("button", { name: "Sort: Newest first" })).toBeVisible();
    else await expect(page.getByRole("columnheader", { name: /^Date/ })).toHaveAttribute("aria-sort", "descending");
    expect(errors).toEqual([]);
  });

  test("searches by payment method and by an ID typed without its hyphen", async ({ page }) => {
    await open(page, "/transactions", "Transactions");
    const search = page.getByRole("searchbox", { name: "Search transactions" });
    await search.fill("paypal");
    await expect(page).toHaveURL("/transactions?q=paypal");
    await expect(results(page, "Transactions")).toContainText("913 of 7,984 transactions");

    await search.fill("tx107975");
    await search.press("Enter");
    await expect(page).toHaveURL("/transactions?q=tx107975");
    await expect(bodyRows(page, "Transactions")).toHaveCount(1);
    await expect(bodyRows(page, "Transactions")).toContainText("TX-107975");

    await search.press("Escape");
    await expect(page).toHaveURL("/transactions");
    await expect(bodyRows(page, "Transactions")).toHaveCount(15);
  });

  test("filters by status with counts, and paginates only the filtered rows", async ({ page }) => {
    await open(page, "/transactions", "Transactions");
    await page.getByRole("button", { name: "Status: All" }).click();
    await expect(page.getByRole("menuitemradio", { name: /^Failed\s*,\s*151$/ })).toBeVisible();
    await page.getByRole("menuitemradio", { name: /^Failed/ }).click();
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(page).toHaveURL("/transactions?status=failed");
    await expect(pageStatus(page, "Transactions")).toHaveText("1–15 of 151 transactions");
    for (const row of await bodyRows(page, "Transactions").all()) await expect(row).toContainText("Failed");

    await results(page, "Transactions").getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL("/transactions?status=failed&page=2");
    await expect(pageStatus(page, "Transactions")).toHaveText("16–30 of 151 transactions");

    // Changing a filter returns to the first page of the new results.
    await page.getByRole("button", { name: "Status: Failed" }).click();
    await page.getByRole("menuitemradio", { name: /^Refunded/ }).click();
    await expect(page).toHaveURL("/transactions?status=refunded");
    await expect(pageStatus(page, "Transactions")).toHaveText("1–15 of 193 transactions");
  });

  test("filters by preset and custom dates", async ({ page, isMobile }) => {
    await open(page, "/transactions", "Transactions");
    await page.getByRole("button", { name: /^Date: All dates/ }).click();
    await page.getByRole("button", { name: /^Last 30 days/ }).click();
    await expect(page).toHaveURL("/transactions?range=30d");
    await expect(page.getByRole("button", { name: /^Date: Last 30 days, Sep 1\s–\s30, 2026/ })).toBeVisible();
    await expect(results(page, "Transactions")).toContainText(/of 7,984 transactions/);

    await page.getByRole("button", { name: /^Date: Last 30 days/ }).click();
    await page.getByLabel("Start date").fill("2025-03-01");
    await page.getByLabel("End date").fill("2025-03-03");
    await page.getByRole("button", { name: "Apply custom range" }).click();
    await expect(page).toHaveURL("/transactions?from=2025-03-01&to=2025-03-03");
    await expect(bodyRows(page, "Transactions").first()).toContainText("Mar 3, 2025");
    // Phones sort from a menu because the date column is hidden there.
    if (isMobile) {
      await page.getByRole("button", { name: "Sort: Newest first" }).click();
      await page.getByRole("menuitemradio", { name: "Oldest first" }).click();
    } else {
      await page.getByRole("link", { name: /^Date\s*, sort/ }).click();
    }
    await expect(page).toHaveURL("/transactions?from=2025-03-01&to=2025-03-03&sort=date.asc");
    await expect(bodyRows(page, "Transactions").first()).toContainText("Mar 1, 2025");
  });

  test("resets every filter but keeps the chosen order", async ({ page }) => {
    await open(page, "/transactions?q=paypal&status=completed&range=90d&sort=amount.desc&page=2", "Transactions");
    await page.getByRole("link", { name: "Reset filters" }).click();
    await expect(page).toHaveURL("/transactions?sort=amount.desc");
    await expect(page.getByRole("searchbox", { name: "Search transactions" })).toHaveValue("");
    await expect(page.getByRole("button", { name: "Status: All" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Date: All dates/ })).toBeVisible();
    await expect(results(page, "Transactions")).toContainText("7,984 transactions");
    await expect(page.getByRole("link", { name: "Reset filters" })).toHaveCount(0);
  });

  test("shows a way out when nothing matches", async ({ page }) => {
    await open(page, "/transactions?q=nobody-at-all&status=failed", "Transactions");
    await expect(page.getByText("No transactions match these filters")).toBeVisible();
    await expect(pageStatus(page, "Transactions")).toHaveText("No transactions");
    await results(page, "Transactions").getByRole("link", { name: "Reset filters" }).click();
    await expect(page).toHaveURL("/transactions");
    await expect(bodyRows(page, "Transactions")).toHaveCount(15);
  });

  test("opens a transaction from the keyboard and follows it to the customer and back", async ({ page }) => {
    await open(page, "/transactions", "Transactions");
    const trigger = page.getByRole("button", { name: "View transaction TX-107984" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const drawer = page.getByRole("dialog", { name: "$24.00" });
    await expect(drawer).toContainText("Gael Yilmaz");
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    const customerLink = drawer.getByRole("link", { name: /^View customer CU-\d{5}$/ });
    const customerId = (await customerLink.textContent())?.match(/CU-\d{5}/)?.[0] ?? "";
    await customerLink.click();
    await expect(page).toHaveURL(`/customers?q=${customerId}`);
    await expect(bodyRows(page, "Customers")).toHaveCount(1);

    await page.getByRole("button", { name: "View customer Gael Yilmaz" }).click();
    const customer = page.getByRole("dialog", { name: "Gael Yilmaz" });
    await expect(customer).toContainText(customerId);
    await expect(customer.getByRole("heading", { name: "Recent transactions" })).toBeVisible();
    await expect(customer).toContainText("TX-107984");
    const allLink = customer.getByRole("link", { name: /^View (all \d+ transactions|this transaction)$/ });
    const count = Number((await allLink.textContent())?.match(/\d+/)?.[0] ?? "1");
    await allLink.click();
    await expect(page).toHaveURL(`/transactions?q=${customerId}`);
    await expect(bodyRows(page, "Transactions")).toHaveCount(count);
  });
});

test.describe("transactions on desktop", () => {
  test.skip(({ isMobile }) => isMobile, "wide columns");

  test("sorts by amount in both directions", async ({ page }) => {
    await open(page, "/transactions?status=completed", "Transactions");
    await page.getByRole("link", { name: /^Amount\s*, sort/ }).click();
    await expect(page).toHaveURL("/transactions?status=completed&sort=amount.desc");
    await expect(page.getByRole("columnheader", { name: /^Amount/ })).toHaveAttribute("aria-sort", "descending");
    const cells = () => bodyRows(page, "Transactions").locator("td:last-child").allTextContents();
    const descending = amounts(await cells());
    expect(descending).toEqual([...descending].sort((a, b) => b - a));
    expect(descending[0]).toBe(1800);

    await page.getByRole("link", { name: /^Amount\s*, sort/ }).click();
    await expect(page).toHaveURL("/transactions?status=completed&sort=amount.asc");
    const ascending = amounts(await cells());
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b));
    expect(ascending[0]).toBeLessThan(descending.at(-1) ?? 0);
  });

  test("shows every column at 1440px and keeps the table within the card at 1280px and 768px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, "/transactions", "Transactions");
    for (const header of ["Transaction", "Customer", "Date", "Product", "Payment method", "Status", "Amount"]) {
      await expect(page.getByRole("columnheader", { name: new RegExp(`^${header}`) })).toBeVisible();
    }
    for (const width of [1280, 768]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/transactions", "/customers"]) {
        await page.goto(path);
        const scroller = page.locator("table").locator("..");
        expect(await scroller.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
      }
    }
  });
});

test.describe("customers", () => {
  test("lists the highest-spending customers first without console errors", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await open(page, "/customers", "Customers");
    await expect(page).toHaveTitle(/^Customers · PULSE$/);
    await expect(results(page, "Customers")).toContainText("3,501 customers");
    await expect(pageStatus(page, "Customers")).toHaveText("1–15 of 3,501 customers");
    await expect(page.getByRole("columnheader", { name: /^Total spend/ })).toHaveAttribute("aria-sort", "descending");
    await expect(bodyRows(page, "Customers").first()).toContainText("Hana Ingleby");
    await expect(bodyRows(page, "Customers").first()).toContainText("$5,287.00");
    expect(errors).toEqual([]);
  });

  test("searches by email and filters by status", async ({ page }) => {
    await open(page, "/customers", "Customers");
    await page.getByRole("searchbox", { name: "Search customers" }).fill("HUGO.OKAFOR@example.com");
    await expect(page).toHaveURL("/customers?q=HUGO.OKAFOR%40example.com");
    await expect(bodyRows(page, "Customers")).toHaveCount(1);
    await expect(bodyRows(page, "Customers")).toContainText("Hugo Okafor");

    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page).toHaveURL("/customers");
    await page.getByRole("button", { name: "Status: All" }).click();
    await expect(page.getByRole("menuitemradio", { name: /^Active\s*,\s*734$/ })).toBeVisible();
    await page.getByRole("menuitemradio", { name: /^Inactive/ }).click();
    await expect(page).toHaveURL("/customers?status=inactive");
    await expect(pageStatus(page, "Customers")).toHaveText("1–15 of 2,767 customers");
    for (const row of await bodyRows(page, "Customers").all()) await expect(row).toContainText("Inactive");
  });

  test("sorts by name and keeps the order while paging", async ({ page }) => {
    await open(page, "/customers", "Customers");
    await page.getByRole("link", { name: /^Customer\s*, sort/ }).click();
    await expect(page).toHaveURL("/customers?sort=name.asc");
    const names = await results(page, "Customers").getByRole("button", { name: /^View customer/ }).allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
    await results(page, "Customers").getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL("/customers?sort=name.asc&page=2");
    const next = await results(page, "Customers").getByRole("button", { name: /^View customer/ }).allTextContents();
    expect((names.at(-1) ?? "").localeCompare(next[0] ?? "", "en", { sensitivity: "base" })).toBeLessThanOrEqual(0);
  });

  test("explains a customer in the drawer", async ({ page }) => {
    await open(page, "/customers", "Customers");
    const trigger = page.getByRole("button", { name: "View customer Hana Ingleby" });
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "Hana Ingleby" });
    await expect(drawer).toContainText("hana.ingleby@example.com");
    await expect(drawer).toContainText("Made a purchase in the last 90 days of data");
    await expect(drawer).toContainText("$5,287.00");
    await expect(drawer).toContainText("Fictional customer");
    await drawer.getByRole("button", { name: "Close customer details" }).click();
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("shows an empty state that resets the search", async ({ page }) => {
    await open(page, "/customers?q=zzzz&status=active", "Customers");
    await expect(page.getByText("No customers match these filters")).toBeVisible();
    await results(page, "Customers").getByRole("link", { name: "Reset filters" }).click();
    await expect(page).toHaveURL("/customers");
    await expect(results(page, "Customers")).toContainText("3,501 customers");
  });
});

test.describe("records on mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "phone layout");

  for (const [path, name] of [
    ["/transactions", "Transactions"],
    ["/customers", "Customers"],
  ] as const) {
    test(`${path} fits a 375px screen and keeps status visible`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await open(page, path, name);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
      const scroller = results(page, name).locator("table").locator("..");
      expect(await scroller.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
      await expect(page.getByRole("columnheader", { name: "Status" })).toBeHidden();
      const status = bodyRows(page, name).first().getByText(/^(Completed|Pending|Refunded|Failed|Active|Inactive)$/);
      await expect(status.filter({ visible: true })).toHaveCount(1);
    });
  }

  test("sorts customers from the menu when the columns are hidden", async ({ page }) => {
    await open(page, "/customers?page=3", "Customers");
    await expect(page.getByRole("columnheader", { name: /^Orders/ })).toBeHidden();
    await page.getByRole("button", { name: "Sort: Highest spend" }).click();
    await page.getByRole("menuitemradio", { name: "Most orders" }).click();
    await expect(page).toHaveURL("/customers?sort=orders.desc");
    await page.getByRole("button", { name: "View customer Hana Ingleby" }).click();
    await expect(page.getByRole("dialog", { name: "Hana Ingleby" })).toContainText("17");
  });
});
