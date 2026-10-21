import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { absoluteUrl } from "@yaakdoc/core";
import type { Assets } from "@yaakdoc/react";
import type { Context, Route } from "./context";

/** What the SSR entry exports, in dev and in builds. */
export type RenderEntry = {
  render: (input: {
    document: Context["document"];
    site: Context["site"];
    page: Route["page"];
    assets: Assets;
  }) => Promise<string>;
};

/** Prefixes the client asset paths (relative to the output directory) with the site's base. */
export function withBase(assets: Assets, base: string): Assets {
  const prefix = (path: string) => base + path;

  return {
    styles: assets.styles.map(prefix),
    scripts: assets.scripts.map(prefix),
    inlineStyles: assets.inlineStyles,
    modulePreloads: assets.modulePreloads.map(prefix),
  };
}

/** Refuses to empty the project directory (or a parent of it). */
export function assertSafeOutDir(outDir: string, root: string) {
  const rel = relative(resolve(outDir), resolve(root));

  if (rel === "" || (!rel.startsWith("..") && !rel.startsWith(sep) && !rel.includes(":"))) {
    throw new Error(
      `Refusing to use ${outDir} as outDir: it contains the project directory and would be emptied.`,
    );
  }
}

/** Empties (or creates) the output directory, after checking that it's safe to. */
export async function emptyOutDir(outDir: string, root: string) {
  assertSafeOutDir(outDir, root);

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
}

/**
 * Writes the site into `context.config.outDir`, next to the client assets that are already there:
 * every route prerendered with `render`, the Markdown twins and llms.txt, branding assets and the
 * sitemap. Returns the written files, relative to the output directory.
 */
export async function writeSite(
  context: Context,
  { render, assets }: { render: RenderEntry["render"]; assets: Assets },
): Promise<string[]> {
  const outDir = context.config.outDir;
  const files: string[] = [];

  const write = async (file: string, content: string) => {
    const target = join(outDir, file);

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);

    files.push(file);
  };

  // 1. Prerender every route.
  for (const route of [...context.routes, context.notFound]) {
    await write(
      route.file,
      await render({ document: context.document, site: context.site, page: route.page, assets }),
    );
  }

  // 2. Markdown twins, llms.txt, branding assets, sitemap.
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

  return files;
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
