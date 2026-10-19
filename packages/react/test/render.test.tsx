import { readFileSync } from "node:fs";
import { normalize, prepareDocument, selectEnvironment } from "@yaakdoc/core";
import { describe, expect, it } from "vitest";
import {
  Content,
  MethodBadge,
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
