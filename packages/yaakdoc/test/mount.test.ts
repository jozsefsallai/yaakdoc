import { cp, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mountBase, mountOptions, resolveContext } from "../src/index";

const FIXTURE_EXPORT = new URL("../../core/test/fixtures/current.json", import.meta.url);

describe("mount options", () => {
  it("normalizes the mount path", () => {
    expect(mountBase()).toBe("/docs/");
    expect(mountBase({ path: "docs" })).toBe("/docs/");
    expect(mountBase({ path: "/api/reference/" })).toBe("/api/reference/");
    expect(mountBase({ path: "/" })).toBe("/");
  });

  it("configures the engine inline, without a config file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "yaakdoc-test-"));
    await cp(FIXTURE_EXPORT, join(dir, "acme.yaak.json"));
    // Ignored with configFile: false.
    await writeFile(join(dir, "yaakdoc.config.json"), JSON.stringify({ pages: "per-request" }));

    const context = await resolveContext(
      mountOptions({
        cwd: dir,
        path: "/reference",
        export: "./acme.yaak.json",
        configFile: false,
        config: { base: "/ignored/", branding: { title: "Inline title" } },
      }),
    );

    expect(context.configFile).toBeNull();
    expect(context.exportPath).toBe(join(dir, "acme.yaak.json"));
    expect(context.config.base).toBe("/reference/");
    expect(context.config.pages).toBe("single");
    expect(context.publicDir).toBe(false);
    expect(context.site.title).toBe("Inline title");
    expect(context.routes[0]?.path).toBe("/reference/");
    expect(context.textFiles.get("/reference/llms-full.txt")).not.toContain("eyJ0eXAi");
  });

  it("merges inline config over the config file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "yaakdoc-test-"));
    await cp(FIXTURE_EXPORT, join(dir, "yaak.json"));
    await writeFile(join(dir, "yaakdoc.config.json"), JSON.stringify({ pages: "per-request" }));

    const context = await resolveContext(
      mountOptions({ cwd: dir, config: { branding: { title: "Merged" } } }),
    );

    expect(context.config.pages).toBe("per-request");
    expect(context.site.title).toBe("Merged");
    expect(context.config.base).toBe("/docs/");
  });
});
