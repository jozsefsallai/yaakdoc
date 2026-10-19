import { readFile, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { normalize, YaakExportError } from "./normalize";
import type { YaakDocument } from "./types";

/** File names looked up (in order) when no export path is given. */
export const EXPORT_CANDIDATES = ["yaakdoc.json", "yaak.json"];

/** Finds a Yaak export in `cwd`: `yaakdoc.json`, then `yaak.json`. */
export async function detectExport(cwd: string): Promise<string> {
  for (const candidate of EXPORT_CANDIDATES) {
    const path = join(cwd, candidate);

    if (await isFile(path)) {
      return path;
    }
  }

  throw new YaakExportError(
    `No Yaak export found in ${cwd} (looked for ${EXPORT_CANDIDATES.join(" and ")}).\n` +
      "Export your workspace from Yaak (Settings → Export) and save it as yaak.json, " +
      "or pass the path explicitly: yaakdoc ./path/to/export.json",
  );
}

const isFile = (path: string) =>
  stat(path).then(
    (stats) => stats.isFile(),
    () => false,
  );

/** Reads a Yaak export file as raw JSON. */
export async function readExport(path: string): Promise<unknown> {
  const absolute = resolve(path);

  try {
    return JSON.parse(await readFile(absolute, "utf8"));
  } catch (error) {
    const reason =
      (error as NodeJS.ErrnoException).code === "ENOENT"
        ? "file not found"
        : (error as Error).message;

    throw new YaakExportError(`Could not read Yaak export ${basename(absolute)}: ${reason}`);
  }
}

/** Reads and normalizes a Yaak export file. */
export async function loadExport(path: string): Promise<YaakDocument> {
  return normalize(await readExport(path));
}
