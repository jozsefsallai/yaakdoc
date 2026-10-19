import { existsSync, readdirSync } from "node:fs";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { loadConfig } from "@yaakdoc/config/node";
import { glob } from "tinyglobby";
import { writeJson } from "./fs";
import { schemaUrl } from "./init";
import { resolveTheme } from "./theme";

export type EjectOptions = {
  cwd?: string;
  configFile?: string;
  /** Destination directory (default: `./theme`). */
  out?: string;
  /** Overwrite a non-empty destination. */
  force?: boolean;
  /** Update (or create) the config to use the ejected theme (default: true). */
  updateConfig?: boolean;
};

export type EjectResult = {
  out: string;
  files: string[];
  theme: string;
  dependencies: string[];
  config: { file: string; updated: boolean; created: boolean } | null;
};

const DEFAULT_IGNORE = [
  "node_modules/**",
  "dist/**",
  "package.json",
  "CHANGELOG.md",
  "**/*.test.*",
  "test/**",
];

/** Copies the current theme's source into the project so it can be customized freely. */
export async function eject(options: EjectOptions = {}): Promise<EjectResult> {
  const cwd = resolve(options.cwd ?? process.cwd());

  const { config, configFile, root } = await loadConfig({
    cwd,
    ...(options.configFile ? { configFile: options.configFile } : {}),
  });

  const theme = await resolveTheme(config.theme, { root, themeOptions: config.themeOptions });

  const out = resolve(cwd, options.out ?? "theme");

  if (out === theme.root) {
    throw new Error(`The theme is already located at ${out}.`);
  }

  if (existsSync(out) && readdirSync(out).length > 0 && !options.force) {
    throw new Error(
      `${relative(cwd, out) || out} already exists and is not empty. Use --force to overwrite.`,
    );
  }

  const files = await glob(theme.definition.eject?.files ?? ["**/*"], {
    cwd: theme.root,
    ignore: DEFAULT_IGNORE,
    dot: false,
    onlyFiles: true,
  });

  if (!files.some((file) => resolve(theme.root, file) === theme.manifest)) {
    files.push(relative(theme.root, theme.manifest));
  }

  for (const file of files) {
    const target = join(out, file);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(theme.root, file), target);
  }

  let configResult: EjectResult["config"] = null;

  if (options.updateConfig !== false) {
    const themePath = `./${relative(configFile ? dirname(configFile) : cwd, out)
      .split("\\")
      .join("/")}`;

    if (configFile && extname(configFile).startsWith(".json")) {
      const json = JSON.parse(await readFile(configFile, "utf8")) as Record<string, unknown>;
      json.theme = themePath;
      await writeJson(configFile, json);
      configResult = { file: configFile, updated: true, created: false };
    } else if (configFile) {
      configResult = { file: configFile, updated: false, created: false };
    } else {
      const file = join(cwd, "yaakdoc.config.json");
      await writeJson(file, { $schema: schemaUrl(cwd), theme: themePath });
      configResult = { file, updated: true, created: true };
    }
  }

  return {
    out,
    files: files.sort(),
    theme: theme.name,
    dependencies: theme.definition.eject?.dependencies ?? [],
    config: configResult,
  };
}
