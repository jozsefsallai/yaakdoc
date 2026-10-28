import { resolve } from "node:path";
import type { YaakdocConfig } from "@yaakdoc/config";
import { normalizeBase } from "@yaakdoc/core";
import type { YaakdocOptions } from "./context";

/** Where the docs are mounted when no path is given. */
export const DEFAULT_MOUNT_PATH = "/docs";

/** Options shared by the integrations that mount the docs inside another app. */
export type MountOptions = {
  /** Path the docs are served under (default: `/docs`). Takes precedence over `config.base`. */
  path?: string;
  /** yaakdoc config, merged over `yaakdoc.config.*` if there is one. Paths are relative to `cwd`. */
  config?: YaakdocConfig;
  /** Path of the Yaak export (shorthand for `config.export`). */
  export?: string;
  /** Project directory (default: `process.cwd()`). */
  cwd?: string;
  /** Explicit config file, or `false` to not look for `yaakdoc.config.*`. */
  configFile?: string | false;
  /**
   * Folder copied to the docs' root as-is. Defaults to none: the project's `public/` usually
   * belongs to the host app.
   */
  publicDir?: string | false;
};

/** The base path the docs are mounted at, e.g. `/docs/`. */
export function mountBase(options: Pick<MountOptions, "path"> = {}): string {
  return normalizeBase(options.path ?? DEFAULT_MOUNT_PATH);
}

/** Engine options for docs mounted at `options.path`. */
export function mountOptions(
  options: MountOptions = {},
): YaakdocOptions & { cwd: string; overrides: YaakdocConfig } {
  return {
    cwd: resolve(options.cwd ?? process.cwd()),
    ...(options.configFile !== undefined ? { configFile: options.configFile } : {}),
    publicDir: options.publicDir ?? false,
    overrides: {
      ...options.config,
      ...(options.export ? { export: options.export } : {}),
      base: mountBase(options),
    },
  };
}
