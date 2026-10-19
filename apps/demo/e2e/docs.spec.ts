import { expect, test } from "@playwright/test";

test("documentation is in the HTML, even without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });

  const page = await context.newPage();
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Acme Store API" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upload an image" })).toBeVisible();
  await expect(page.locator("#products-get-a-product")).toContainText(
    "Retrieve a single product by its id.",
  );

  await context.close();
});

test("color mode toggle persists across reloads", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: "Switch to dark mode" }).click();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("code example tabs switch and stay in sync", async ({ page }) => {
  await page.goto("/");

  const section = page.locator("#products-create-a-product");
  await section.getByRole("tab", { name: "Python" }).click();

  await expect(
    section.locator('[data-yd-tab-panel="python"]').filter({ visible: true }),
  ).toHaveCount(1);

  await expect(section.locator('[data-yd-tab-panel="curl"]').filter({ visible: true })).toHaveCount(
    0,
  );

  // Every other example on the page follows the selected language.
  await expect(
    page.locator('#products-list-products [data-yd-tab-panel="python"]').filter({ visible: true }),
  ).toHaveCount(1);
});

test("copy section copies that section's Markdown", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");

  const section = page.locator("#products-get-a-product");
  await section.getByRole("button", { name: "Copy section" }).click();

  await expect(section.getByRole("button", { name: "Copied" })).toBeVisible();

  const text = await page.evaluate(() => navigator.clipboard.readText());

  expect(text).toContain("# Get a product");
  expect(text).not.toContain("Upload an image");
});

test("copy page copies the entire page", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto("/");
  await page.locator("#overview").getByRole("button", { name: "Copy page" }).click();

  await expect(page.locator("#overview").getByRole("button", { name: "Copied" })).toBeVisible();

  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/^# Acme Store API/);

  for (const name of ["Get a product", "Upload an image", "Order updates"]) {
    expect(text).toContain(`# ${name}`);
  }
});

test("navigation filter and mobile menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const sidebar = page.locator("#kiseki-sidebar");

  await expect(sidebar).toBeHidden();

  await page.getByRole("button", { name: "Open navigation" }).click();

  await expect(sidebar).toBeVisible();

  await sidebar.getByPlaceholder("Filter requests").fill("graph");
  await expect(sidebar.getByRole("link", { name: /Search products/ })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: /Log in/ })).toBeHidden();

  await sidebar.getByRole("link", { name: /Search products/ }).click();
  await expect(sidebar).toBeHidden();

  // The backdrop covers the content (not just the header) and closes the menu.
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(sidebar).toBeVisible();

  const covering = await page.evaluate(() => document.elementFromPoint(370, 600)?.closest("main"));
  expect(covering).toBeNull();

  await page.mouse.click(370, 600);
  await expect(sidebar).toBeHidden();
});

