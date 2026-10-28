import { cp, mkdtemp } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type YaakdocMiddleware, yaakdocMiddleware } from "../src/index";

const FIXTURE_EXPORT = new URL("../../core/test/fixtures/current.json", import.meta.url);

describe("yaakdocMiddleware (built)", () => {
  let server: Server;
  let docs: YaakdocMiddleware;
  let origin: string;

  beforeAll(async () => {
    const dir = await mkdtemp(join(tmpdir(), "yaakdoc-test-"));
    await cp(FIXTURE_EXPORT, join(dir, "yaak.json"));

    docs = await yaakdocMiddleware({
      cwd: dir,
      path: "/docs",
      dev: false,
      build: true,
      config: { outDir: "./docs-dist" },
    });

    // An Express-like host: the docs first, then the app's own routes.
    server = createServer((req, res) =>
      docs(req, res, () => {
        res.setHeader("Content-Type", "text/plain");
        res.end("host app");
      }),
    );

    await new Promise<void>((done) => server.listen(0, "localhost", done));
    origin = `http://localhost:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await docs?.close();
    await new Promise((done) => server?.close(done));
  });

  it("serves the docs under the mount path", async () => {
    const response = await fetch(`${origin}/docs/`);
    expect(response.status).toBe(200);

    const html = await response.text();
    expect(html).toContain("Upload an image");
    expect(html).toMatch(/<script type="module" src="\/docs\/_yaakdoc\/client-[\w-]+\.js"/);

    const asset = html.match(/src="(\/docs\/_yaakdoc\/client-[\w-]+\.js)"/)![1]!;
    expect((await fetch(`${origin}${asset}`)).status).toBe(200);
  });

  it("serves LLM-friendly files and redirects the bare mount path", async () => {
    const llms = await fetch(`${origin}/docs/llms.txt`);
    expect(llms.headers.get("content-type")).toContain("text/plain");
    expect(await llms.text()).toContain("/docs/");

    const bare = await fetch(`${origin}/docs`, { redirect: "manual" });
    expect(bare.status).toBe(302);
    expect(bare.headers.get("location")).toBe("/docs/");
  });

  it("returns the docs' 404 page for unknown docs pages", async () => {
    const response = await fetch(`${origin}/docs/nope/`);
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("doesn’t exist");
  });

  it("passes other requests to the host app", async () => {
    expect(await (await fetch(`${origin}/`)).text()).toBe("host app");
    expect(await (await fetch(`${origin}/docsy`)).text()).toBe("host app");
  });

  it("works when mounted with a path prefix (Express' originalUrl)", async () => {
    // What `app.use("/docs", middleware)` does: strips the prefix and keeps `originalUrl`.
    const express = createServer((req, res) => {
      const url = req.url ?? "/";
      Object.assign(req, { originalUrl: url, url: url.replace(/^\/docs/, "") || "/" });
      docs(req, res, () => res.end("host app"));
    });

    await new Promise<void>((done) => express.listen(0, "localhost", done));

    try {
      const prefixed = `http://localhost:${(express.address() as AddressInfo).port}`;
      expect(await (await fetch(`${prefixed}/docs/llms.txt`)).text()).toMatch(/^# Acme Store API/);
    } finally {
      await new Promise((done) => express.close(done));
    }
  });
});
