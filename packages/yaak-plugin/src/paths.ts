import { existsSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, sep } from "node:path";

/**
 * Finds Yaak's data directory from the plugin's own location. Plugins installed from the registry
 * live in `<dataDir>/installed-plugins/<name>`; a plugin installed from a local directory has no
 * such ancestor, and the Yaak CLI's default data directory (the app's) is used instead.
 */
export function findYaakDataDir(from: string): string | null {
  let dir = from;

  while (dirname(dir) !== dir) {
    if (basename(dir) === "installed-plugins") {
      return dirname(dir);
    }

    dir = dirname(dir);
  }

  return null;
}

/** Scratch directory for a workspace's export and generated overrides. */
export function workDir(workspaceId: string): string {
  return join(tmpdir(), "yaakdoc", workspaceId.replace(/[^\w-]/g, "_"));
}

/** Rewrites an absolute path inside `dir` to a `./` path, so a saved project can be moved. */
export function toProjectRelative(path: string, dir: string): string {
  if (!isAbsolute(path)) {
    return path;
  }

  const rel = relative(dir, path);

  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    return path;
  }

  return `./${rel.split(sep).join("/")}`;
}

/**
 * Makes a picked file part of a saved project, so the project still works when it's committed or
 * moved: files inside `dir` get a `./` path, files outside it are copied into `dir/assets/`. URLs
 * and paths that don't exist are returned as they are. `copied` maps sources to their project path,
 * so a file picked twice is copied once and different files with the same name don't collide.
 */
export async function intoProject(
  path: string,
  dir: string,
  copied: Map<string, string>,
): Promise<string> {
  if (!isAbsolute(path) || !existsSync(path)) {
    return path;
  }

  const inside = toProjectRelative(path, dir);

  if (inside !== path) {
    return inside;
  }

  const known = copied.get(path);

  if (known) {
    return known;
  }

  const taken = new Set(copied.values());

  const ext = extname(path);

  let name = basename(path);

  for (let i = 2; taken.has(`./assets/${name}`); i++) {
    name = `${basename(path, ext)}-${i}${ext}`;
  }

  await mkdir(join(dir, "assets"), { recursive: true });
  await copyFile(path, join(dir, "assets", name));

  const projectPath = `./assets/${name}`;
  copied.set(path, projectPath);

  return projectPath;
}
