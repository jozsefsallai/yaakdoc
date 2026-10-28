import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildSearchIndex,
  createPageDoc,
  findNavigationTab,
  flattenNavigation,
  normalize,
  type PageDoc,
  pageSlug,
  prepareDocument,
  resolveNavigation,
  selectEnvironment,
} from "../src/index";

const ws = normalize(
  JSON.parse(readFileSync(new URL("./fixtures/current.json", import.meta.url), "utf8")),
).workspaces[0]!;

const page = (path: string, body = "", data: Record<string, unknown> = {}) =>
  createPageDoc({ path, body, data });

const prepare = (overrides: Partial<Parameters<typeof prepareDocument>[0]> = {}) =>
  prepareDocument({
    workspace: ws,
    environment: selectEnvironment(ws),
    environments: ws.environments.filter((env) => env.public),
    pages: "single",
    base: "/",
    variables: { resolve: true, hide: ["token", "password", "secret"] },
    renderMarkdown: (md) => `<p>${md}</p>`,
    highlight: (code) => `<pre>${code}</pre>`,
    examples: () => [],
    ...overrides,
  });

describe("createPageDoc", () => {
  it("reads front matter and falls back to the first heading or the file name", () => {
    expect(
      page("guides/auth.md", "Body", { title: "Auth", order: 2, sidebarTitle: "Login" }),
    ).toMatchObject({
      id: "guides/auth",
      slug: "guides/auth",
      title: "Auth",
      sidebarTitle: "Login",
      order: 2,
      hidden: false,
      body: "Body",
    });

    expect(page("intro.md", "# Welcome\n\nHello")).toMatchObject({
      title: "Welcome",
      body: "Hello",
    });

    expect(page("getting-started.md", "Text\n\n# Later")).toMatchObject({
      title: "Getting started",
      body: "Text\n\n# Later",
    });
  });

  it("computes slugs", () => {
    expect(pageSlug("index")).toBe("");
    expect(pageSlug("guides/index")).toBe("guides");
    expect(pageSlug("Guides/Getting Started")).toBe("guides/getting-started");
  });
});

describe("resolveNavigation", () => {
  const pages: PageDoc[] = [
    page("index", "", { title: "Introduction" }),
    page("quickstart", "", { order: 1 }),
    page("changelog", ""),
    page("guides/pagination", ""),
    page("guides/authentication", "", { order: 1 }),
    page("secret", "", { hidden: true }),
  ];

  const href = (target: { type: "api" } | { type: "page"; id: string }) =>
    target.type === "api" ? "/reference/" : `/${target.id}/`;

  it("generates the navigation from the directories and appends the API reference", () => {
    const nav = resolveNavigation(undefined, pages, { href });

    expect(nav.tabs).toHaveLength(1);
    expect(nav.tabs[0]).toMatchObject({ title: null, href: "/index/" });
    expect(nav.tabs[0]!.items).toEqual([
      { type: "page", id: "index" },
      { type: "page", id: "quickstart" },
      { type: "page", id: "changelog" },
      {
        type: "group",
        title: "Guides",
        icon: null,
        expanded: true,
        items: [
          { type: "page", id: "guides/authentication" },
          { type: "page", id: "guides/pagination" },
        ],
      },
      {
        type: "group",
        title: "API Reference",
        icon: null,
        expanded: true,
        items: [{ type: "api" }],
      },
    ]);
  });

  it("is only the API reference without pages", () => {
    expect(resolveNavigation(undefined, [], { href }).tabs).toEqual([
      { id: "docs", title: null, icon: null, href: "/reference/", items: [{ type: "api" }] },
    ]);
  });

  it("resolves tabs, groups and pages", () => {
    const nav = resolveNavigation(
      {
        tabs: [
          {
            tab: "Guides",
            pages: ["index"],
            groups: [
              {
                group: "Basics",
                pages: ["./quickstart.md", { group: "More", pages: ["changelog"] }],
              },
            ],
          },
          { tab: "API", api: true },
        ],
      },
      pages,
      { href },
    );

    expect(nav.tabs.map((tab) => [tab.id, tab.title, tab.href])).toEqual([
      ["guides", "Guides", "/index/"],
      ["api", "API", "/reference/"],
    ]);

    expect(flattenNavigation(nav).map((entry) => [entry.target, entry.groups])).toEqual([
      [{ type: "page", id: "index" }, []],
      [{ type: "page", id: "quickstart" }, ["Basics"]],
      [{ type: "page", id: "changelog" }, ["Basics", "More"]],
      [{ type: "api" }, []],
    ]);

    expect(findNavigationTab(nav, { type: "api" }).id).toBe("api");
    expect(findNavigationTab(nav, { type: "page", id: "changelog" }).id).toBe("guides");
  });

  it("appends the API reference as a tab or group when it isn't placed", () => {
    const tabs = resolveNavigation({ tabs: [{ tab: "Guides", pages: ["index"] }] }, pages, {
      href,
    });

    expect(tabs.tabs.at(-1)).toMatchObject({ title: "API Reference", items: [{ type: "api" }] });

    const flat = resolveNavigation({ pages: ["index", { api: true }] }, pages, { href });
    expect(flat.tabs[0]!.items).toEqual([{ type: "page", id: "index" }, { type: "api" }]);
  });

  it("rejects unknown pages and a duplicate API reference", () => {
    expect(() => resolveNavigation({ pages: ["nope"] }, pages, { href })).toThrow(/"nope"/);

    expect(() =>
      resolveNavigation({ pages: [{ api: true }, { group: "X", api: true }] }, pages, { href }),
    ).toThrow(/only appear once/);
  });
});

