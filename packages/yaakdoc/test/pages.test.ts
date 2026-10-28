import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { build } from "../src/index";
import { parseFrontMatter } from "../src/node/pages";
import { pagesProject } from "./helpers";

describe("build with custom pages", () => {
  let dir: string;

  const read = (file: string) => readFile(join(dir, "dist", file), "utf8");

  beforeAll(async () => {
    dir = await pagesProject();
    await build({ cwd: dir });
  });

  it("serves the index page at the root and moves the API reference", async () => {
    const home = await read("index.html");

    expect(home).toContain("<title>Acme Store API</title>");
    expect(home).toContain("Introduction");
    expect(home).toContain("https://api.acme.dev/v1");
    expect(home).toContain("https://staging.api.acme.dev/v1");
    expect(home).toContain("{{api_token}}");
    expect(home).not.toContain("eyJ0eXAi");
    expect(home).toContain('href="/guides/auth/#tokens"');

    const reference = await read("reference/index.html");
    expect(reference).toContain('id="products-get-a-product"');
    expect(reference).toContain('href="/reference/#products-get-a-product"');
  });

  it("renders pages from subdirectories, with ids and assets", async () => {
    const auth = await read("guides/auth/index.html");

    expect(auth).toContain('<h2 id="tokens">Tokens</h2>');
    expect(auth).toMatch(/<img src="\/_yaakdoc\/flow-[\w]+\.svg" alt="Flow">/);

    const image = auth.match(/\/_yaakdoc\/(flow-\w+\.svg)/)![1]!;
    expect(existsSync(join(dir, "dist", "_yaakdoc", image))).toBe(true);
  });

  it("writes Markdown twins, llms.txt and the search index", async () => {
    expect(await read("index.md")).toMatch(
      /^# Introduction\n\n> Start here\.\n\nBase URL: `https:\/\/api\.acme\.dev\/v1`/,
    );
    expect(await read("guides/auth.md")).toMatch(/^# Authentication\n\n## Tokens/);
    expect(await read("reference/index.md")).toMatch(/^# Acme Store API/);
    expect(await read("reference/products/get-a-product.md")).toContain("# Get a product");

    const llms = await read("llms.txt");
    expect(llms).toContain("- [Introduction](/index.md): Start here.");
    expect(llms).toContain("(/reference/products/get-a-product.md)");
    expect(await read("llms-full.txt")).toContain("## Authentication\n\n## Tokens");

    const search = JSON.parse(await read("_yaakdoc/search.json"));
    expect(search[0]).toMatchObject({ title: "Introduction", href: "/", kind: "page" });
    expect(search).toContainEqual(
      expect.objectContaining({ title: "Get a product", kind: "request", method: "GET" }),
    );
  });
});

describe("build with an explicit apiPath", () => {
  it("serves per-request reference pages under it", async () => {
    const dir = await pagesProject({
      apiPath: "api",
      navigation: { pages: ["guides/auth", { api: true }] },
      pages: "per-request",
    });
    await build({ cwd: dir });

    // `index.md` isn't in the navigation, but still lives at the root.
    const root = await readFile(join(dir, "dist", "index.html"), "utf8");
    expect(root).toContain("Introduction");

    const request = await readFile(
      join(dir, "dist", "api", "products", "get-a-product", "index.html"),
      "utf8",
    );
    expect(request).toContain("Get a product");
  });

  it("writes a redirect when nothing lives at the root", async () => {
    const dir = await pagesProject({ apiPath: "api", search: false });
    await rm(join(dir, "docs", "index.md"));

    await build({ cwd: dir });

    const root = await readFile(join(dir, "dist", "index.html"), "utf8");
    expect(root).toContain('http-equiv="refresh" content="0; url=/guides/auth/"');
    expect(existsSync(join(dir, "dist", "_yaakdoc", "search.json"))).toBe(false);
  });
});

describe("parseFrontMatter", () => {
  it("splits YAML front matter from the body", () => {
    expect(parseFrontMatter("---\ntitle: Hi\norder: 2\n---\n\nBody")).toEqual({
      data: { title: "Hi", order: 2 },
      body: "\nBody",
    });
    expect(parseFrontMatter("---\n---\nBody")).toEqual({ data: {}, body: "Body" });
    expect(parseFrontMatter("\uFEFF---\ntitle: BOM\n---\nBody")).toEqual({
      data: { title: "BOM" },
      body: "Body",
    });
    expect(parseFrontMatter("No front matter\n---\n")).toEqual({
      data: {},
      body: "No front matter\n---\n",
    });
    expect(() => parseFrontMatter("---\ntitle: [\n---\n", "x.md")).toThrow(/x\.md/);
  });
});