test("llms.txt and Markdown twins are served", async ({ request }) => {
  const llms = await request.get("/llms.txt");
  expect(await llms.text()).toMatch(/^# Acme Store API\n\n> /);
  const markdown = await request.get("/products/get-a-product.md");
  expect(markdown.headers()["content-type"]).toContain("text/markdown");
});

test.describe("environment switcher", () => {
  const curl = (page: import("@playwright/test").Page) =>
    page.locator('#products-list-products [data-yd-tab-panel="curl"]').filter({ visible: true });

  test("switches examples and variables, and remembers the choice", async ({ page }) => {
    await page.goto("/");
    await expect(curl(page)).toContainText("https://api.acme.dev/v1/stores/store_42/products");

    await page.getByRole("button", { name: /Change environment/ }).click();
    await page.getByRole("menuitemradio", { name: "Staging" }).click();

    await expect(curl(page)).toHaveCount(1);
    await expect(curl(page)).toContainText(
      "https://staging.api.acme.dev/v1/stores/store_test/products",
    );
    await expect(page.getByRole("cell", { name: "store_test", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "store_42", exact: true })).toBeHidden();

    await page.reload();
    await expect(page.getByRole("button", { name: /Change environment/ })).toContainText("Staging");
    await expect(curl(page)).toContainText("staging.api.acme.dev");
  });

  test("copy copies the selected environment's example", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/");
    await page.getByRole("button", { name: /Change environment/ }).click();
    await page.getByRole("menuitemradio", { name: "Staging" }).click();
    await page
      .locator('#products-list-products [data-yd="code-examples"]')
      .getByRole("button", { name: "Copy code" })
      .click();

    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
      "staging.api.acme.dev",
    );
  });

  test("request URLs show the environment's domain and can be copied", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");

    const url = page.locator("#products-get-a-product [data-yd=url]").filter({ visible: true });
    await expect(url).toHaveText("https://api.acme.dev/v1/products/:id");

    await page.getByRole("button", { name: /Change environment/ }).click();
    await page.getByRole("menuitemradio", { name: "Staging" }).click();
    await expect(url).toHaveText("https://staging.api.acme.dev/v1/products/:id");

    await page
      .locator("#products-get-a-product")
      .getByRole("button", { name: "Copy URL" })
      .filter({ visible: true })
      .click();

    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "https://staging.api.acme.dev/v1/products/prod_123",
    );
  });

  test("switching keeps the scroll position", async ({ page }) => {
    await page.goto("/#authentication-log-in");
    await page.waitForTimeout(800); // smooth scroll to the anchor

    const before = await page.evaluate(() => scrollY);

    // Real mouse clicks: Playwright's locator clicks scroll elements into view themselves.
    const trigger = await page.getByRole("button", { name: /Change environment/ }).boundingBox();
    await page.mouse.click(trigger!.x + trigger!.width / 2, trigger!.y + trigger!.height / 2);

    const item = await page.getByRole("menuitemradio", { name: "Staging" }).boundingBox();
    await page.mouse.click(item!.x + item!.width / 2, item!.y + item!.height / 2);
    await page.waitForTimeout(800);

    expect(await page.evaluate(() => scrollY)).toBe(before);
    await expect(page.getByRole("button", { name: /Change environment/ })).toBeFocused();
  });

  test("shows the default environment without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });

    const page = await context.newPage();
    await page.goto("/");

    await expect(curl(page)).toHaveCount(1);
    await expect(curl(page)).toContainText("api.acme.dev/v1");

    await context.close();
  });
});

test("Run in Yaak imports a sanitized export", async ({ page, request }) => {
  await page.goto("/");

  const button = page.getByRole("link", { name: "Run in Yaak" });
  const exportUrl = new URL("/yaak.json", page.url()).href;

  await expect(button).toHaveAttribute(
    "href",
    `https://yaak.app/button/run?${new URLSearchParams({ name: "Acme Store API", url: exportUrl })}`,
  );

  const shared = await request.get("/yaak.json");
  expect(shared.headers()["content-type"]).toContain("application/json");

  const text = await shared.text();
  expect(JSON.parse(text).resources.httpRequests.length).toBeGreaterThan(0);
  expect(text).not.toContain("secure(");
  expect(text).not.toContain("local-secret");
});

test("example responses are tabbed by status", async ({ page, request }) => {
  await page.goto("/");

  const section = page.locator("#products-get-a-product");
  const panel = section.locator('[data-yd="response-examples"]');

  await expect(panel.getByRole("tab", { name: "200 OK" })).toHaveAttribute("aria-selected", "true");
  await expect(panel.locator("[data-yd-tab-panel]").filter({ visible: true })).toContainText(
    '"prod_123"',
  );
  await panel.getByRole("tab", { name: "404 Not Found" }).click();
  await expect(panel.locator("[data-yd-tab-panel]").filter({ visible: true })).toContainText(
    "not_found",
  );

  // Response blocks are taken out of the description.
  await expect(section.locator('[data-yd="markdown"]')).not.toContainText("not_found");

  // Language tabs elsewhere are unaffected.
  await expect(
    page.locator('#products-list-products [data-yd-tab-panel="curl"]').filter({ visible: true }),
  ).toHaveCount(1);

  const markdown = await (await request.get("/products/get-a-product.md")).text();
  expect(markdown).toContain("## Example responses");
  expect(markdown).toContain("### 404 Not Found");
});
