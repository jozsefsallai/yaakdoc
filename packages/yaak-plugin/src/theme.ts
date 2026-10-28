import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { type RunOptions, type RunResult, runCommand } from "./run";

type Run = (
  command: string,
  args: string[],
  cwd: string,
  options?: RunOptions,
) => Promise<RunResult>;

export type ThemePackage = { name: string; version: string };

/** Thrown when none of a theme's candidate package names is published on npm. */
export class ThemeNotFoundError extends Error {
  override name = "ThemeNotFoundError";

  constructor(
    readonly theme: string,
    readonly candidates: string[],
  ) {
    super(`No theme package named "${theme}" was found on npm (tried ${candidates.join(", ")}).`);
  }
}

/** Thrown when npm fails for another reason than a missing package (e.g. no network). */
export class NpmError extends Error {
  override name = "NpmError";

  constructor(
    message: string,
    readonly output: string,
  ) {
    super(message);
  }
}

/** Local theme specs (paths) are used as they are; everything else is an npm package. */
export const isLocalTheme = (spec: string) => spec.startsWith(".") || isAbsolute(spec);

/** Whether `name` is installed in a `node_modules` folder in `dir` or above. */
export function installedFrom(name: string, dir: string): boolean {
  for (let current = dir; ; current = dirname(current)) {
    if (existsSync(join(current, "node_modules", name, "package.json"))) {
      return true;
    }

    if (current === dirname(current)) {
      return false;
    }
  }
}

/**
 * The candidates (see `themePackageCandidates`) the plugin may install from npm. For a short name
 * like `winxp`, yaakdoc also tries a package named just `winxp`, which could be anything: only the
 * theme-named packages are fetched for it. A full package name is fetched as it's written.
 */
export function fetchableThemePackages(theme: string, candidates: string[]): string[] {
  return candidates.length > 1 ? candidates.filter((name) => name !== theme) : candidates;
}

const NOT_FOUND_RE = /\bE404\b|EINVALIDPACKAGENAME|Invalid package name/;

/** The first of `candidates` (see `themePackageCandidates`) that's published on npm. */
export async function findThemePackage(
  theme: string,
  candidates: string[],
  cwd: string,
  run: Run = runCommand,
  options: RunOptions = {},
): Promise<ThemePackage> {
  for (const name of candidates) {
    const result = await run("npm", ["view", name, "name", "version", "--json"], cwd, options);

    if (result.ok) {
      const json = result.output.slice(
        result.output.indexOf("{"),
        result.output.lastIndexOf("}") + 1,
      );

      try {
        const data = JSON.parse(json) as Partial<ThemePackage>;

        if (data.name && data.version) {
          return { name: data.name, version: data.version };
        }
      } catch {
        // Unexpected output: treat it as an npm failure below.
      }
    } else if (NOT_FOUND_RE.test(result.output)) {
      continue;
    }

    throw new NpmError(`Couldn't look up ${name} on npm.`, result.output);
  }

  throw new ThemeNotFoundError(theme, candidates);
}

/**
 * Installs a theme package into its own folder in `cacheDir` (one per name and version, reused by
 * later builds) and returns the path of its manifest, for the `theme` setting.
 */
export async function installTheme(
  pkg: ThemePackage,
  cacheDir: string,
  run: Run = runCommand,
  options: RunOptions = {},
): Promise<string> {
  const dir = join(cacheDir, `${pkg.name.replace("/", "+")}@${pkg.version}`);
  const packageDir = join(dir, "node_modules", ...pkg.name.split("/"));

  // Written after a successful install, so an interrupted one is redone.
  const marker = join(dir, ".installed");

  if (!existsSync(marker)) {
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "package.json"), `${JSON.stringify({ private: true })}\n`);

    const spec = `${pkg.name}@${pkg.version}`;
    const result = await run(
      "npm",
      ["install", "--no-audit", "--no-fund", "--no-package-lock", spec],
      dir,
      options,
    );

    if (!result.ok) {
      throw new NpmError(`Couldn't install ${spec}.`, result.output);
    }

    await writeFile(marker, "");
  }

  return themeManifest(packageDir);
}

type Exports = string | { [key: string]: Exports } | null | undefined;

/** The file an `exports` entry points at, preferring the conditions yaakdoc resolves with. */
function exportTarget(entry: Exports): string | undefined {
  if (!entry || typeof entry === "string") {
    return entry ?? undefined;
  }

  for (const key of [".", "import", "default", "node", "require"]) {
    const target = exportTarget(entry[key]);

    if (target) {
      return target;
    }
  }

  return undefined;
}

/**
 * The theme manifest of an installed package: its main export. Falls back to the package folder,
 * where yaakdoc looks for `theme.ts` and friends.
 */
export async function themeManifest(packageDir: string): Promise<string> {
  try {
    const pkg = JSON.parse(await readFile(join(packageDir, "package.json"), "utf8")) as {
      exports?: Exports;
      module?: string;
      main?: string;
    };

    const target = exportTarget(pkg.exports) ?? pkg.module ?? pkg.main;

    if (target && existsSync(join(packageDir, target))) {
      return join(packageDir, target);
    }
  } catch {
    // Let yaakdoc report the problem.
  }

  return packageDir;
}
