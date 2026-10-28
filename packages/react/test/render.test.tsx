import { readFileSync } from "node:fs";
import { createPageDoc, normalize, prepareDocument, selectEnvironment } from "@yaakdoc/core";
import { describe, expect, it } from "vitest";
import {
  Content,
  MethodBadge,
  Navigation,
  NavTabs,
  NavTree,
  type PageData,
  type SiteData,
  type ThemeRuntime,
} from "../src/index";
import { renderPage } from "../src/server";

const ws = normalize(
  JSON.parse(
    readFileSync(new URL("../../core/test/fixtures/current.json", import.meta.url), "utf8"),
  ),
).workspaces[0]!;

const document = await prepareDocument({
  workspace: ws,
  environment: selectEnvironment(ws),
  pages: "single",
  base: "/",
  variables: { resolve: true, hide: ["token"] },
  renderMarkdown: (md) => `<p>${md}</p>`,
  highlight: (code) => `<pre><code>${code}</code></pre>`,
  examples: (req) => [
    { id: "curl", label: "cURL", language: "bash", code: `curl ${req.url}` },
    { id: "js", label: "JS", language: "js", code: `fetch("${req.url}")` },
  ],
});

const site: SiteData = {
  title: "Acme",
  description: "Acme API",
  url: "https://docs.acme.dev",
  base: "/",
  pages: "single",
  logo: null,
  favicon: null,
  colors: { primary: "#7c3aed", dark: { primary: "#a78bfa" } },
  fonts: {},
  links: [],
  footerHtml: null,
  defaultColorMode: "system",
  colorModeToggle: true,
  llms: {
    enabled: true,
    full: true,
    copyButton: true,
    openIn: ["claude"],
    txtUrl: "/llms.txt",
    fullTxtUrl: null,
  },
  showVariables: true,
  searchUrl: "/_yaakdoc/search.json",
  runInYaak: { name: "Acme API", dataUrl: "/yaak.json" },
  head: [],
  themeOptions: {},
  generator: "yaakdoc test",
};

const page: PageData = {
  kind: "index",
  id: null,
  path: "/",
  title: "",
  description: "",
  markdownUrl: "/index.md",
};

const assets = { styles: ["/a.css"], scripts: ["/a.js"], inlineStyles: [], modulePreloads: [] };

const Layout: ThemeRuntime["Layout"] = () => (
  <div>
    <NavTree />
    <Content />
  </div>
);

describe("renderPage", () => {
  it("renders the full documentation into static HTML", async () => {
    const html = await renderPage({ theme: { Layout }, document, site, page, assets });

    expect(html.startsWith("<!DOCTYPE html><html")).toBe(true);
    expect(html).toContain("<title>Acme</title>");
    expect(html).toContain('id="products-get-a-product"');
    expect(html).toContain('<link rel="alternate" type="text/markdown" href="/index.md"');
    expect(html).toContain(":root{--yd-color-primary:#7c3aed}");
    expect(html).toContain('<script type="module" src="/a.js">');

    // islands are serialized with their props
    expect(html).toMatch(
      /<yd-island data-island="yd:tab-list" data-props="\{&quot;group&quot;:&quot;ex-products-get-a-product&quot;/,
    );

    // open-in links use the absolute markdown URL
    expect(html).toContain(encodeURIComponent("https://docs.acme.dev/products/get-a-product.md"));

    // "Run in Yaak" links to Yaak's button endpoint with the absolute export URL
    expect(html).toContain(
      `https://yaak.app/button/run?${new URLSearchParams({ name: "Acme API", url: "https://docs.acme.dev/yaak.json" })}`.replaceAll(
        "&",
        "&amp;",
      ),
    );

    // second code example panel is hidden until JS switches tabs
    expect(html).toMatch(/data-yd-tab-panel="js"[^>]*hidden=""/);
  });

  it("preloads fonts, except roles the branding replaces", async () => {
    const fontPreloads = [
      { href: "/sans.woff2", role: "sans" as const },
      { href: "/mono.woff2", role: "mono" as const },
    ];

    const html = await renderPage({
      theme: { Layout },
      document,
      site: { ...site, fonts: { sans: '"Inter", sans-serif' } },
      page,
      assets: { ...assets, fontPreloads },
    });

    expect(html).toContain(
      '<link rel="preload" href="/mono.woff2" as="font" type="font/woff2" crossorigin=""/>',
    );
    expect(html).not.toContain("/sans.woff2");
  });

  it("applies component overrides everywhere", async () => {
    const theme: ThemeRuntime = {
      Layout,
      components: {
        MethodBadge: ({ request }: { request: { kind: string } }) => (
          <b data-custom>{request.kind}</b>
        ),
      },
    };

    const html = await renderPage({ theme, document, site, page, assets });

    expect(html).toContain('<b data-custom="true">http</b>');
    expect(html).not.toContain('data-yd="method"');
    expect(MethodBadge.displayName).toBe("MethodBadge");
  });
});

describe("custom pages", async () => {
  const withPages = await prepareDocument({
    workspace: ws,
    environment: selectEnvironment(ws),
    environments: ws.environments.filter((env) => env.public),
    pages: "single",
    base: "/",
    apiPath: "reference",
    customPages: [
      createPageDoc({ path: "index.md", body: "# Welcome\n\nCall ${[ base_url ]}." }),
      createPageDoc({ path: "guides/auth.md", body: "Auth", data: { title: "Auth" } }),
    ],
    navigation: {
      tabs: [
        { tab: "Guides", pages: ["index"], groups: [{ group: "Basics", pages: ["guides/auth"] }] },
        { tab: "API", api: true },
      ],
    },
    variables: { resolve: true, hide: ["token"] },
    renderMarkdown: (md) => `<p>${md}</p>`,
    highlight: (code) => `<pre><code>${code}</code></pre>`,
    examples: () => [],
  });

  const PagesLayout: ThemeRuntime["Layout"] = () => (
    <div>
      <NavTabs />
      <Navigation />
      <Content />
    </div>
  );

  const render = (page: PageData) =>
    renderPage({ theme: { Layout: PagesLayout }, document: withPages, site, page, assets });

  it("renders a page with one variant per environment, its tab and navigation", async () => {
    const html = await render({
      kind: "page",
      id: "index",
      path: "/",
      title: "",
      description: "",
      markdownUrl: "/index.md",
    });

    expect(html).toContain("<h1>Welcome</h1>");
    expect(html).toMatch(
      /<div data-yd-env="[^"]+"><p>Call https:\/\/api\.acme\.dev\/v1\.<\/p><\/div>/,
    );
    expect(html).toContain("https://staging.api.acme.dev/v1");
    expect(html).toMatch(/<a href="\/" data-yd="nav-tab" aria-current="page">/);
    expect(html).toContain('data-yd="nav-group-title"');
    expect(html).toContain('<a href="/guides/auth/" rel="next"');
    expect(html).not.toContain('aria-label="API reference"');
  });

  it("shows the API reference tab on reference pages", async () => {
    const html = await render({
      kind: "index",
      id: null,
      path: "/reference/",
      title: "API Reference",
      description: "",
      markdownUrl: "/reference/index.md",
    });

    expect(html).toMatch(/<a href="\/reference\/" data-yd="nav-tab" aria-current="page">/);
    expect(html).toContain('aria-label="API reference"');
    expect(html).toContain('href="/reference/#products-get-a-product"');
  });
});
