import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findYaakDataDir, intoProject, toProjectRelative } from "../src/paths";
import { splitCommand } from "../src/run";

describe("splitCommand", () => {
  it("splits words and honors quotes", () => {
    expect(splitCommand("npx -y yaakdoc@0.1.0")).toEqual(["npx", "-y", "yaakdoc@0.1.0"]);
    expect(splitCommand(`"/Applications/My Tools/yaak" --log ''`)).toEqual([
      "/Applications/My Tools/yaak",
      "--log",
      "",
    ]);
    expect(splitCommand("  ")).toEqual([]);
  });
});

describe("findYaakDataDir", () => {
  it("finds the data directory of a registry install", () => {
    const data = join("/", "home", "me", ".local", "share", "app.yaak.desktop");
    const bundle = join(data, "installed-plugins", "@yaakdoc", "yaakdoc", "build");

    expect(findYaakDataDir(bundle)).toBe(data);
  });

  it("returns null for a plugin installed from a local directory", () => {
    expect(findYaakDataDir(join("/", "src", "yaakdoc", "packages", "yaak-plugin"))).toBeNull();
  });
});

describe("toProjectRelative", () => {
  const dir = join("/", "work", "docs");

  it("rewrites paths inside the project", () => {
    expect(toProjectRelative(join(dir, "assets", "logo.svg"), dir)).toBe("./assets/logo.svg");
  });

  it("keeps other paths and URLs", () => {
    expect(toProjectRelative(join("/", "elsewhere", "logo.svg"), dir)).toBe(
      join("/", "elsewhere", "logo.svg"),
    );
    expect(toProjectRelative("https://acme.dev/logo.svg", dir)).toBe("https://acme.dev/logo.svg");
    expect(toProjectRelative("kiseki", dir)).toBe("kiseki");
  });
});

describe("intoProject", () => {
  it("copies outside files into assets/ and keeps inside files where they are", async () => {
    const root = await mkdtemp(join(tmpdir(), "yaakdoc-into-"));
    const project = join(root, "project");

    await mkdir(join(project, "brand"), { recursive: true });
    await mkdir(join(root, "a"));
    await mkdir(join(root, "b"));

    await writeFile(join(project, "brand", "logo.svg"), "inside");
    await writeFile(join(root, "a", "logo.svg"), "a");
    await writeFile(join(root, "b", "logo.svg"), "b");

    const copied = new Map<string, string>();
    const into = (path: string) => intoProject(path, project, copied);

    expect(await into(join(project, "brand", "logo.svg"))).toBe("./brand/logo.svg");
    expect(await into(join(root, "a", "logo.svg"))).toBe("./assets/logo.svg");
    expect(await into(join(root, "b", "logo.svg"))).toBe("./assets/logo-2.svg");
    expect(await into(join(root, "a", "logo.svg"))).toBe("./assets/logo.svg");
    expect(await readFile(join(project, "assets", "logo-2.svg"), "utf8")).toBe("b");

    expect(await into("https://acme.dev/logo.svg")).toBe("https://acme.dev/logo.svg");
    expect(await into(join(root, "missing.svg"))).toBe(join(root, "missing.svg"));
    expect(existsSync(join(project, "assets", "missing.svg"))).toBe(false);
  });
});
