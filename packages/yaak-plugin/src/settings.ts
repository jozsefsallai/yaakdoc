import type { Context, JsonPrimitive } from "@yaakapp/api";
import { configSchema, mergeConfig, type YaakdocConfig } from "@yaakdoc/config";

/** Form values as Yaak returns them, keyed by input name. */
export type Settings = { [name: string]: JsonPrimitive | undefined };

/** yaakdoc's defaults, used for the "Default (on)" labels. */
export const DEFAULTS = configSchema.parse({});

/** Select value meaning "leave it to the config file or yaakdoc's default". */
export const DEFAULT = "default";
/** Environment select value for `environment: false`. */
export const NO_ENVIRONMENT = "__none__";
/** Theme select value for a theme other than the built-in Kiseki, named in the `theme` field. */
export const OTHER_THEME = "other";

const storeKey = (workspaceId: string) => `settings:${workspaceId}`;

export async function loadSettings(ctx: Context, workspaceId: string): Promise<Settings> {
  return (await ctx.store.get<Settings>(storeKey(workspaceId))) ?? {};
}

export async function saveSettings(ctx: Context, workspaceId: string, settings: Settings) {
  await ctx.store.set(storeKey(workspaceId), settings);
}

export class SettingsError extends Error {
  override name = "SettingsError";
}

const text = (value: JsonPrimitive | undefined): string | undefined => {
  if (value === null || value === undefined || value === false) {
    return undefined;
  }

  const trimmed = String(value).trim();
  return trimmed === "" || trimmed === DEFAULT ? undefined : trimmed;
};

/** Items separated by commas or new lines. */
const list = (value: JsonPrimitive | undefined): string[] | undefined => {
  const items = text(value)
    ?.split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items?.length ? items : undefined;
};

/** Three-way select: "on", "off" or the default. */
const toggle = (value: JsonPrimitive | undefined): boolean | undefined =>
  value === "on" ? true : value === "off" ? false : undefined;

export const isChecked = (value: JsonPrimitive | undefined) => value === true || value === "true";

/** `Label | https://... | icon` per line. */
function links(value: JsonPrimitive | undefined) {
  const lines = text(value)?.split("\n") ?? [];

  const parsed = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, href, icon] = line.split("|").map((part) => part.trim());

      if (!label || !href) {
        throw new SettingsError(`Header links need a label and a URL: "${line}"`);
      }

      return icon ? { label, href, icon } : { label, href };
    });

  return parsed.length ? parsed : undefined;
}

function extraConfig(value: JsonPrimitive | undefined): YaakdocConfig {
  const source = text(value);

  if (!source) {
    return {};
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new SettingsError(`Extra config is not valid JSON: ${(error as Error).message}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SettingsError("Extra config must be a JSON object");
  }

  return parsed as YaakdocConfig;
}

/** Drops undefined values and empty objects, so only what the user set ends up in the config. */
function compact<T>(value: T): T | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const entries = Object.entries(value)
    .map(([key, item]) => [key, compact(item)] as const)
    .filter(([, item]) => item !== undefined);

  return entries.length ? (Object.fromEntries(entries) as T) : undefined;
}

/**
 * Turns the form values into yaakdoc config overrides. Empty fields and "Default" selects are left
 * out, so the config file (or yaakdoc's default) still applies to them.
 */
export function settingsToConfig(settings: Settings): YaakdocConfig {
  const environment = text(settings.environment);
  const runInYaak = toggle(settings.runInYaak);
  const runInYaakName = text(settings.runInYaakName);

  const config: YaakdocConfig = {
    theme: settings.themeChoice === OTHER_THEME ? text(settings.theme) : text(settings.themeChoice),
    pages: text(settings.pages) as YaakdocConfig["pages"],
    base: text(settings.base),
    environment: environment === NO_ENVIRONMENT ? false : environment,
    environments: text(settings.environments) as YaakdocConfig["environments"],
    branding: {
      title: text(settings.title),
      description: text(settings.description),
      url: text(settings.url),
      logo: text(settings.logo),
      favicon: text(settings.favicon),
      customCss: text(settings.customCss),
      colors: { primary: text(settings.primaryColor), accent: text(settings.accentColor) },
      fonts: {
        sans: text(settings.fontSans),
        mono: text(settings.fontMono),
        stylesheet: text(settings.fontStylesheet),
      },
      links: links(settings.links),
      footer: text(settings.footer),
      defaultColorMode: text(settings.defaultColorMode) as "system" | "light" | "dark" | undefined,
      colorModeToggle: toggle(settings.colorModeToggle),
    },
    snippets: list(settings.snippets),
    llms: {
      enabled: toggle(settings.llmsEnabled),
      full: toggle(settings.llmsFull),
      copyButton: toggle(settings.llmsCopyButton),
      openIn: list(settings.llmsOpenIn) as ("chatgpt" | "claude" | "perplexity")[] | undefined,
    },
    variables: {
      resolve: toggle(settings.variablesResolve),
      show: toggle(settings.variablesShow),
      hide: list(settings.variablesHide),
    },
    filter: { include: list(settings.filterInclude), exclude: list(settings.filterExclude) },
    runInYaak: runInYaak && runInYaakName ? { name: runInYaakName } : runInYaak,
  };

  return mergeConfig(compact(config) ?? {}, extraConfig(settings.extraConfig));
}

/** Validates the overrides up front, so mistakes show up in Yaak rather than in a build log. */
export function validateConfig(config: YaakdocConfig) {
  const result = configSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join(".") || "config"}: ${issue.message}`,
    );

    throw new SettingsError(`Invalid settings:\n${issues.join("\n")}`);
  }
}
