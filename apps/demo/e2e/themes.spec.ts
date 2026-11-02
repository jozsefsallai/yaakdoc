import { expect, type Page, test } from "@playwright/test";

/**
 * Smoke tests for the official themes other than Kiseki (which `docs.spec.ts` covers in depth).
 * `pnpm build:themes` builds the demo with each of them under `/<theme>/`.
 */
const THEMES = ["terminal", "blueprint", "editorial"] as const;

for (const theme of THEMES) {
  const base = `/${theme}/`;

  // Wait until an island of this theme is interactive.
  const hydrated = (page: Page, name: string) =>
    expect(
      page.locator(`yd-island[data-island="${theme}:${name}"][data-hydrated]`).first(),
    ).toBeAttached();

  test.describe(theme, () => {
    test("documentation is in the HTML, even without JavaScript", async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });

      const page = await context.newPage();
      await page.goto(`${base}reference/`);

      await expect(page.getByRole("heading", { level: 1, name: "Acme Store API" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Upload an image" })).toBeVisible();
      await expect(page.locator("#products-get-a-product")).toContainText(
        "Retrieve a single product by its id.",
      );

      // The default environment's examples show without JavaScript.
      await expect(
        page
          .locator('#products-list-products [data-yd-tab-panel="curl"]')
          .filter({ visible: true }),
      ).toContainText("api.acme.dev/v1");

      await context.close();
    });

    test("renders without console errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(error.message));

      // The 404 page directly: the preview server answers unknown paths with the root (Kiseki) one.
      for (const path of ["", "reference/", "guides/authentication/", "404.html"]) {
        await page.goto(`${base}${path}`);
        await hydrated(page, "theme-toggle");
      }

      expect(errors).toEqual([]);
    });

    test("color mode toggle persists across reloads", async ({ page }) => {
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto(`${base}reference/`);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

      await hydrated(page, "theme-toggle");
      await page.getByRole("button", { name: "Switch to dark mode" }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    });

    test("code example tabs switch and stay in sync", async ({ page }) => {
      await page.goto(`${base}reference/`);

      const section = page.locator("#products-create-a-product");
      await section.getByRole("tab", { name: "Python" }).click();

      await expect(
        section.locator('[data-yd-tab-panel="python"]').filter({ visible: true }),
      ).toHaveCount(1);
      await expect(
        page
          .locator('#products-list-products [data-yd-tab-panel="python"]')
          .filter({ visible: true }),
      ).toHaveCount(1);
    });

    test("example responses are tabbed by status", async ({ page }) => {
      await page.goto(`${base}reference/`);

      const responses = page.locator('#authentication-log-in [data-yd="response-examples"]');
      await responses.getByRole("tab", { name: "401" }).click();
      await expect(
        responses.locator("[data-yd-tab-panel]").filter({ visible: true }),
      ).toHaveAttribute("data-status", "401");
    });

    test("copy section copies that section's Markdown", async ({ page, context }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto(`${base}reference/`);

      const section = page.locator("#products-get-a-product");
      await hydrated(page, "page-actions");
      await section.getByRole("button", { name: "Copy section" }).click();
      await expect(section.getByRole("button", { name: "Copied" })).toBeVisible();

      const text = await page.evaluate(() => navigator.clipboard.readText());
      expect(text).toContain("# Get a product");
      expect(text).not.toContain("Upload an image");
    });

    test("environment switcher changes the examples and is remembered", async ({ page }) => {
      const curl = page
        .locator('#products-list-products [data-yd-tab-panel="curl"]')
        .filter({ visible: true });

      await page.goto(`${base}reference/`);
      await hydrated(page, "environment");
      await page.getByRole("button", { name: /Change environment/ }).click();
      await page.getByRole("menuitemradio", { name: "Staging" }).click();

      await expect(curl).toContainText(
        "https://staging.api.acme.dev/v1/stores/store_test/products",
      );

      await page.reload();
      await expect(page.getByRole("button", { name: /Change environment/ })).toContainText(
        "Staging",
      );
      await expect(curl).toContainText("staging.api.acme.dev");
    });

    test("search opens with the keyboard and navigates to a result", async ({ page }) => {
      await page.goto(base);
      await hydrated(page, "search");
      await page.keyboard.press("ControlOrMeta+k");

      const dialog = page.getByRole("dialog", { name: "Search" });
      await expect(dialog).toBeVisible();

      await dialog.getByRole("combobox").fill("list products");
      await expect(dialog.getByRole("option").first()).toContainText("List products");

      await dialog.getByRole("combobox").press("Enter");
      await expect(page).toHaveURL(new RegExp(`${base}reference/#products-list-products$`));
    });

    test("mobile menu", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${base}reference/`);

      const sidebar = page.locator(`#${theme}-sidebar`);
      await expect(sidebar).toBeHidden();

      await hydrated(page, "mobile-nav");
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(sidebar).toBeVisible();

      await sidebar.getByRole("link", { name: /Search products/ }).click();
      await expect(sidebar).toBeHidden();
    });
  });
}

test.describe("terminal keyboard shortcuts", () => {
  test("/ opens search, and [ and ] go to the previous and next page", async ({ page }) => {
    await page.goto("/terminal/guides/authentication/");
    await expect(
      page.locator('yd-island[data-island="terminal:keys"][data-hydrated]'),
    ).toBeAttached();

    await page.keyboard.press("/");
    await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible();

    // Typing "]" in the search field doesn't navigate.
    await page.keyboard.press("]");
    await expect(page).toHaveURL(/\/terminal\/guides\/authentication\/$/);

    await page.keyboard.press("Escape");
    await page.keyboard.press("]");
    await expect(page).toHaveURL(/\/terminal\/guides\/pagination\/$/);

    await page.keyboard.press("[");
    await expect(page).toHaveURL(/\/terminal\/guides\/authentication\/$/);
  });
});
