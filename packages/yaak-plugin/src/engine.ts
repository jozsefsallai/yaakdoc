// The built-in engine: yaakdoc's Vite-free pipeline with a precompiled Kiseki. scripts/prebuild.mjs
// bundles this file into generated/engine.cjs, which the plugin loads lazily (see runtime.ts).
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { YaakdocConfig } from "@yaakdoc/config";
import kiseki from "@yaakdoc/theme-kiseki";
import {
  emptyOutDir,
  publicAsset,
  resolveContext,
  themeFromDefinition,
  themePackageCandidates,
  VERSION,
  withBase,
  writeSite,
} from "yaakdoc/static";
import { assets, files } from "../generated/kiseki-client";
import { render } from "../generated/kiseki-server.mjs";

export { themePackageCandidates, VERSION };

/** Theme specs the engine has built in. */
const BUILT_IN_THEMES = new Set(["kiseki", "@yaakdoc/theme-kiseki"]);

export const isBuiltInTheme = (spec: string) => BUILT_IN_THEMES.has(spec);

/** Thrown when the config asks for a theme that has to be built with the yaakdoc CLI. */
export class ExternalThemeError extends Error {
  override name = "ExternalThemeError";

  constructor(readonly theme: string) {
    super(`The theme "${theme}" isn't built into the plugin.`);
  }
}

export type BuildOptions = {
  /** The Yaak export. */
  exportData: unknown;
  /** Directory relative paths in `overrides` resolve against. */
  cwd: string;
  configFile?: string;
  overrides: YaakdocConfig;
};

export type BuildSummary = { outDir: string; pages: number; textFiles: number };

/** Builds the site into `overrides.outDir` (or the config's), like `yaakdoc build`. */
export async function buildSite(options: BuildOptions): Promise<BuildSummary> {
  const context = await resolveContext({
    cwd: options.cwd,
    ...(options.configFile ? { configFile: options.configFile } : {}),
    overrides: options.overrides,
    exportData: options.exportData,
    resolveTheme: (spec, { themeOptions }) => {
      if (!isBuiltInTheme(spec)) {
        throw new ExternalThemeError(spec);
      }

      return themeFromDefinition(kiseki, {
        manifest: join(options.cwd, "@yaakdoc/theme-kiseki/theme.ts"),
        packageName: "@yaakdoc/theme-kiseki",
        themeOptions,
      });
    },
  });

  const { outDir, base } = context.config;

  await emptyOutDir(outDir, context.root);

  for (const [file, content] of Object.entries(files)) {
    await mkdir(dirname(join(outDir, file)), { recursive: true });
    await writeFile(join(outDir, file), Buffer.from(content, "base64"));
  }

  // The CLI bundles `branding.customCss` with the theme's styles. The precompiled theme can't, so the
  // file is published as is and linked after them.
  const site = withBase(assets, base);

  const { customCss } = context.config.branding;

  if (customCss) {
    const url = publicAsset(customCss, base, context.assets);

    if (url === customCss && !/^[a-z]+:\/\//i.test(customCss)) {
      throw new Error(`Custom CSS not found: ${customCss}`);
    }

    site.styles.push(url!);
  }

  const written = await writeSite(context, { render, assets: site });

  return {
    outDir,
    pages: written.filter((file) => file.endsWith(".html")).length,
    textFiles: written.filter((file) => file.endsWith(".md") || file.endsWith(".txt")).length,
  };
}
