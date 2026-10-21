import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Assets } from "@yaakdoc/react";
import { type Manifest, build as viteBuild } from "vite";
import { type Context, resolveContext, type YaakdocOptions } from "./context";
import { VIRTUAL_CLIENT, VIRTUAL_SERVER } from "./plugin";
import { assertSafeOutDir, type RenderEntry, withBase, writeSite } from "./site";
import { createViteConfig } from "./vite";

export type BuildResult = {
  outDir: string;
  /** Written files, relative to outDir. */
  files: string[];
  context: Context;
};

const SSR_DIR = ".yaakdoc-ssr";

/** Builds the static site: client assets, prerendered HTML for every route, Markdown and llms.txt. */
export async function build(options: YaakdocOptions = {}): Promise<BuildResult> {
  const previousEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const context = await resolveContext(options);
    return await buildWithContext(context);
  } finally {
    if (previousEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousEnv;
    }
  }
}

export async function buildWithContext(context: Context): Promise<BuildResult> {
  const outDir = context.config.outDir;

  assertSafeOutDir(outDir, context.root);

  const { assets, ssrEntry } = await bundleTheme(context, outDir);
  const { render } = (await import(pathToFileURL(ssrEntry).href)) as RenderEntry;

  const files = await writeSite(context, { render, assets: withBase(assets, context.config.base) });

  await rm(dirname(ssrEntry), { recursive: true, force: true });

  return { outDir, files, context };
}

export type ThemeBundle = {
  /** Client assets, relative to the output directory. */
  assets: Assets;
  /** The SSR entry (exports `render`), in a temporary directory inside the output directory. */
  ssrEntry: string;
};

/**
 * Builds the theme with Vite: the island runtime and CSS into `outDir` (emptied first), and the SSR
 * entry, fully bundled so it runs from anywhere. Pass `base: "./"` for client assets that work
 * under any base path (used to precompile the theme bundled into the Yaak plugin).
 */
export async function bundleTheme(
  context: Context,
  outDir: string,
  options: { base?: string } = {},
): Promise<ThemeBundle> {
  const getContext = () => context;
  const viteConfig = await createViteConfig(getContext, "production");
  const base = { ...viteConfig, ...(options.base ? { base: options.base } : {}) };

  // 1. Client: island runtime + theme CSS.
  await viteBuild({
    ...base,
    build: {
      outDir,
      emptyOutDir: true,
      manifest: true,
      assetsDir: "_yaakdoc",
      copyPublicDir: true,
      rolldownOptions: { ...base.build?.rolldownOptions, input: { client: VIRTUAL_CLIENT } },
    },
  });

  // 2. Server: the SSR entry, fully bundled so it runs from anywhere.
  const ssrOutDir = join(outDir, SSR_DIR);
  await viteBuild({
    ...base,
    publicDir: false,
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    ssr: { ...base.ssr, noExternal: true },
    build: {
      ssr: true,
      outDir: ssrOutDir,
      emptyOutDir: true,
      copyPublicDir: false,
      rolldownOptions: {
        ...base.build?.rolldownOptions,
        input: { "entry-server": VIRTUAL_SERVER },
        output: { entryFileNames: "[name].mjs", format: "esm" },
      },
    },
  });

  const manifest = JSON.parse(
    await readFile(join(outDir, ".vite", "manifest.json"), "utf8"),
  ) as Manifest;

  await rm(join(outDir, ".vite"), { recursive: true, force: true });

  return { assets: assetsFromManifest(manifest), ssrEntry: join(ssrOutDir, "entry-server.mjs") };
}

/** Client assets of the build, relative to the output directory. */
function assetsFromManifest(manifest: Manifest): Assets {
  const entry = Object.values(manifest).find((chunk) => chunk.isEntry);
  if (!entry) {
    throw new Error("Client build produced no entry chunk.");
  }

  const collectImports = (keys: string[] = [], seen = new Set<string>()): string[] =>
    keys.flatMap((key) => {
      if (seen.has(key)) {
        return [];
      }

      seen.add(key);

      const chunk = manifest[key];
      return chunk ? [chunk.file, ...collectImports(chunk.imports, seen)] : [];
    });

  const css = new Set<string>([...(entry.css ?? [])]);

  for (const key of entry.imports ?? []) {
    for (const file of manifest[key]?.css ?? []) {
      css.add(file);
    }
  }

  return {
    styles: [...css],
    scripts: [entry.file],
    inlineStyles: [],
    modulePreloads: collectImports(entry.imports),
  };
}
