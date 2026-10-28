import { dirname, isAbsolute, resolve } from "node:path";
import { isUrl } from "@yaakdoc/core";
import { loadConfig as loadC12Config } from "c12";
import { ConfigError, mergeConfig, parseConfig } from "./index";
import type { ResolvedConfig, YaakdocConfig } from "./schema";

export type LoadConfigOptions = {
  /** Directory to look for `yaakdoc.config.*` in. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Explicit config file path (relative to `cwd`), or `false` to not load a config file at all. */
  configFile?: string | false;
  /** Values that take precedence over the config file (e.g. CLI flags). */
  overrides?: YaakdocConfig;
};

export type LoadedConfig = {
  config: ResolvedConfig;
  /** Absolute path of the config file, if one was found. */
  configFile: string | null;
  /** Directory relative paths in the config are resolved against. */
  root: string;
};

/**
 * Loads `yaakdoc.config.{json,jsonc,ts,js,mjs,...}` (optional), applies CLI overrides and defaults,
 * validates it and resolves local paths to absolute paths.
 */
export async function loadConfig(options: LoadConfigOptions = {}): Promise<LoadedConfig> {
  const cwd = resolve(options.cwd ?? process.cwd());

  const loaded = options.configFile === false ? {} : await loadConfigFile(cwd, options.configFile);

  const configFile = loaded._configFile ?? null;
  const merged = mergeConfig(
    (loaded.config ?? {}) as Record<string, unknown>,
    (options.overrides ?? {}) as Record<string, unknown>,
  );

  const config = parseConfig(merged, configFile ? `config ${configFile}` : "configuration");
  const root = configFile ? dirname(configFile) : cwd;

  return {
    config: resolveConfigPaths(config, root, options.overrides ?? {}, cwd),
    configFile,
    root,
  };
}

async function loadConfigFile(
  cwd: string,
  configFile: string | undefined,
): Promise<{ config?: YaakdocConfig | null; _configFile?: string }> {
  try {
    return await loadC12Config<YaakdocConfig>({
      cwd,
      name: "yaakdoc",
      configFile: configFile?.replace(/\.(json|jsonc|json5|ts|js|mjs|cjs|mts|cts)$/, ""),
      rcFile: false,
      globalRc: false,
      dotenv: false,
      packageJson: false,
      configFileRequired: Boolean(configFile),
      merger: (...configs) =>
        configs
          .filter(Boolean)
          .reverse()
          .reduce<Record<string, unknown>>(
            (acc, config) => mergeConfig(acc, config as Record<string, unknown>),
            {},
          ) as YaakdocConfig,
    });
  } catch (error) {
    throw new ConfigError(`Could not load config: ${(error as Error).message}`);
  }
}

const isLocalPath = (value: string) =>
  value.startsWith(".") || value.startsWith("/") || isAbsolute(value);

/**
 * Resolves local paths in the config to absolute paths. Paths from the config file are relative to
 * the config file; paths passed as CLI overrides are relative to the current directory.
 */
export function resolveConfigPaths(
  config: ResolvedConfig,
  root: string,
  overrides: YaakdocConfig = {},
  cwd = root,
): ResolvedConfig {
  const from = (value: string, overridden: boolean) => resolve(overridden ? cwd : root, value);

  const asset = (value: string | undefined) =>
    value && !isUrl(value) ? resolve(root, value) : value;

  const { branding } = config;

  const logo =
    typeof branding.logo === "string"
      ? asset(branding.logo)
      : branding.logo && {
          ...branding.logo,
          ...(branding.logo.light ? { light: asset(branding.logo.light) } : {}),
          ...(branding.logo.dark ? { dark: asset(branding.logo.dark) } : {}),
        };

  return {
    ...config,
    ...(config.export ? { export: from(config.export, overrides.export !== undefined) } : {}),
    ...(config.pagesDir
      ? { pagesDir: from(config.pagesDir, overrides.pagesDir !== undefined) }
      : {}),
    outDir: from(config.outDir, overrides.outDir !== undefined),
    theme: isLocalPath(config.theme)
      ? from(config.theme, overrides.theme !== undefined)
      : config.theme,
    snippets: config.snippets.map((snippet) =>
      isLocalPath(snippet) ? resolve(root, snippet) : snippet,
    ),
    branding: {
      ...branding,
      ...(logo ? { logo } : {}),
      ...(branding.favicon ? { favicon: asset(branding.favicon) } : {}),
      ...(branding.customCss ? { customCss: resolve(root, branding.customCss) } : {}),
    },
  };
}
