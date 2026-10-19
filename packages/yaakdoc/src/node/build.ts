import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { absoluteUrl } from "@yaakdoc/core";
import type { Assets } from "@yaakdoc/react";
import { type Manifest, build as viteBuild } from "vite";
import { type Context, resolveContext, type YaakdocOptions } from "./context";
import { type RenderEntry, VIRTUAL_CLIENT, VIRTUAL_SERVER } from "./plugin";
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

  const getContext = () => context;
  const base = await createViteConfig(getContext, "production");

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

  const assets = assetsFromManifest(manifest, context.config.base);

  const { render } = (await import(
    pathToFileURL(join(ssrOutDir, "entry-server.mjs")).href
  )) as RenderEntry;

  const files: string[] = [];

  const write = async (file: string, content: string) => {
    const target = join(outDir, file);

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);

    files.push(file);
  };

  // 3. Prerender every route.
  for (const route of [...context.routes, context.notFound]) {
    await write(
      route.file,
      await render({ document: context.document, site: context.site, page: route.page, assets }),
    );
  }

  // 4. Markdown twins, llms.txt, branding assets, sitemap.
  for (const [url, content] of context.textFiles) {
    await write(stripBase(url, context.config.base), content);
  }

  for (const [url, source] of context.assets) {
    const file = stripBase(url, context.config.base);

    await mkdir(dirname(join(outDir, file)), { recursive: true });
    await copyFile(source, join(outDir, file));

    files.push(file);
  }

  if (context.site.url) {
    await write("sitemap.xml", sitemap(context));
  }

  await write(".nojekyll", "");

  await rm(ssrOutDir, { recursive: true, force: true });
  await rm(join(outDir, ".vite"), { recursive: true, force: true });

  return { outDir, files, context };
}

function assetsFromManifest(manifest: Manifest, base: string): Assets {
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
    styles: [...css].map((file) => base + file),
    scripts: [base + entry.file],
    inlineStyles: [],
    modulePreloads: collectImports(entry.imports).map((file) => base + file),
  };
}

const stripBase = (url: string, base: string) =>
  url.startsWith(base) ? url.slice(base.length) : url.replace(/^\//, "");

function sitemap(context: Context): string {
  const urls = context.routes.map((route) =>
    absoluteUrl(context.site.url!, context.config.base, route.path),
  );

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${url}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
}

/** Refuses to empty the project directory (or a parent of it). */
function assertSafeOutDir(outDir: string, root: string) {
  const rel = relative(resolve(outDir), resolve(root));

  if (rel === "" || (!rel.startsWith("..") && !rel.startsWith(sep) && !rel.includes(":"))) {
    throw new Error(
      `Refusing to use ${outDir} as outDir: it contains the project directory and would be emptied.`,
    );
  }
}
