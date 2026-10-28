import { expect, test } from "@playwright/test";

test("the app keeps its own pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Acme Store" })).toBeVisible();
});

test("the docs are served at /docs", async ({ page }) => {
  for (const path of ["/docs", "/docs/"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: "Acme Store API" })).toBeVisible();
  }
});

test("nested docs pages work, with or without a trailing slash", async ({ page }) => {
  for (const path of ["/docs/products/get-a-product/", "/docs/products/get-a-product"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: "Get a product" })).toBeVisible();
  }

  await page.getByRole("link", { name: "Upload an image" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Upload an image" })).toBeVisible();
});

test("the docs' islands hydrate", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/docs/");

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("LLM-friendly files are served", async ({ request }) => {
  const llms = await request.get("/docs/llms.txt");
  expect(llms.ok()).toBe(true);
  expect(await llms.text()).toMatch(/^# Acme Store API/);

  const markdown = await request.get("/docs/index.md");
  expect(markdown.ok()).toBe(true);
});

test("unknown docs pages are 404s", async ({ request }) => {
  expect((await request.get("/docs/nope/")).status()).toBe(404);
});
