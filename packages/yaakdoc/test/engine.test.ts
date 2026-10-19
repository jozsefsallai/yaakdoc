import { existsSync } from "node:fs";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { normalizeArgs } from "../src/cli/index";
import { build, eject, init, preview } from "../src/index";

const DEMO_EXPORT = new URL("../../../apps/demo/yaak.json", import.meta.url);

/** A fresh project directory containing only a Yaak export (named yaak.json). */
async function project() {
  const dir = await mkdtemp(join(tmpdir(), "yaakdoc-test-"));
  await cp(DEMO_EXPORT, join(dir, "yaak.json"));
  return dir;
}

describe("build (zero config, single page)", () => {
  let dir: string;
  let html: string;

  beforeAll(async () => {
    dir = await project();
    await build({ cwd: dir });
    html = await readFile(join(dir, "dist", "index.html"), "utf8");
  });

  it("renders the full documentation into static HTML", () => {
    expect(html).toContain("<title>Acme Store API</title>");

    for (const name of [
      "Log in",
      "Upload an image",
      "Search products",
      "Order updates",
      "Get stock level",
    ]) {
      expect(html).toContain(name);
    }

    expect(html).toContain("Exchange user credentials for an access token.");
    expect(html).not.toContain("eyJ0eXAi"); // secret from the export
  });

  it("links built assets and islands", () => {
    expect(html).toMatch(/<link rel="stylesheet" href="\/_yaakdoc\/client-[\w-]+\.css"/);
    expect(html).toMatch(/<script type="module" src="\/_yaakdoc\/client-[\w-]+\.js"/);
    expect(html).toContain('data-island="kiseki:page-actions"');
  });

  it("writes LLM-friendly outputs", async () => {
    const llms = await readFile(join(dir, "dist", "llms.txt"), "utf8");
    expect(llms.startsWith("# Acme Store API\n")).toBe(true);
    expect(existsSync(join(dir, "dist", "llms-full.txt"))).toBe(true);
    expect(await readFile(join(dir, "dist", "products", "get-a-product.md"), "utf8")).toContain(
      "# Get a product",
    );
    expect(html).toContain('<link rel="alternate" type="text/markdown" href="/index.md"');
  });

  it("writes a 404 page and no build leftovers", () => {
    expect(existsSync(join(dir, "dist", "404.html"))).toBe(true);
    expect(existsSync(join(dir, "dist", ".vite"))).toBe(false);
    expect(existsSync(join(dir, "dist", ".yaakdoc-ssr"))).toBe(false);
    expect(existsSync(join(dir, "node_modules"))).toBe(false);
  });
});

