import { configSchema } from "@yaakdoc/config";
import { describe, expect, it } from "vitest";
import { buildForm, SECTION } from "../src/form";
import {
  NO_ENVIRONMENT,
  OTHER_THEME,
  type Settings,
  settingsToConfig,
  validateConfig,
} from "../src/settings";

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
      pagesDir: "/docs/pages",
      apiPath: "/reference/",
      search: "off",
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
      pagesDir: "/docs/pages",
      apiPath: "/reference/",
      search: false,
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

  type Input = Record<string, unknown> & {
    dynamic?: (ctx: unknown, args: { values: Settings }) => Promise<{ hidden?: boolean }>;
  };

  const form = (settings: Settings = {}) =>
    buildForm({ kind: "build", settings, environments: [], yaakdocCommand: "yaakdoc" }) as Input[];

  /** Whether an input is hidden after the user changed `values`. */
  const hidden = async (input: Input, values: Settings) =>
    (await input.dynamic!(null, { values })).hidden;

  it("shows one section at a time instead of accordions", async () => {
    const inputs = form();
    const banner = inputs.find((input) => input.type === "banner" && input.color === "primary")!;
    const [hint, select] = banner.inputs as [Input, Input];
    const title = inputs.find((input) => input.name === "title")!;
    const base = inputs.find((input) => input.name === "base")!;

    expect(inputs.some((input) => input.type === "accordion")).toBe(false);
    expect(select).toMatchObject({ type: "select", name: SECTION, defaultValue: "general" });
    expect(hint.content).toBe(
      "**More settings** are in the other sections: Pages and search, Branding, Code examples, LLMs, Variables, Filter, Run in Yaak, and Advanced.",
    );
    expect((select.options as { value: string }[]).map((option) => option.value)).toEqual([
      "general",
      "pages-and-search",
      "branding",
      "code-examples",
      "llms",
      "variables",
      "filter",
      "run-in-yaak",
      "advanced",
    ]);

    // The output directory is outside the sections.
    expect(inputs.find((input) => input.name === "outDir")!.hidden).toBeUndefined();

    expect(base.hidden).toBe(false);
    expect(title.hidden).toBe(true);
    expect(await hidden(title, { [SECTION]: "branding" })).toBe(false);
    expect(await hidden(base, { [SECTION]: "branding" })).toBe(true);

    // Values of other fields don't change the section.
    expect(await hidden(base, { title: "Acme" })).toBe(false);
  });

  it("shows the theme name and its Node.js notice only for other themes", async () => {
    const name = (inputs: Input[]) => inputs.find((input) => input.name === "theme")!;
    const banner = (inputs: Input[]) =>
      inputs.find((input) => input.type === "banner" && input.color === "notice")!;

    expect(name(form({ themeChoice: "kiseki" })).hidden).toBe(true);
    expect(banner(form({ themeChoice: "kiseki" })).hidden).toBe(true);
    expect(name(form({ themeChoice: OTHER_THEME })).hidden).toBe(false);

    expect(await hidden(name(form()), { themeChoice: OTHER_THEME })).toBe(false);

    // An untouched select keeps its stored value.
    expect(await hidden(name(form({ themeChoice: OTHER_THEME })), { title: "Acme" })).toBe(false);

    // Hidden in other sections either way.
    expect(await hidden(name(form()), { themeChoice: OTHER_THEME, [SECTION]: "branding" })).toBe(
      true,
    );
  });
});
