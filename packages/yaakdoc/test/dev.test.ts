import { cp, mkdtemp } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDevServer, type YaakdocMiddleware, yaakdocMiddleware } from "../src/index";
import { yaakdoc } from "../src/vite";
import { FIXTURE_EXPORT, hostApp } from "./helpers";

// Runs in its own file (worker): React's development build is loaded here, the production build in
// the build tests.

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

describe("dev middleware (mounted in a host server)", () => {
  let docs: YaakdocMiddleware;
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    const dir = await hostApp();

    server = createServer((req, res) => docs(req, res, () => res.end("host app")));
    docs = await yaakdocMiddleware({ cwd: dir, dev: true, hmr: { server } });

    await new Promise<void>((done) => server.listen(0, "localhost", done));
    origin = `http://localhost:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await docs?.close();
    await new Promise((done) => server?.close(done));
  });

  it("server-renders the docs under /docs/ with the dev client", async () => {
    const response = await fetch(`${origin}/docs/`, { headers: { accept: "text/html" } });
    expect(response.status).toBe(200);

    const html = await response.text();
    expect(html).toContain("Upload an image");
    expect(html).toContain('src="/docs/@vite/client"');
    expect(html).toContain('src="/docs/@id/__x00__virtual:yaakdoc/entry-client"');
    expect(html).toContain('href="/docs/llms.txt"');
    expect(html).not.toContain("/docs/docs/");
    expect((await fetch(`${origin}/docs/@vite/client`)).status).toBe(200);
  });

  it("passes everything else to the host", async () => {
    const response = await fetch(`${origin}/`, { headers: { accept: "text/html" } });
    expect(await response.text()).toBe("host app");
    // The host's public folder isn't served as part of the docs.
    expect(await (await fetch(`${origin}/docs/robots.txt`)).text()).not.toBe("User-agent: *");
  });
});

describe("Vite plugin (dev)", () => {
  let vite: ViteDevServer;

  beforeAll(async () => {
    vite = await createViteServer({
      root: await hostApp(),
      configFile: false,
      logLevel: "silent",
      server: { port: 0 },
      plugins: [yaakdoc()],
    });

    await vite.listen();
  });

  afterAll(() => vite?.close());

  it("serves the docs next to the app", async () => {
    const origin = vite.resolvedUrls!.local[0]!.replace(/\/$/, "");

    const docs = await fetch(`${origin}/docs/`, { headers: { accept: "text/html" } });
    expect(docs.status).toBe(200);
    expect(await docs.text()).toContain("Upload an image");

    const app = await fetch(`${origin}/`, { headers: { accept: "text/html" } });
    expect(await app.text()).toContain("<h1>Host</h1>");

    const nested = await fetch(`${origin}/docs/nope/`, { headers: { accept: "text/html" } });
    expect(nested.status).toBe(404);
  });
});
