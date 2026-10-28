import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ConfigError, getConfigJsonSchema, parseConfig } from "../src/index";
import { loadConfig } from "../src/node";

describe("parseConfig", () => {
  it("applies defaults to an empty config", () => {
    const config = parseConfig({});

    expect(config).toMatchObject({
      theme: "kiseki",
      pages: "single",
      base: "/",
      server: { port: 4000 },
      branding: { defaultColorMode: "system", links: [] },
      llms: { enabled: true, openIn: ["chatgpt", "claude"] },
    });
  });

  it("normalizes the base path", () => {
    expect(parseConfig({ base: "docs" }).base).toBe("/docs/");
    expect(parseConfig({ base: "/docs/api/" }).base).toBe("/docs/api/");
    expect(parseConfig({ base: "" }).base).toBe("/");
  });

  it("reports invalid values", () => {
    expect(() => parseConfig({ pages: "many" })).toThrow(ConfigError);
    expect(() => parseConfig({ server: { port: "x" } })).toThrow(/server\.port/);
  });

  it("produces a JSON schema", () => {
    const schema = getConfigJsonSchema();
    expect(schema.type).toBe("object");
    expect(Object.keys(schema.properties as object)).toContain("branding");
  });
});

describe("loadConfig", () => {
  it("works without a config file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "yaakdoc-config-"));
    const loaded = await loadConfig({ cwd: dir });

    expect(loaded.configFile).toBeNull();
    expect(loaded.config.outDir).toBe(join(dir, "dist"));
  });

  it("loads JSON config, resolves paths and applies overrides (arrays replaced)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "yaakdoc-config-"));

    await writeFile(
      join(dir, "yaakdoc.config.json"),
      JSON.stringify({
        export: "./api.json",
        theme: "./my-theme",
        snippets: ["curl", "python"],
        branding: { title: "Docs", logo: "./logo.svg", colors: { primary: "#f00" } },
        server: { port: 5000 },
      }),
    );

    const loaded = await loadConfig({
      cwd: dir,
      overrides: { snippets: ["go"], server: { open: true } },
    });

    expect(loaded.configFile).toBe(join(dir, "yaakdoc.config.json"));
    expect(loaded.config).toMatchObject({
      export: join(dir, "api.json"),
      theme: join(dir, "my-theme"),
      snippets: ["go"],
      server: { port: 5000, open: true },
      branding: { title: "Docs", logo: join(dir, "logo.svg") },
    });
  });

  it("skips the config file with configFile: false", async () => {
    const dir = await mkdtemp(join(tmpdir(), "yaakdoc-config-"));
    await writeFile(join(dir, "yaakdoc.config.json"), JSON.stringify({ pages: "per-request" }));

    const loaded = await loadConfig({
      cwd: dir,
      configFile: false,
      overrides: { export: "./api.json", base: "docs" },
    });

    expect(loaded.configFile).toBeNull();
    expect(loaded.config).toMatchObject({
      pages: "single",
      base: "/docs/",
      export: join(dir, "api.json"),
    });
  });

  it("fails when an explicit config file is missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "yaakdoc-config-"));
    await expect(loadConfig({ cwd: dir, configFile: "nope.json" })).rejects.toThrow(ConfigError);
  });
});
