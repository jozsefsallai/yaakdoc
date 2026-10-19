import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalize, prepareDocument, REDACTED, selectEnvironment, summarize } from "../src/index";

const ws = normalize(
  JSON.parse(readFileSync(new URL("./fixtures/current.json", import.meta.url), "utf8")),
).workspaces[0]!;

const prepare = (overrides: Partial<Parameters<typeof prepareDocument>[0]> = {}) =>
  prepareDocument({
    workspace: ws,
    environment: selectEnvironment(ws),
    pages: "single",
    base: "/",
    variables: { resolve: true, hide: ["token", "password", "secret"] },
    renderMarkdown: (md) => `<p>${md}</p>`,
    highlight: (code) => `<pre>${code}</pre>`,
    examples: (req) => [{ id: "x", label: "X", language: "text", code: req.url }],
    ...overrides,
  });

describe("prepareDocument", () => {
  it("computes links per pages mode and base", async () => {
    const single = await prepare();
    expect(single.requests.rq_get_product).toMatchObject({
      href: "/#products-get-a-product",
      markdownUrl: "/products/get-a-product.md",
      resolvedUrl: "https://api.acme.dev/v1/products/prod_123",
    });

    const multi = await prepare({ pages: "per-request", base: "/docs/" });
    expect(multi.requests.rq_get_product).toMatchObject({
      href: "/docs/products/get-a-product/",
      markdownUrl: "/docs/products/get-a-product.md",
    });
    expect(multi.folders.fl_products?.href).toBe("/docs/products/");
  });

  it("formats templates for display and redacts secrets", async () => {
    const doc = await prepare();
    const req = doc.requests.rq_create_product!;

    expect(req.url).toBe("{{base_url}}/products");
    expect(
      req.kind === "http" && req.headers.find((h) => h.name === "Idempotency-Key")?.value,
    ).toBe("{{uuid.v4}}");
    expect(doc.variables.find((v) => v.name === "api_token")?.value).toBe(REDACTED);
    expect(doc.variables.find((v) => v.name === "base_url")?.value).toBe("https://api.acme.dev/v1");
    expect(JSON.stringify(doc)).not.toContain("eyJ0eXAi");
  });

  it("highlights bodies and renders descriptions", async () => {
    const doc = await prepare();

    expect(doc.requests.rq_create_product?.bodyHtml).toContain("Running shoes");
    expect(doc.requests.rq_login?.descriptionHtml).toMatch(/^<p>Exchange/);
    expect(doc.requests.rq_login?.summary).toBe("Exchange user credentials for an access token.");
  });

  it("prepares a variant per selectable environment", async () => {
    const doc = await prepare({ environments: ws.environments.filter((env) => env.public) });

    expect(doc.environments.map((env) => env.name)).toEqual(["Production", "Staging"]);
    expect(doc.requests.rq_list_products?.variants.map((v) => v.resolvedUrl)).toEqual([
      "https://api.acme.dev/v1/stores/store_42/products?page=1&limit=20&sort=-created_at",
      "https://staging.api.acme.dev/v1/stores/store_test/products?page=1&limit=20&sort=-created_at",
    ]);
    expect(doc.requests.rq_get_product?.variants.map((v) => v.url)).toEqual([
      "https://api.acme.dev/v1/products/:id",
      "https://staging.api.acme.dev/v1/products/:id",
    ]);
    expect(doc.requests.rq_create_product?.variants[0]?.url).toBe(
      "https://api.acme.dev/v1/products",
    );
    expect(doc.requests.rq_list_products?.variants.map((v) => v.url)).toEqual([
      "https://api.acme.dev/v1/stores/{{store_id}}/products",
      "https://staging.api.acme.dev/v1/stores/{{store_id}}/products",
    ]);
    expect(doc.variableSets[1]?.variables.find((v) => v.name === "store_id")?.value).toBe(
      "store_test",
    );
    expect((await prepare()).environments).toEqual([]);
  });

  it("filters with include/exclude globs", async () => {
    const doc = await prepare({
      filter: { exclude: ["products/images", "graphql/**"], include: [] },
    });

    expect(doc.requests.rq_upload_image).toBeUndefined();
    expect(doc.requests.rq_graphql).toBeUndefined();
    expect(doc.folders.fl_graphql).toBeUndefined();
    expect(doc.requests.rq_get_product).toBeDefined();

    const only = await prepare({ filter: { include: ["orders"] } });

    expect(Object.keys(only.requests).sort()).toEqual([
      "rq_create_order",
      "rq_list_orders",
      "rq_xml",
    ]);
  });
});

describe("example responses", () => {
  it("are extracted from descriptions and highlighted", async () => {
    const withResponses = structuredClone(ws);
    withResponses.requests.rq_get_product!.description =
      "Get it.\n\n```response:200\n{}\n```\n\n```response:418\nteapot\n```";

    const doc = await prepare({ workspace: withResponses });
    const req = doc.requests.rq_get_product!;

    expect(req.description).toBe("Get it.");
    expect(req.responses.map((r) => [r.label, r.language, r.html])).toEqual([
      ["200 OK", "json", "<pre>{}</pre>"],
      ["418", "text", "<pre>teapot</pre>"],
    ]);
  });
});

describe("summarize", () => {
  it("returns the first sentence as plain text", () => {
    expect(summarize("Hello **world**. More text.\n\nSecond")).toBe("Hello world.");
    expect(summarize("See [the docs](https://x.y) now")).toBe("See the docs now");
    expect(summarize("```js\ncode\n```\n\nReal text")).toBe("Real text");
  });
});
