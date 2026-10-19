import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

/** Directory of the installed `yaakdoc` package. */
export const ENGINE_DIR = (() => {
  let dir = dirname(fileURLToPath(import.meta.url));

  while (!existsSync(join(dir, "package.json"))) {
    dir = dirname(dir);
  }

  return dir;
})();

/** A file inside the engine package, used as importer for fallback resolution. */
export const ENGINE_ANCHOR = join(ENGINE_DIR, "package.json");

/**
 * Resolves an ESM specifier as if imported from `fromFile`. Returns an absolute path or null.
 */
export function resolveFrom(specifier: string, fromFile: string): string | null {
  try {
    const resolved = createJiti(fromFile).esmResolve(specifier, { try: true });
    return resolved ? (resolved.startsWith("file:") ? fileURLToPath(resolved) : resolved) : null;
  } catch {
    return null;
  }
}

/** Resolves a package directory (the folder containing its package.json). */
export function resolvePackageDir(name: string, fromFile: string): string | null {
  const entry = resolveFrom(`${name}/package.json`, fromFile);
  if (entry) {
    return dirname(entry);
  }

  const main = resolveFrom(name, fromFile);
  if (!main) {
    return null;
  }

  let dir = dirname(main);
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "package.json")) && dir.endsWith(name.split("/").at(-1)!)) {
      return dir;
    }

    dir = dirname(dir);
  }

  return null;
}
