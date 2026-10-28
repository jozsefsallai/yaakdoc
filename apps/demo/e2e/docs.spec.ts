import { expect, test } from "@playwright/test";

test("documentation is in the HTML, even without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });

  const page = await context.newPage();
  await page.goto("/reference/");

  await expect(page.getByRole("heading", { level: 1, name: "Acme Store API" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upload an image" })).toBeVisible();
  await expect(page.locator("#products-get-a-product")).toContainText(
    "Retrieve a single product by its id.",
  );

  await context.close();
});

test("color mode toggle persists across reloads", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/reference/");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: "Switch to dark mode" }).click();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("code example tabs switch and stay in sync", async ({ page }) => {
  await page.goto("/reference/");

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
  await page.goto("/reference/");

  const section = page.locator("#products-get-a-product");
  await section.getByRole("button", { name: "Copy section" }).click();

  await expect(section.getByRole("button", { name: "Copied" })).toBeVisible();

  const text = await page.evaluate(() => navigator.clipboard.readText());

  expect(text).toContain("# Get a product");
  expect(text).not.toContain("Upload an image");
});

test("copy page copies the entire page", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto("/reference/");
  await page.locator("#overview").getByRole("button", { name: "Copy page" }).click();

  await expect(page.locator("#overview").getByRole("button", { name: "Copied" })).toBeVisible();

  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/^# Acme Store API/);

  for (const name of ["Get a product", "Upload an image", "Order updates"]) {
    expect(text).toContain(`# ${name}`);
  }
});

test("mobile menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/reference/");

  const sidebar = page.locator("#kiseki-sidebar");

  await expect(sidebar).toBeHidden();

  await page.getByRole("button", { name: "Open navigation" }).click();

  await expect(sidebar).toBeVisible();

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
  const markdown = await request.get("/reference/products/get-a-product.md");
  expect(markdown.headers()["content-type"]).toContain("text/markdown");
});

test.describe("environment switcher", () => {
  const curl = (page: import("@playwright/test").Page) =>
    page.locator('#products-list-products [data-yd-tab-panel="curl"]').filter({ visible: true });

  test("switches examples and variables, and remembers the choice", async ({ page }) => {
    await page.goto("/reference/");
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

    await page.goto("/reference/");
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
    await page.goto("/reference/");

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
    await page.goto("/reference/#authentication-log-in");
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
    await page.goto("/reference/");

    await expect(curl(page)).toHaveCount(1);
    await expect(curl(page)).toContainText("api.acme.dev/v1");

    await context.close();
  });
});

test("Run in Yaak imports a sanitized export", async ({ page, request }) => {
  await page.goto("/reference/");

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
  await page.goto("/reference/");

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

  const markdown = await (await request.get("/reference/products/get-a-product.md")).text();
  expect(markdown).toContain("## Example responses");
  expect(markdown).toContain("### 404 Not Found");
});

test.describe("custom pages", () => {
  test("the home page is the introduction, without JavaScript too", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });

    const page = await context.newPage();
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "Introduction" })).toBeVisible();
    await expect(page.locator("#content pre").filter({ visible: true })).toContainText(
      "https://api.acme.dev/v1",
    );
    await expect(page.locator("#content")).toContainText("Bearer {{api_token}}");
    await expect(page.locator("#content")).not.toContainText("eyJ0eXAi");

    await context.close();
  });

  test("variables follow the selected environment", async ({ page }) => {
    await page.goto("/quickstart/");

    const code = page.locator("#content pre").filter({ visible: true }).first();
    await expect(code).toContainText("https://api.acme.dev/v1/auth/login");

    await page.getByRole("button", { name: /Change environment/ }).click();
    await page.getByRole("menuitemradio", { name: "Staging" }).click();

    await expect(code).toContainText("https://staging.api.acme.dev/v1/auth/login");
    await expect(
      page.locator("#content").getByText("store_test").filter({ visible: true }),
    ).toHaveCount(2);
  });

  test("tabs switch the sidebar navigation", async ({ page }) => {
    await page.goto("/");

    const tabs = page.getByRole("navigation", { name: "Sections" });
    const sidebar = page.locator("#kiseki-sidebar");

    await expect(tabs.getByRole("link", { name: "Guides" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(sidebar.getByRole("link", { name: "Pagination" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /Upload an image/ })).toHaveCount(0);

    await tabs.getByRole("link", { name: "API Reference" }).click();

    await expect(page).toHaveURL(/\/reference\/$/);
    await expect(tabs.getByRole("link", { name: "API Reference" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(sidebar.getByRole("link", { name: /Upload an image/ })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Pagination" })).toHaveCount(0);
  });

  test("links between pages and to headings work", async ({ page }) => {
    await page.goto("/guides/authentication/");

    await expect(page.getByRole("img", { name: /token flow/ })).toBeVisible();
    await page
      .locator("#content [data-yd=markdown]")
      .getByRole("link", { name: "Quickstart" })
      .click();

    await expect(page).toHaveURL(/\/quickstart\/#1-get-a-token$/);
    await expect(page.getByRole("heading", { name: "1. Get a token" })).toBeInViewport();
  });

  test("previous and next links follow the navigation", async ({ page }) => {
    await page.goto("/guides/pagination/");

    const pages = page.getByRole("navigation", { name: "Pages" });
    await expect(pages.getByRole("link", { name: /Previous Authentication/ })).toBeVisible();
    await pages.getByRole("link", { name: /Next API Reference/ }).click();
    await expect(page).toHaveURL(/\/reference\/$/);
  });
});

test.describe("search", () => {
  // Wait until the search dialog island is interactive.
  const hydrated = (page: import("@playwright/test").Page) =>
    expect(page.locator('yd-island[data-island="kiseki:search"][data-hydrated]')).toBeAttached();

  test("opens with the keyboard and navigates to a result", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);
    await page.keyboard.press("ControlOrMeta+k");

    const dialog = page.getByRole("dialog", { name: "Search" });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("combobox").fill("list products");
    await expect(dialog.getByRole("option").first()).toContainText("List products");

    await dialog.getByRole("combobox").press("Enter");
    await expect(page).toHaveURL(/\/reference\/#products-list-products$/);
  });

  test("finds pages by description and opens from the sidebar", async ({ page }) => {
    await page.goto("/reference/");
    await hydrated(page);
    await page
      .locator("#kiseki-sidebar")
      .getByRole("button", { name: /Search/ })
      .click();

    const dialog = page.getByRole("dialog", { name: "Search" });
    await dialog.getByRole("combobox").fill("page through");

    await expect(dialog.getByRole("option")).toHaveCount(1);
    await dialog.getByRole("option", { name: /Pagination/ }).click();
    await expect(page).toHaveURL(/\/guides\/pagination\/$/);
  });

  test("closes with Escape without scrolling the page", async ({ page }) => {
    await page.goto("/reference/#authentication-log-in");
    await page.waitForTimeout(800);

    await hydrated(page);
    const before = await page.evaluate(() => scrollY);
    await page.keyboard.press("ControlOrMeta+k");
    await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Search" })).toBeHidden();

    expect(await page.evaluate(() => scrollY)).toBe(before);
  });
});
