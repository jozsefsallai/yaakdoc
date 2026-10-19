import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { YaakdocConfig } from "@yaakdoc/config";
import { detectExport } from "@yaakdoc/core/node";
import { VERSION } from "./context";
import { writeJson } from "./fs";

/** `$schema` value for yaakdoc.config.json: local copy when installed, otherwise unpkg. */
export function schemaUrl(cwd: string): string {
  const local = join(cwd, "node_modules", "yaakdoc", "config.schema.json");

  return existsSync(local)
    ? "./node_modules/yaakdoc/config.schema.json"
    : `https://unpkg.com/yaakdoc@${VERSION}/config.schema.json`;
}

export type InitOptions = {
  cwd?: string;
  config?: YaakdocConfig;
  force?: boolean;
};

/** Writes a yaakdoc.config.json (with `$schema` for editor autocomplete). */
export async function init(
  options: InitOptions = {},
): Promise<{ file: string; config: YaakdocConfig }> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const file = join(cwd, "yaakdoc.config.json");

  if (existsSync(file) && !options.force) {
    throw new Error("yaakdoc.config.json already exists.");
  }

  const config: YaakdocConfig = { $schema: schemaUrl(cwd), ...options.config };
  if (!config.export) {
    try {
      config.export = `./${relative(cwd, await detectExport(cwd))}`;
    } catch {
      // No export yet; auto-detection will run later.
    }
  }

  await writeJson(file, config);

  return { file, config };
}
