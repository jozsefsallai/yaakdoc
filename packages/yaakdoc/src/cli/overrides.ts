import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConfigError, type YaakdocConfig } from "@yaakdoc/config";

/**
 * Reads the value of `--overrides`: inline JSON (starting with `{`) or the path of a JSON file. The
 * result is merged over the config file and validated together with it.
 */
export function readOverrides(value: string, cwd = process.cwd()): YaakdocConfig {
  const inline = value.trimStart().startsWith("{");

  let text = value;

  if (!inline) {
    try {
      text = readFileSync(resolve(cwd, value), "utf8");
    } catch (error) {
      throw new ConfigError(`Could not read overrides ${value}: ${(error as Error).message}`);
    }
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new ConfigError(
      `Invalid JSON in ${inline ? "--overrides" : `overrides ${value}`}: ${(error as Error).message}`,
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ConfigError("--overrides must be a JSON object");
  }

  return parsed as YaakdocConfig;
}