describe("build (per-request pages, base path, branding)", () => {
  it("renders a page per request under the base path", async () => {
    const dir = await project();

    await writeFile(join(dir, "logo.svg"), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    await writeFile(
      join(dir, "yaakdoc.config.json"),
      JSON.stringify({
        pages: "per-request",
        base: "/docs/",
        branding: {
          title: "Acme Docs",
          url: "https://acme.dev/docs",
          logo: "./logo.svg",
          colors: { primary: "#ff0066" },
        },
        llms: { full: false },
      }),
    );

    const { files } = await build({ cwd: dir });
    expect(files).toContain("products/get-a-product/index.html");
    expect(files).toContain("sitemap.xml");
    expect(files).not.toContain("llms-full.txt");

    const page = await readFile(
      join(dir, "dist", "products", "get-a-product", "index.html"),
      "utf8",
    );
    expect(page).toContain("<title>Get a product · Acme Docs</title>");
    expect(page).toContain('href="/docs/_yaakdoc/client-');
    expect(page).toContain(
      '<link rel="canonical" href="https://acme.dev/docs/products/get-a-product/"',
    );
    expect(page).toContain("--yd-color-primary:#ff0066");
    expect(page).toMatch(/src="\/docs\/_yaakdoc\/logo-[0-9a-f]{8}\.svg"/);

    const logo = files.find((file) => /^_yaakdoc\/logo-/.test(file));
    expect(logo && existsSync(join(dir, "dist", logo))).toBe(true);

    const llms = await readFile(join(dir, "dist", "llms.txt"), "utf8");
    expect(llms).toContain("(https://acme.dev/docs/products/get-a-product.md)");
  });

  it("publishes a sanitized export for Run in Yaak", async () => {
    const dir = await project();

    await writeFile(
      join(dir, "yaakdoc.config.json"),
      JSON.stringify({
        runInYaak: true,
        branding: { url: "https://acme.dev/docs" },
        base: "/docs/",
      }),
    );

    const { files } = await build({ cwd: dir });
    expect(files).toContain("yaak.json");

    const shared = await readFile(join(dir, "dist", "yaak.json"), "utf8");
    expect(shared).not.toContain("eyJ0eXAi");
    expect(shared).not.toContain("local-secret");

    const html = await readFile(join(dir, "dist", "index.html"), "utf8");
    expect(html).toContain(`url=${encodeURIComponent("https://acme.dev/docs/yaak.json")}`);
  });

  it("links to an external export without publishing one", async () => {
    const dir = await project();

    await writeFile(
      join(dir, "yaakdoc.config.json"),
      JSON.stringify({ runInYaak: { url: "https://example.com/openapi.json", name: "Acme" } }),
    );

    const { files } = await build({ cwd: dir });
    expect(files).not.toContain("yaak.json");
    expect(await readFile(join(dir, "dist", "index.html"), "utf8")).toContain(
      `name=Acme&amp;url=${encodeURIComponent("https://example.com/openapi.json")}`,
    );
  });

  it("refuses to empty the project directory", async () => {
    const dir = await project();
    await expect(build({ cwd: dir, overrides: { outDir: "." } })).rejects.toThrow(/Refusing/);
  });
});

describe("preview", () => {
  it("serves a built site", async () => {
    const dir = await project();

    await build({ cwd: dir });

    const server = await preview({ cwd: dir, port: 0 });

    try {
      expect((await fetch(server.url)).status).toBe(200);
      expect((await fetch(`${server.url}missing`)).status).toBe(404);
    } finally {
      await server.close();
    }
  });
});

describe("eject", () => {
  it("copies the theme and points the config at it", async () => {
    const dir = await project();

    const result = await eject({ cwd: dir });
    expect(result.files).toContain("theme.ts");
    expect(result.files).toContain("src/components/layout.tsx");
    expect(JSON.parse(await readFile(join(dir, "yaakdoc.config.json"), "utf8")).theme).toBe(
      "./theme",
    );
    await expect(eject({ cwd: dir })).rejects.toThrow(/already/);

    // The ejected theme builds without installing anything in the project.
    const layout = join(dir, "theme", "src", "components", "layout.tsx");

    await writeFile(
      layout,
      (await readFile(layout, "utf8")).replace("This page doesn’t exist", "Custom 404"),
    );

    await build({ cwd: dir });

    expect(await readFile(join(dir, "dist", "404.html"), "utf8")).toContain("Custom 404");
  });
});

describe("init", () => {
  it("writes a config with $schema and the detected export", async () => {
    const dir = await project();
    const { config } = await init({ cwd: dir, config: { pages: "per-request" } });
    expect(config).toMatchObject({ export: "./yaak.json", pages: "per-request" });
    expect(String(config.$schema)).toContain("config.schema.json");

    await expect(init({ cwd: dir })).rejects.toThrow(/already exists/);
  });
});

describe("cli", () => {
  it("defaults to the dev command", () => {
    expect(normalizeArgs([])).toEqual([]);
    expect(normalizeArgs(["./api.json", "--port", "3000"])).toEqual([
      "dev",
      "./api.json",
      "--port",
      "3000",
    ]);
    expect(normalizeArgs(["--open"])).toEqual(["dev", "--open"]);
    expect(normalizeArgs(["build", "--pages", "per-request"])).toEqual([
      "build",
      "--pages",
      "per-request",
    ]);
    expect(normalizeArgs(["--help"])).toEqual(["--help"]);
  });
});
