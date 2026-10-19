import { z } from "zod";
import { configSchema, type ResolvedConfig, type YaakdocConfig } from "./schema";

export * from "./schema";

/** Identity helper that provides type checking/autocomplete for `yaakdoc.config.ts`. */
export function defineConfig(config: YaakdocConfig): YaakdocConfig {
  return config;
}

export class ConfigError extends Error {
  override name = "ConfigError";
}

/** Validates a user config and applies defaults. */
export function parseConfig(input: unknown, source = "configuration"): ResolvedConfig {
  const result = configSchema.safeParse(input ?? {});

  if (!result.success) {
    throw new ConfigError(`Invalid ${source}:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
}

/** JSON Schema for `yaakdoc.config.json` (editor autocomplete via `$schema`). */
export function getConfigJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(configSchema, { io: "input", unrepresentable: "any" }) as Record<
    string,
    unknown
  >;
}

/** Deep merge where `override` wins and arrays are replaced rather than concatenated. */
export function mergeConfig<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const out: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) {
      continue;
    }

    const current = out[key];
    out[key] = isPlainObject(current) && isPlainObject(value) ? mergeConfig(current, value) : value;
  }

  return out as T;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
