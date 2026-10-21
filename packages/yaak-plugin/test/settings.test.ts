import { configSchema } from "@yaakdoc/config";
import { describe, expect, it } from "vitest";
import { buildForm } from "../src/form";
import { NO_ENVIRONMENT, OTHER_THEME, settingsToConfig, validateConfig } from "../src/settings";

describe("settingsToConfig", () => {
  it("leaves out empty fields and defaults", () => {
    expect(
      settingsToConfig({
        theme: "  ",
        pages: "default",
        llmsEnabled: "default",
        outDir: "/tmp/site",
        yaakdocCommand: "yaakdoc",
      }),
    ).toEqual({});
  });

  it("maps every kind of field", () => {
    const config = settingsToConfig({
      themeChoice: OTHER_THEME,
      theme: "./theme",
      pages: "per-request",
      environment: NO_ENVIRONMENT,
      environments: "public",
      title: "Acme",
      primaryColor: "#0f766e",
      colorModeToggle: "off",
      links: "GitHub | https://github.com/acme | github\n\nStatus | https://status.acme.dev",
      snippets: "curl, python\ngo",
      llmsFull: "off",
      llmsOpenIn: "claude",
      variablesHide: "token,secret",
      filterExclude: "internal/**",
      runInYaak: "on",
      runInYaakName: "Acme API",
    });

    expect(config).toEqual({
      theme: "./theme",
      pages: "per-request",
      environment: false,
      environments: "public",
      branding: {
        title: "Acme",
        colors: { primary: "#0f766e" },
        colorModeToggle: false,
        links: [
          { label: "GitHub", href: "https://github.com/acme", icon: "github" },
          { label: "Status", href: "https://status.acme.dev" },
        ],
      },
      snippets: ["curl", "python", "go"],
      llms: { full: false, openIn: ["claude"] },
      variables: { hide: ["token", "secret"] },
      filter: { exclude: ["internal/**"] },
      runInYaak: { name: "Acme API" },
    });

    expect(() => configSchema.parse(config)).not.toThrow();
  });

  it("only uses the theme name for other themes", () => {
    expect(settingsToConfig({ themeChoice: "kiseki", theme: "./old" })).toEqual({
      theme: "kiseki",
    });
    expect(settingsToConfig({ themeChoice: "default", theme: "./old" })).toEqual({});
  });

  it("merges the extra JSON last", () => {
    expect(
      settingsToConfig({
        title: "Acme",
        extraConfig: '{ "branding": { "footer": "Hi" }, "themeOptions": { "navOpenDepth": 2 } }',
      }),
    ).toEqual({
      branding: { title: "Acme", footer: "Hi" },
      themeOptions: { navOpenDepth: 2 },
    });
  });

  it("reports invalid input clearly", () => {
    expect(() => settingsToConfig({ extraConfig: "{ nope" })).toThrow(/not valid JSON/);
    expect(() => settingsToConfig({ extraConfig: "[]" })).toThrow(/must be a JSON object/);
    expect(() => settingsToConfig({ links: "Just a label" })).toThrow(/label and a URL/);
    expect(() => validateConfig(settingsToConfig({ llmsOpenIn: "bard" }))).toThrow(
      /llms\.openIn\.0/,
    );
  });
});

describe("buildForm", () => {
  it("prefills stored values and lists the environments", () => {
    const inputs = buildForm({
      kind: "build",
      settings: { themeChoice: OTHER_THEME, theme: "./theme", pages: "single" },
      environments: ["Production", "Staging"],
      yaakdocCommand: "npx -y yaakdoc@0.1.0",
    });

    const flat = JSON.stringify(inputs);

    expect(inputs[0]).toMatchObject({
      type: "markdown",
      content: expect.stringContaining("Output directory"),
    });

    expect(inputs[1]).toMatchObject({ type: "file", name: "outDir", directory: true });

    expect(flat).toContain(
      '"name":"theme","label":"Theme name","optional":true,"defaultValue":"./theme"',
    );

    expect(flat).toContain('{"label":"Staging","value":"Staging"}');
    expect(flat).not.toContain("projectDir");
  });

  it("shows the theme name and its Node.js notice only for other themes", () => {
    const general = (themeChoice: string) => {
      const inputs = buildForm({
        kind: "build",
        settings: { themeChoice },
        environments: [],
        yaakdocCommand: "yaakdoc",
      });

      const accordion = inputs.find((input) => "label" in input && input.label === "General");

      return (accordion as { inputs: Record<string, unknown>[] }).inputs;
    };

    const name = (inputs: Record<string, unknown>[]) =>
      inputs.find((input) => input.name === "theme")!;

    const banner = (inputs: Record<string, unknown>[]) =>
      inputs.find((input) => input.type === "banner")!;

    expect(name(general("kiseki")).hidden).toBe(true);
    expect(banner(general("kiseki")).hidden).toBe(true);
    expect(name(general(OTHER_THEME)).hidden).toBe(false);

    const dynamic = name(general("kiseki")).dynamic as (
      ctx: unknown,
      args: { values: Record<string, string> },
    ) => { hidden: boolean };

    expect(dynamic(null, { values: { themeChoice: OTHER_THEME } })).toEqual({ hidden: false });
  });
});
