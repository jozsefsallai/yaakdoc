import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "vite";
import { beforeAll, describe, expect, it } from "vitest";
import { yaakdoc } from "../src/vite";
import { hostApp } from "./helpers";

describe("Vite plugin (build)", () => {
  let dir: string;

  beforeAll(async () => {
    dir = await hostApp();
    await build({
      root: dir,
      configFile: false,
      logLevel: "silent",
      plugins: [yaakdoc({ path: "/reference", config: { pages: "per-request" } })],
    });
  });

  it("adds the docs to the app's output under the mount path", async () => {
    const html = await readFile(join(dir, "dist", "reference", "index.html"), "utf8");
    expect(html).toContain("Acme Store API");
    expect(html).toMatch(/src="\/reference\/_yaakdoc\/client-[\w-]+\.js"/);

    expect(
      existsSync(join(dir, "dist", "reference", "products", "get-a-product", "index.html")),
    ).toBe(true);
    expect(existsSync(join(dir, "dist", "reference", "llms.txt"))).toBe(true);
  });

  it("leaves the app alone", async () => {
    expect(await readFile(join(dir, "dist", "index.html"), "utf8")).toContain("<h1>Host</h1>");
    expect(existsSync(join(dir, "dist", "robots.txt"))).toBe(true);
    // The app's public folder isn't copied into the docs.
    expect(existsSync(join(dir, "dist", "reference", "robots.txt"))).toBe(false);
  });
});
