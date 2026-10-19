import { cp, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDevServer } from "../src/index";

// Runs in its own file (worker): React's development build is loaded here, the production build in
// the build tests.
const FIXTURE_EXPORT = new URL("../../core/test/fixtures/current.json", import.meta.url);

describe("dev server", () => {
  let server: Awaited<ReturnType<typeof createDevServer>>;
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "yaakdoc-test-"));
    await cp(FIXTURE_EXPORT, join(dir, "yaak.json"));
    server = await createDevServer({ cwd: dir, port: 0, watch: false });
  });

  afterAll(() => server?.close());

  it("server-renders pages", async () => {
    const response = await fetch(server.url, { headers: { accept: "text/html" } });
    expect(response.status).toBe(200);

    const html = await response.text();
    expect(html).toContain("Upload an image");
    expect(html).toContain("/@vite/client");
    expect(html).toContain("data-vite-dev-id");
  });

  it("serves Markdown, llms.txt and content negotiation", async () => {
    expect(await (await fetch(`${server.url}llms.txt`)).text()).toMatch(/^# Acme Store API/);

    const md = await fetch(`${server.url}products/get-a-product.md`);
    expect(md.headers.get("content-type")).toContain("text/markdown");

    const negotiated = await fetch(server.url, { headers: { accept: "text/markdown" } });
    expect(await negotiated.text()).toMatch(/^# Acme Store API/);
  });

  it("returns 404 for unknown pages", async () => {
    const response = await fetch(`${server.url}nope/`, { headers: { accept: "text/html" } });
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("doesn’t exist");
  });
});
