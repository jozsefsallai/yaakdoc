import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { NextConfig } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const worker = vi.hoisted(() => ({
  startDevWorker: vi.fn(async (_options: unknown) => ({
    url: "http://localhost:4123/docs/",
    close: () => {},
  })),
  runBuildWorker: vi.fn(async (_options: unknown) => "out"),
}));

vi.mock("yaakdoc/integration", async (importOriginal) => ({
  ...(await importOriginal<typeof import("yaakdoc/integration")>()),
  ...worker,
}));

const { createNextYaakdoc } = await import("../src/index");

const context = { defaultConfig: {} };

async function rewritesOf(config: NextConfig) {
  return (await config.rewrites!()) as Record<
    string,
    Array<{ source: string; destination: string }>
  >;
}

beforeEach(() => {
  vi.clearAllMocks();

  for (const key of Object.keys(process.env)) {
    if (key.startsWith("YAAKDOC_NEXT_")) {
      delete process.env[key];
    }
  }
});

describe("createNextYaakdoc", () => {
  it("proxies the docs to the dev server in `next dev`", async () => {
    const config = await createNextYaakdoc({ path: "/docs" })({})(
      "phase-development-server",
      context,
    );

    expect(await rewritesOf(config)).toEqual({
      beforeFiles: [
        { source: "/docs", destination: "http://localhost:4123/docs/" },
        { source: "/docs/:path*", destination: "http://localhost:4123/docs/:path*" },
      ],
      afterFiles: [],
      fallback: [],
    });

    // Started once, even when Next loads the config again (here or in a child process).
    await createNextYaakdoc({ path: "/docs" })({})("phase-development-server", context);

    expect(worker.startDevWorker).toHaveBeenCalledTimes(1);
    expect(process.env.YAAKDOC_NEXT_DEV__DOCS).toBe("http://localhost:4123/docs/");
  });

  it("builds the docs into public/<path> in `next build` and serves them statically", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "yaakdoc-next-"));

    const config = await createNextYaakdoc({
      cwd,
      path: "reference",
      export: "./api.json",
      config: { branding: { title: "API" } },
    })({ reactStrictMode: true })("phase-production-build", context);

    expect(worker.runBuildWorker).toHaveBeenCalledWith({
      cwd,
      path: "/reference",
      export: "./api.json",
      config: { branding: { title: "API" }, outDir: join(cwd, "public", "reference") },
    });

    expect(config.reactStrictMode).toBe(true);

    expect((await rewritesOf(config)).afterFiles).toEqual([
      { source: "/reference", destination: "/reference/index.html" },
      { source: "/reference/:path*", destination: "/reference/:path*/index.html" },
    ]);
  });

  it("refuses to replace a public folder that isn't a docs build", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "yaakdoc-next-"));

    await mkdir(join(cwd, "public", "docs"), { recursive: true });
    await writeFile(join(cwd, "public", "docs", "guide.pdf"), "");

    await expect(createNextYaakdoc({ cwd })({})("phase-production-build", context)).rejects.toThrow(
      /isn't a yaakdoc build/,
    );

    expect(worker.runBuildWorker).not.toHaveBeenCalled();
  });

  it("keeps the app's config and rewrites", async () => {
    const appConfig = async () => ({
      basePath: "/app",
      rewrites: async () => [{ source: "/old", destination: "/new" }],
    });

    const config = await createNextYaakdoc()(appConfig)("phase-production-server", context);

    expect(config.basePath).toBe("/app");

    expect(await rewritesOf(config)).toEqual({
      beforeFiles: [],
      afterFiles: [
        { source: "/docs", destination: "/docs/index.html" },
        { source: "/docs/:path*", destination: "/docs/:path*/index.html" },
        { source: "/old", destination: "/new" },
      ],
      fallback: [],
    });
  });

  it("includes Next's basePath in the docs' base", async () => {
    await createNextYaakdoc()({ basePath: "/app" })("phase-development-server", context);
    expect(worker.startDevWorker.mock.calls[0]![0]).toMatchObject({ path: "/app/docs" });
  });

  it("doesn't add rewrites to static exports", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "yaakdoc-next-"));

    const config = await createNextYaakdoc({ cwd })({ output: "export" })(
      "phase-production-build",
      context,
    );

    expect(worker.runBuildWorker).toHaveBeenCalled();
    expect(config.rewrites).toBeUndefined();
  });

  it("refuses to mount the docs at the root", () => {
    expect(() => createNextYaakdoc({ path: "/" })).toThrow(/root/);
  });

  it("returns a reusable withYaakdoc", async () => {
    const withYaakdoc = createNextYaakdoc();
    const a = await withYaakdoc({ reactStrictMode: true })("phase-production-server", context);
    const b = await withYaakdoc()("phase-production-server", context);

    expect(a.reactStrictMode).toBe(true);
    expect((await rewritesOf(b)).afterFiles).toHaveLength(2);
  });
});
