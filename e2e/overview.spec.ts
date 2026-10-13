import { expect, test, type Page } from "@playwright/test";

/*
 * Expected figures come from the seeded demo data; the same values are
 * asserted against the calculation layer in src/lib/overview.test.ts.
 */

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

const kpi = (page: Page, label: string) => page.getByRole("article", { name: label });

/** Tick labels of the revenue chart's axes, in document order. */
async function revenueTicks(page: Page): Promise<string> {
  const ticks = page.locator("section[aria-labelledby='revenue-title'] .recharts-cartesian-axis-tick-value");
  return (await ticks.allTextContents()).join(" | ");
}

async function openOverview(page: Page, path = "/") {
  await page.goto(path);
  await expect(page.locator("section[aria-labelledby='revenue-title'] .recharts-surface")).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test.describe("overview", () => {
  test("shows every section for the default 30 days without console errors", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openOverview(page);

    await expect(page).toHaveTitle(/^Overview · PULSE$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Good afternoon, Rowan\./);
    await expect(page.getByText(/Fernhill Studio earned \$57,548 from 350 completed orders over the last 30 days/)).toBeVisible();

    for (const label of ["Total revenue", "Total orders", "Active customers", "Conversion rate"]) {
      await expect(kpi(page, label)).toBeVisible();
    }
    await expect(kpi(page, "Total revenue")).toContainText("$57,548");
    await expect(kpi(page, "Total revenue")).toContainText("up 6.3%");
    await expect(kpi(page, "Total revenue")).toContainText("vs previous 30 days");
    await expect(kpi(page, "Conversion rate")).toContainText("1.05%");
    await expect(kpi(page, "Conversion rate")).toContainText("up 0.08 percentage points");

    for (const heading of [
      "Revenue",
      "Revenue by category",
      "Revenue vs expenses",
      "Customer acquisition",
      "Recent transactions",
      "Top products",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: heading, exact: true })).toBeVisible();
    }
    await expect(page.locator(".recharts-surface")).toHaveCount(3);
    await expect(page.getByRole("region", { name: "Recent transactions" }).getByRole("row")).toHaveCount(7);
    await expect(page.getByRole("region", { name: "Top products" }).getByRole("listitem")).toHaveCount(5);
    expect(errors).toEqual([]);
  });

  test("changing the date range updates the KPIs, charts, breakdown and top products", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openOverview(page);
    const revenueSummary = page.locator("#revenue-summary");
    const topProducts = page.getByRole("region", { name: "Top products" });
    const breakdown = page.getByRole("region", { name: "Revenue by category" });
    const before = {
      top: await topProducts.textContent(),
      breakdown: await breakdown.textContent(),
      ticks: await revenueTicks(page),
    };

    await page.getByRole("button", { name: /^Date range: Last 30 days/ }).click();
    await page.getByRole("button", { name: "Last 12 months" }).click();
    await expect(page).toHaveURL("/?range=12m");

    await expect(kpi(page, "Total revenue")).toContainText("$601,653");
    await expect(kpi(page, "Total revenue")).toContainText("vs previous 12 months");
    await expect(kpi(page, "Total orders")).toContainText("3,740");
    await expect(kpi(page, "Total orders")).toContainText("Previously 2,817");
    await expect(revenueSummary).toHaveText(/^Revenue rose 36\.0% to \$601,653 vs previous 12 months\. The strongest month was Sep 2026/);
    await expect(page.getByText("Completed orders per month", { exact: false })).toBeVisible();
    await expect.poll(() => revenueTicks(page)).toContain("Oct");
    expect(before.ticks).toContain("Sep 1");
    await expect(topProducts).not.toHaveText(before.top ?? "");
    await expect(breakdown).not.toHaveText(before.breakdown ?? "");
    await expect(page.getByText(/over the last 12 months, 36\.0% more than the previous 12 months/)).toBeVisible();

    // Filters replace the history entry, so the default comes back through the picker.
    await page.getByRole("button", { name: /^Date range: Last 12 months/ }).click();
    await page.getByRole("button", { name: "Last 30 days" }).click();
    await expect(page).toHaveURL("/");
    await expect(kpi(page, "Total revenue")).toContainText("$57,548");
    expect(errors).toEqual([]);
  });

  test("says so when a custom range has no comparison period", async ({ page }) => {
    await openOverview(page, "/?from=2024-01-01&to=2024-02-10");
    await expect(page.getByRole("button", { name: /^Date range: Custom range, Jan 1/ })).toBeVisible();
    await expect(kpi(page, "Total revenue")).toContainText("no comparison data");
    await expect(kpi(page, "Total revenue")).toContainText("No data for the comparison period");
    await expect(page.locator("#revenue-summary")).toContainText("There is no comparison data for the previous period.");
    await expect(page.getByText("No earlier data")).toBeVisible();
    await expect(page.getByText("Previous period", { exact: true })).toHaveCount(0);
  });

  test("opens a recent transaction in a drawer and returns focus on close", async ({ page }) => {
    await openOverview(page);
    const trigger = page.getByRole("button", { name: "View transaction TX-107984" });
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "$24.00" });
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Moodboard Toolkit");
    await expect(drawer).toContainText("@example.com");
    await expect(drawer).toContainText("No real payment was processed.");
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("explains each KPI from the keyboard", async ({ page }) => {
    await openOverview(page);
    const info = page.getByRole("button", { name: "How conversion rate is calculated" });
    await info.focus();
    await page.keyboard.press("Enter");
    const popover = page.getByRole("dialog");
    await expect(popover).toContainText("New customers as a share of visitors. Changes are shown in percentage points.");
    await page.keyboard.press("Escape");
    await expect(popover).toBeHidden();
    await expect(info).toBeFocused();
  });

  test("lists the chart figures in a data table", async ({ page }) => {
    await openOverview(page);
    const panel = page.locator("section[aria-labelledby='revenue-title']");
    await panel.getByText("Data table").click();
    const table = panel.getByRole("region", { name: "Revenue per day" }).getByRole("table");
    await expect(table.getByRole("row")).toHaveCount(31);
    await expect(table.getByRole("row", { name: /Fri, Sep 25/ })).toContainText("$5,865");
  });
});

test.describe("overview on desktop", () => {
  test.skip(({ isMobile }) => isMobile, "pointer hover");

  test("shows a tooltip for the hovered point", async ({ page }) => {
    await openOverview(page);
    const plot = page.locator("section[aria-labelledby='revenue-title'] .recharts-surface");
    await plot.scrollIntoViewIfNeeded();
    const box = await plot.boundingBox();
    if (!box) throw new Error("Revenue chart is not visible");
    await page.mouse.move(box.x + box.width - 12, box.y + box.height / 2);
    const tooltip = page.locator("section[aria-labelledby='revenue-title'] .recharts-tooltip-wrapper");
    await expect(tooltip).toContainText("Wed, Sep 30");
    await expect(tooltip).toContainText("Previous period");
  });

  for (const width of [1280, 768]) {
    test(`lays out without horizontal scrolling at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openOverview(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBe(0);
    });
  }
});

test.describe("overview on mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "phone layout");

  test("stacks into one column without horizontal scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openOverview(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBe(0);
    const greeting = await page.locator("section[aria-labelledby='greeting-title']").boundingBox();
    const period = await page.locator("section[aria-labelledby='period-title']").boundingBox();
    expect(greeting && period && period.y > greeting.y + greeting.height - 1).toBe(true);
  });
});