describe("prepareDocument with pages", () => {
  const customPages = [
    page("index", "Base URL: ${[ base_url ]}\n\nToken: ${[ api_token ]}", {
      title: "Introduction",
    }),
    page("static", "No variables here."),
  ];

  it("renders variants per environment, with secrets left as placeholders", async () => {
    const doc = await prepare({ customPages, apiPath: "reference" });
    const intro = doc.pages.index!;

    expect(intro).toMatchObject({ href: "/", markdownUrl: "/index.md", title: "Introduction" });

    const [prod, staging] = doc.environments.map((env) => env.id);

    expect(intro.html).toBe(
      `<div data-yd-env="${prod}"><p>Base URL: https://api.acme.dev/v1\n\nToken: {{api_token}}</p></div>` +
        `<div data-yd-env="${staging}" hidden><p>Base URL: https://staging.api.acme.dev/v1\n\nToken: {{api_token}}</p></div>`,
    );

    expect(intro.markdown).toContain("https://api.acme.dev/v1");
    expect(JSON.stringify(doc.pages)).not.toContain("eyJ0eXAi");

    expect(doc.pages.static!.html).toBe("<p>No variables here.</p>");
  });

  it("never resolves template functions", async () => {
    const doc = await prepare({ customPages: [page("x", "${[ secure('abc') ]}")] });
    expect(doc.pages.x!.html).toBe("<p>{{secure}}</p>");
  });

  it("moves the API reference under apiPath", async () => {
    const doc = await prepare({ customPages, apiPath: "reference" });

    expect(doc.referenceBase).toBe("/reference/");
    expect(doc.requests.rq_get_product).toMatchObject({
      href: "/reference/#products-get-a-product",
      markdownUrl: "/reference/products/get-a-product.md",
    });
    expect(doc.navigation.tabs[0]!.href).toBe("/");
  });

  it("rejects pages that collide with the API reference", async () => {
    await expect(prepare({ customPages })).rejects.toThrow(/the API overview/);
    await expect(prepare({ customPages: [page("products", "")] })).rejects.toThrow(
      /the folder "Products"/,
    );
    await expect(
      prepare({ customPages: [page("reference/x", "")], apiPath: "reference" }),
    ).rejects.toThrow(/inside the API reference path/);
  });

  it("builds a search index", async () => {
    const doc = await prepare({ customPages, apiPath: "reference" });
    const index = buildSearchIndex(doc);

    expect(index[0]).toEqual({
      title: "Introduction",
      description: "Base URL: https://api.acme.dev/v1",
      href: "/",
      kind: "page",
      section: "",
    });
    expect(index.find((entry) => entry.title === "Get a product")).toMatchObject({
      kind: "request",
      method: "GET",
      href: "/reference/#products-get-a-product",
      section: "API Reference › Products",
    });
  });
});
