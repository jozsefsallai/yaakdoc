import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { RunResult } from "../src/run";
import {
  fetchableThemePackages,
  findThemePackage,
  installedFrom,
  installTheme,
  NpmError,
  ThemeNotFoundError,
  themeManifest,
} from "../src/theme";

const CANDIDATES = ["@yaakdoc/theme-winxp", "yaakdoc-theme-winxp", "winxp"];

const notFound: RunResult = {
  ok: false,
  output: "npm error code E404\nnpm error 404 Not Found - GET https://registry.npmjs.org/x\n",
};

/** A fake `npm view` that knows the given packages. */
const npmView = (published: Record<string, string>) =>
  vi.fn(async (_command: string, args: string[]): Promise<RunResult> => {
    const version = published[args[1]!];
    return version
      ? { ok: true, output: `{\n  "name": "${args[1]}",\n  "version": "${version}"\n}\n` }
      : notFound;
  });

describe("fetchableThemePackages", () => {
  it("leaves out the bare name of a short theme name", () => {
    expect(fetchableThemePackages("winxp", CANDIDATES)).toEqual([
      "@yaakdoc/theme-winxp",
      "yaakdoc-theme-winxp",
    ]);
  });

  it("keeps a full package name", () => {
    expect(fetchableThemePackages("@acme/docs-theme", ["@acme/docs-theme"])).toEqual([
      "@acme/docs-theme",
    ]);
    expect(fetchableThemePackages("yaakdoc-theme-winxp", ["yaakdoc-theme-winxp"])).toEqual([
      "yaakdoc-theme-winxp",
    ]);
  });
});

describe("findThemePackage", () => {
  it("returns the first candidate that's published", async () => {
    const run = npmView({ "yaakdoc-theme-winxp": "0.1.0", winxp: "9.9.9" });

    await expect(findThemePackage("winxp", CANDIDATES, "/tmp", run)).resolves.toEqual({
      name: "yaakdoc-theme-winxp",
      version: "0.1.0",
    });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("fails when no candidate is published", async () => {
    const error = await findThemePackage("winxp", CANDIDATES, "/tmp", npmView({})).catch(
      (error) => error,
    );

    expect(error).toBeInstanceOf(ThemeNotFoundError);
    expect(error.candidates).toEqual(CANDIDATES);
  });

  it("reports other npm failures instead of skipping the package", async () => {
    const run = vi.fn(async () => ({ ok: false, output: "npm error code ENOTFOUND\n" }));
    const error = await findThemePackage("winxp", CANDIDATES, "/tmp", run).catch((e) => e);

    expect(error).toBeInstanceOf(NpmError);
    expect(error.output).toContain("ENOTFOUND");
  });
});

describe("installTheme", () => {
  /** A fake `npm install` that writes the package into `node_modules`. */
  const npmInstall = (exports: unknown) =>
    vi.fn(async (_command: string, args: string[], cwd: string): Promise<RunResult> => {
      const spec = args.at(-1)!;
      const name = spec.slice(0, spec.lastIndexOf("@"));
      const dir = join(cwd, "node_modules", name);

      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "package.json"), JSON.stringify({ name, exports }));
      await writeFile(join(dir, "theme.ts"), "export default {};");

      return { ok: true, output: "added 1 package\n" };
    });

  it("installs into a folder per version, once, and returns the manifest", async () => {
    const cache = await mkdtemp(join(tmpdir(), "yaakdoc-themes-"));
    const run = npmInstall({ ".": "./theme.ts", "./package.json": "./package.json" });
    const pkg = { name: "@acme/yaakdoc-theme", version: "1.2.3" };

    const manifest = await installTheme(pkg, cache, run);

    expect(manifest).toBe(
      join(
        cache,
        "@acme+yaakdoc-theme@1.2.3",
        "node_modules",
        "@acme",
        "yaakdoc-theme",
        "theme.ts",
      ),
    );
    expect(run.mock.calls[0]![1]).toContain("@acme/yaakdoc-theme@1.2.3");

    await expect(installTheme(pkg, cache, run)).resolves.toBe(manifest);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("reports a failed install and tries again next time", async () => {
    const cache = await mkdtemp(join(tmpdir(), "yaakdoc-themes-"));
    const pkg = { name: "yaakdoc-theme-winxp", version: "0.1.0" };
    const failing = vi.fn(async () => ({ ok: false, output: "npm error network\n" }));

    await expect(installTheme(pkg, cache, failing)).rejects.toBeInstanceOf(NpmError);

    const run = npmInstall("./theme.ts");
    await installTheme(pkg, cache, run);
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe("themeManifest", () => {
  it("follows exports and main, or falls back to the folder", async () => {
    const dir = await mkdtemp(join(tmpdir(), "yaakdoc-theme-"));
    await writeFile(join(dir, "theme.mjs"), "");

    const manifest = async (pkg: unknown) => {
      await writeFile(join(dir, "package.json"), JSON.stringify(pkg));
      return themeManifest(dir);
    };

    expect(await manifest({ exports: { ".": { import: "./theme.mjs" } } })).toBe(
      join(dir, "theme.mjs"),
    );
    expect(await manifest({ main: "./theme.mjs" })).toBe(join(dir, "theme.mjs"));
    expect(await manifest({ main: "./missing.js" })).toBe(dir);
  });
});

describe("installedFrom", () => {
  it("looks for the package in node_modules folders above", async () => {
    const dir = await mkdtemp(join(tmpdir(), "yaakdoc-project-"));
    await mkdir(join(dir, "node_modules", "yaakdoc-theme-winxp"), { recursive: true });
    await writeFile(join(dir, "node_modules", "yaakdoc-theme-winxp", "package.json"), "{}");
    await mkdir(join(dir, "docs"));

    expect(installedFrom("yaakdoc-theme-winxp", join(dir, "docs"))).toBe(true);
    expect(installedFrom("@yaakdoc/theme-winxp", join(dir, "docs"))).toBe(false);
  });
});
