import { expect, test, type Page } from "@playwright/test";

/*
 * Expected figures come from the seeded demo data; the same values are
 * asserted against the calculation layer in src/lib/analytics.test.ts.
 */

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

const trend = (page: Page) => page.locator("section[aria-labelledby='trend-title']");
const metricRadio = (page: Page, name: RegExp) => page.getByRole("radiogroup", { name: "Chart metric" }).getByRole("radio", { name });
const stats = (page: Page) => page.getByRole("complementary", { name: "Summary statistics" });

async function openAnalytics(page: Page, path = "/analytics") {
  await page.goto(path);
  await expect(page.getByRole("radiogroup", { name: "Chart metric" })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test.describe("analytics", () => {
  test("shows the default quarter without console errors", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openAnalytics(page);

    await expect(page).toHaveTitle(/^Analytics · PULSE$/);
    await expect(page.getByRole("heading", { level: 1, name: "Analytics" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Date range: Last 90 days/ })).toBeVisible();
    await expect(page.getByText("Comparing with Apr 4 – Jul 2, 2026")).toBeVisible();

    await expect(metricRadio(page, /^Revenue/)).toBeChecked();
    await expect(metricRadio(page, /^Revenue/)).toContainText("$166,690");
    await expect(page.getByRole("heading", { level: 2, name: "Revenue trend" })).toBeVisible();
    await expect(page.locator("#trend-summary")).toHaveText(/^Revenue rose 18\.3% to \$166,690 vs previous 90 days\./);
    await expect(stats(page)).toContainText("Daily average");
    await expect(stats(page)).toContainText("$1,852");

    for (const heading of ["Revenue vs expenses", "Period comparison", "Acquisition channels", "Transaction volume"]) {
      const title = page.getByRole("heading", { level: 2, name: heading, exact: true });
      // Charts draw as they near the viewport, so bring each panel into view.
      await title.scrollIntoViewIfNeeded();
      await expect(title).toBeVisible();
    }
    await expect(page.getByRole("region", { name: "Period comparison" }).getByRole("row")).toHaveCount(11);
    await expect(page.getByRole("region", { name: "Transaction volume" })).toContainText("1,019");
    await expect(page.locator(".recharts-surface")).toHaveCount(2);
    expect(errors).toEqual([]);
  });

  test("switches the chart metric from the keyboard and keeps it in the URL", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openAnalytics(page);

    await metricRadio(page, /^Revenue/).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL("/analytics?metric=orders");
    await expect(page.getByRole("heading", { level: 2, name: "Orders trend" })).toBeVisible();
    await expect(page.locator("#trend-summary")).toHaveText(/^Completed orders rose 7\.6% to 978 vs previous 90 days\./);

    await metricRadio(page, /^Conversion rate/).click();
    await expect(page).toHaveURL("/analytics?metric=conversionRate");
    await expect(page.locator("#trend-summary")).toHaveText(/^The conversion rate fell 0\.01 percentage points to 1\.03%/);
    await expect(stats(page)).toContainText("420 new customers from 40,586 visitors");

    // A refresh restores the selection from the URL.
    await page.reload();
    await expect(metricRadio(page, /^Conversion rate/)).toBeChecked();
    await expect(page.getByRole("heading", { level: 2, name: "Conversion rate trend" })).toBeVisible();

    await metricRadio(page, /^Revenue/).click();
    await expect(page).toHaveURL("/analytics");
    expect(errors).toEqual([]);
  });

  test("compares with the same period last year", async ({ page }) => {
    await openAnalytics(page, "/analytics?metric=orders");
    await page.getByRole("radiogroup", { name: "Compare with" }).getByRole("radio", { name: "Same period last year" }).click();
    await expect(page).toHaveURL("/analytics?metric=orders&compare=previous-year");
    await expect(page.getByText("Comparing with Jul 3 – Sep 30, 2025")).toBeVisible();
    await expect(page.locator("#trend-summary")).toHaveText(/vs same period last year\./);
    await expect(stats(page)).toContainText("Same period last year");
    await expect(page.getByRole("region", { name: "Period comparison" })).toContainText("vs same period last year");
  });

  test("changing the date range updates every panel and keeps the metric", async ({ page }) => {
    await openAnalytics(page, "/analytics?metric=newCustomers");
    const volume = page.getByRole("region", { name: "Transaction volume" });
    const channels = page.getByRole("region", { name: "Acquisition channels" });
    const before = { volume: await volume.textContent(), channels: await channels.textContent() };

    await page.getByRole("button", { name: /^Date range: Last 90 days/ }).click();
    await page.getByRole("button", { name: "Last 12 months" }).click();
    await expect(page).toHaveURL("/analytics?metric=newCustomers&range=12m");
    await expect(page.getByRole("heading", { level: 2, name: "New customers trend" })).toBeVisible();
    await expect(page.locator("#trend-summary")).toContainText("vs previous 12 months");
    await expect(page.locator("#trend-summary")).toContainText("The strongest month was");
    await expect(volume).not.toHaveText(before.volume ?? "");
    await expect(channels).not.toHaveText(before.channels ?? "");
    await expect(page.getByRole("region", { name: "Revenue vs expenses" })).toContainText("Per month");
  });

  test("says when there is no comparison data and when there is nothing to chart", async ({ page }) => {
    await openAnalytics(page, "/analytics?from=2024-03-01&to=2024-05-31&compare=previous-year&metric=newCustomers");
    await expect(page.getByText("No data for the same period last year. Figures are shown without a comparison.")).toBeVisible();
    await expect(page.locator("#trend-summary")).toContainText("There is no comparison data for the same period last year.");
    await expect(page.getByRole("region", { name: "Period comparison" })).toContainText("no comparison data");

    await openAnalytics(page, "/analytics?from=2024-01-21&to=2024-01-21");
    await expect(trend(page).getByText("Nothing to chart for revenue")).toBeVisible();
    await expect(page.locator("#trend-summary")).toHaveText("No revenue was recorded in this period.");
    await expect(page.getByRole("region", { name: "Transaction volume" }).getByText("No charges in this period")).toBeVisible();
  });

  test("lists the trend figures in a data table", async ({ page }) => {
    await openAnalytics(page);
    await trend(page).getByText("Data table").click();
    const table = trend(page).getByRole("region", { name: "Revenue per week" }).getByRole("table");
    await expect(table.getByRole("row")).toHaveCount(14);
    await expect(table.getByRole("row", { name: /Aug 27\s–\sSep 2, 2026/ })).toContainText("$16,261");
  });
});

test.describe("analytics on desktop", () => {
  test.skip(({ isMobile }) => isMobile, "pointer hover and wide layouts");

  test("shows a tooltip for the hovered point", async ({ page }) => {
    await openAnalytics(page);
    const plot = trend(page).locator(".recharts-surface");
    await plot.scrollIntoViewIfNeeded();
    const box = await plot.boundingBox();
    if (!box) throw new Error("Trend chart is not visible");
    await page.mouse.move(box.x + box.width - 12, box.y + box.height / 2);
    const tooltip = trend(page).locator(".recharts-tooltip-wrapper");
    await expect(tooltip).toContainText("Sep 24 – 30, 2026");
    await expect(tooltip).toContainText("Previous period");
  });

  for (const width of [1280, 768]) {
    test(`lays out without horizontal scrolling at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openAnalytics(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBe(0);
      // The comparison and channel tables drop columns rather than scroll sideways.
      for (const name of ["Period comparison", "Acquisition channels"]) {
        const scroller = page.getByRole("region", { name }).locator(".overflow-x-auto");
        expect(await scroller.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
      }
    });
  }
});

test.describe("analytics on mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "phone layout");

  test("fits a 375px screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openAnalytics(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBe(0);
  });
});
