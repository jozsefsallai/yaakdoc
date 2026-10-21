import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import type { ThemeDefinition } from "@yaakdoc/react/theme";
import { createJiti } from "jiti";
import { ENGINE_ANCHOR, resolveFrom, resolvePackageDir } from "./resolve";

export type ResolvedTheme = {
  name: string;
  definition: ThemeDefinition;
  /** Directory of the theme manifest. */
  root: string;
  manifest: string;
  /** Absolute paths. */
  entry: string;
  client: string | null;
  styles: string[];
  /** Validated theme options. */
  options: Record<string, unknown>;
  /** Package name, when the theme comes from npm. */
  packageName: string | null;
  /** Files (importers) used as fallbacks when a theme dependency is not installed locally. */
  fallbackImporters: string[];
  highlight: { light: string; dark: string };
};

export class ThemeError extends Error {
  override name = "ThemeError";
}

const MANIFEST_NAMES = ["theme.ts", "theme.mts", "theme.js", "theme.mjs", "index.ts", "index.js"];

/** Candidate package names for a theme spec: `kiseki` → `@yaakdoc/theme-kiseki`, `yaakdoc-theme-kiseki`. */
export function themePackageCandidates(spec: string): string[] {
  if (spec.startsWith("@") || spec.includes("/") || spec.startsWith("yaakdoc-theme-")) {
    return [spec];
  }

  return [`@yaakdoc/theme-${spec}`, `yaakdoc-theme-${spec}`, spec];
}

const isLocal = (spec: string) => spec.startsWith(".") || isAbsolute(spec);

function findManifest(path: string): string {
  if (existsSync(path) && statSync(path).isFile()) {
    return path;
  }

  for (const name of MANIFEST_NAMES) {
    const candidate = join(path, name);

    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new ThemeError(`No theme manifest (${MANIFEST_NAMES.join(", ")}) found in ${path}`);
}

/** Built-in theme package directories, used to resolve dependencies of ejected themes. */
function builtinFallbacks(): string[] {
  const kiseki = resolvePackageDir("@yaakdoc/theme-kiseki", ENGINE_ANCHOR);
  return [ENGINE_ANCHOR, ...(kiseki ? [join(kiseki, "package.json")] : [])];
}

/** Loads and validates a theme from a short name, package name or local path. */
export async function resolveTheme(
  spec: string,
  options: { root: string; themeOptions: Record<string, unknown> },
): Promise<ResolvedTheme> {
  const userAnchor = join(options.root, "package.json");

  let manifest: string | null = null;
  let packageName: string | null = null;

  if (isLocal(spec)) {
    manifest = findManifest(resolve(options.root, spec));
  } else {
    for (const candidate of themePackageCandidates(spec)) {
      const resolved = resolveFrom(candidate, userAnchor) ?? resolveFrom(candidate, ENGINE_ANCHOR);

      if (resolved) {
        manifest = resolved;
        packageName = candidate;
        break;
      }
    }

    if (!manifest) {
      throw new ThemeError(
        `Theme "${spec}" not found. Install it (e.g. npm i -D ${themePackageCandidates(spec)[0]}) or use a local path.`,
      );
    }
  }

  const fallbackImporters = builtinFallbacks();
  const alias = buildAliases(manifest, fallbackImporters);
  const jiti = createJiti(manifest, { alias, moduleCache: false, interopDefault: true });

  let definition: ThemeDefinition;

  try {
    definition = (await jiti.import(manifest, { default: true })) as ThemeDefinition;
  } catch (error) {
    throw new ThemeError(`Failed to load theme ${manifest}: ${(error as Error).message}`);
  }

  if (!definition || typeof definition !== "object" || !definition.entry) {
    throw new ThemeError(
      `Theme ${manifest} must default-export defineTheme({ name, entry, ... }).`,
    );
  }

  return themeFromDefinition(definition, {
    manifest,
    packageName,
    themeOptions: options.themeOptions,
    fallbackImporters,
  });
}

/**
 * Validates the options of an already loaded theme definition. `resolveTheme` loads the definition
 * from a manifest; bundled engines (the Yaak plugin) pass a definition they import themselves.
 */
export function themeFromDefinition(
  definition: ThemeDefinition,
  options: {
    /** Path of the theme manifest; `entry`, `client` and `styles` are resolved against it. */
    manifest: string;
    packageName?: string | null;
    themeOptions: Record<string, unknown>;
    fallbackImporters?: string[];
  },
): ResolvedTheme {
  const root = dirname(options.manifest);
  const abs = (path: string) => resolve(root, path);

  let themeOptions: Record<string, unknown> = options.themeOptions;

  if (definition.options) {
    try {
      themeOptions = definition.options.parse(options.themeOptions) as Record<string, unknown>;
    } catch (error) {
      throw new ThemeError(
        `Invalid themeOptions for theme "${definition.name}":\n${(error as Error).message}`,
      );
    }
  }

  return {
    name: definition.name,
    definition,
    root,
    manifest: options.manifest,
    entry: abs(definition.entry),
    client: definition.client ? abs(definition.client) : null,
    styles: (definition.styles ?? []).map(abs),
    options: themeOptions,
    packageName: options.packageName ?? null,
    fallbackImporters: options.fallbackImporters ?? [],
    highlight: definition.highlight ?? {
      light: "github-light",
      dark: "github-dark",
    },
  };
}

/**
 * jiti aliases so a theme manifest (e.g. an ejected theme in a project without dependencies) can
 * import `@yaakdoc/react/theme` and the built-in themes' dependencies.
 */
function buildAliases(manifest: string, fallbacks: string[]): Record<string, string> {
  const specs = new Set(["@yaakdoc/react/theme", "@yaakdoc/react"]);

  for (const fallback of fallbacks) {
    try {
      const pkg = JSON.parse(readFileSync(fallback, "utf8")) as {
        dependencies?: Record<string, string>;
      };

      for (const name of Object.keys(pkg.dependencies ?? {})) {
        specs.add(name);
      }
    } catch {}
  }

  const alias: Record<string, string> = {};

  for (const spec of specs) {
    if (resolveFrom(spec, manifest)) {
      continue;
    }

    for (const fallback of fallbacks) {
      const resolved = resolveFrom(spec, fallback);

      if (resolved) {
        alias[spec] = resolved;
        break;
      }
    }
  }

  return alias;
}
