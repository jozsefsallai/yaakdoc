import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import type { ResolvedConfig, YaakdocConfig } from "@yaakdoc/config";
import { loadConfig } from "@yaakdoc/config/node";
import {
  findWorkspace,
  isUrl,
  normalize,
  type PreparedDocument,
  prepareDocument,
  sanitizeExport,
  selectEnvironment,
  summarize,
  type WorkspaceDoc,
  type YaakDocument,
} from "@yaakdoc/core";
import { detectExport, readExport } from "@yaakdoc/core/node";
import {
  folderToMarkdown,
  indexToMarkdown,
  llmsFullTxt,
  llmsTxt,
  requestToMarkdown,
} from "@yaakdoc/markdown";
import type { PageData, SiteData, SiteLogo } from "@yaakdoc/react";
import { generateExamples } from "@yaakdoc/snippets";
import { createRenderer, loadSnippets } from "./render";
import { ENGINE_DIR } from "./resolve";
import { type ResolvedTheme, resolveTheme } from "./theme";

export type YaakdocOptions = {
  /** Project directory (default: `process.cwd()`). */
  cwd?: string;
  /** Explicit config file. */
  configFile?: string;
  /** Config overrides (e.g. from CLI flags). Takes precedence over the config file. */
  overrides?: YaakdocConfig;
};

export type Route = {
  /** URL path including the base, e.g. `/docs/products/`. */
  path: string;
  /** Output file relative to outDir, e.g. `products/index.html`. */
  file: string;
  page: PageData;
};

export type Context = {
  cwd: string;
  root: string;
  configFile: string | null;
  config: ResolvedConfig;
  exportPath: string;
  source: YaakDocument;
  theme: ResolvedTheme;
  document: PreparedDocument;
  site: SiteData;
  routes: Route[];
  notFound: Route;
  /** Markdown/text outputs keyed by URL path (e.g. `/products.md`, `/llms.txt`). */
  textFiles: Map<string, string>;
  /** Local branding assets keyed by URL path → absolute file path. */
  assets: Map<string, string>;
  /** Files that trigger a full rebuild of the context when changed. */
  watchFiles: string[];
};

export const VERSION: string = JSON.parse(
  readFileSync(resolve(ENGINE_DIR, "package.json"), "utf8"),
).version;

/** Loads config, export and theme, and prepares everything needed to render the site. */
export async function resolveContext(options: YaakdocOptions = {}): Promise<Context> {
  const cwd = resolve(options.cwd ?? process.cwd());

  const { config, configFile, root } = await loadConfig({
    cwd,
    ...(options.configFile ? { configFile: options.configFile } : {}),
    ...(options.overrides ? { overrides: options.overrides } : {}),
  });

  const exportPath = config.export ?? (await detectExport(root));
  const rawExport = await readExport(exportPath);

  const source = normalize(rawExport);

  const workspace = findWorkspace(source, config.workspace);

  const environments =
    config.environments === "public"
      ? workspace.environments.filter((env) => env.public)
      : (config.environments ?? []).map((name) => selectEnvironment(workspace, name)!);

  const environment =
    config.environment === false
      ? null
      : config.environment === undefined && environments[0]
        ? environments[0]
        : selectEnvironment(workspace, config.environment);

  const theme = await resolveTheme(config.theme, { root, themeOptions: config.themeOptions });
  const renderer = await createRenderer(theme.highlight);
  const snippets = await loadSnippets(config.snippets, root);

  const document = await prepareDocument({
    workspace,
    environment,
    environments,
    pages: config.pages,
    base: config.base,
    variables: config.variables,
    filter: config.filter,
    renderMarkdown: renderer.markdown,
    highlight: renderer.highlight,
    examples: (request) => generateExamples(request, snippets),
    meta: { yaakVersion: source.yaakVersion, exportedAt: source.exportedAt },
  });

  const assets = new Map<string, string>();
  const asset = (path: string | undefined) => publicAsset(path, config.base, assets);

  const site = await createSiteData(config, document, theme, asset, renderer.markdown);

  const { routes, notFound } = createRoutes(document, site);

  const markdownOptions = {
    title: site.title,
    description: site.description,
    base: config.base,
    ...(site.url ? { siteUrl: site.url } : {}),
  };

  const textFiles = new Map<string, string>();

  if (config.llms.enabled) {
    // The Markdown twin mirrors the page: in single-page mode the index page contains everything.
    textFiles.set(
      `${config.base}index.md`,
      config.pages === "single"
        ? llmsFullTxt(document, markdownOptions)
        : indexToMarkdown(document, markdownOptions),
    );

    for (const folder of Object.values(document.folders)) {
      textFiles.set(folder.markdownUrl, folderToMarkdown(document, folder, markdownOptions));
    }

    for (const request of Object.values(document.requests)) {
      textFiles.set(request.markdownUrl, requestToMarkdown(request, markdownOptions));
    }

    textFiles.set(
      `${config.base}llms.txt`,
      llmsTxt(document, {
        ...markdownOptions,
        ...(config.llms.full ? { fullTextUrl: `${config.base}llms-full.txt` } : {}),
      }),
    );

    if (config.llms.full) {
      textFiles.set(`${config.base}llms-full.txt`, llmsFullTxt(document, markdownOptions));
    }
  }

  // Publish a sanitized export for "Run in Yaak", unless the config points to one hosted elsewhere.
  const externalExport = typeof config.runInYaak === "object" && config.runInYaak.url;

  if (site.runInYaak && !externalExport) {
    const shared = shareableExport(rawExport, workspace, document, config.variables.hide);
    textFiles.set(site.runInYaak.dataUrl, JSON.stringify(shared, null, 2));
  }

  return {
    cwd,
    root,
    configFile,
    config,
    exportPath,
    source,
    theme,
    document,
    site,
    routes,
    notFound,
    textFiles,
    assets,
    watchFiles: [exportPath, ...(configFile ? [configFile] : []), ...assets.values()],
  };
}

/** The export restricted to what the docs show, safe to publish for "Run in Yaak". */
function shareableExport(
  raw: unknown,
  workspace: WorkspaceDoc,
  document: PreparedDocument,
  hide: readonly string[],
) {
  const environmentIds = new Set<string>(document.environments.map((env) => env.id));

  if (document.environment) {
    environmentIds.add(document.environment.id);
  }

  if (workspace.baseEnvironment) {
    environmentIds.add(workspace.baseEnvironment.id);
  }

  for (const folderId of Object.keys(document.folders)) {
    for (const env of workspace.folderEnvironments[folderId] ?? []) {
      environmentIds.add(env.id);
    }
  }

  return sanitizeExport(raw, {
    workspaceId: workspace.id,
    folderIds: new Set(Object.keys(document.folders)),
    requestIds: new Set(Object.keys(document.requests)),
    environmentIds,
    hide,
  });
}

/**
 * Maps a local asset (logo, favicon) to a public URL under `<base>_yaakdoc/`. URLs and site-root
 * paths that don't exist on disk (e.g. `/logo.svg` served from `public/`) are kept as is.
 */
function publicAsset(
  path: string | undefined,
  base: string,
  assets: Map<string, string>,
): string | null {
  if (!path) {
    return null;
  }

  if (isUrl(path) || !existsSync(path)) {
    return path;
  }

  const hash = createHash("sha256").update(path).digest("hex").slice(0, 8);
  const url = `${base}_yaakdoc/${basename(path, extname(path))}-${hash}${extname(path)}`;
  assets.set(url, path);

  return url;
}

async function createSiteData(
  config: ResolvedConfig,
  document: PreparedDocument,
  theme: ResolvedTheme,
  asset: (path: string | undefined) => string | null,
  markdown: (source: string) => Promise<string>,
): Promise<SiteData> {
  const { branding } = config;

  const title = branding.title ?? document.workspace.name;

  let logo: SiteLogo | null = null;

  if (typeof branding.logo === "string") {
    logo = { light: asset(branding.logo) ?? undefined, alt: title, href: config.base };
  } else if (branding.logo) {
    logo = {
      ...(branding.logo.light ? { light: asset(branding.logo.light)! } : {}),
      ...(branding.logo.dark ? { dark: asset(branding.logo.dark)! } : {}),
      alt: branding.logo.alt ?? title,
      href: branding.logo.href ?? config.base,
      ...(branding.logo.width ? { width: branding.logo.width } : {}),
      ...(branding.logo.height ? { height: branding.logo.height } : {}),
    };
  }

  return {
    title,
    description: branding.description ?? summarize(document.workspace.description, 200),
    url: branding.url ?? null,
    base: config.base,
    pages: config.pages,
    logo,
    favicon: asset(branding.favicon),
    colors: branding.colors ?? {},
    fonts: branding.fonts ?? {},
    links: branding.links,
    footerHtml: branding.footer ? await markdown(branding.footer) : null,
    defaultColorMode: branding.defaultColorMode,
    colorModeToggle: branding.colorModeToggle,
    llms: {
      ...config.llms,
      txtUrl: config.llms.enabled ? `${config.base}llms.txt` : null,
      fullTxtUrl: config.llms.enabled && config.llms.full ? `${config.base}llms-full.txt` : null,
    },
    showVariables: config.variables.show,
    runInYaak: config.runInYaak
      ? {
          name: (typeof config.runInYaak === "object" && config.runInYaak.name) || title,
          dataUrl:
            (typeof config.runInYaak === "object" && config.runInYaak.url) ||
            `${config.base}yaak.json`,
        }
      : null,
    head: config.head,
    themeOptions: theme.options,
    generator: `yaakdoc ${VERSION}`,
  };
}

function createRoutes(
  document: PreparedDocument,
  site: SiteData,
): { routes: Route[]; notFound: Route } {
  const { base } = site;

  const llms = site.llms.enabled;

  const routes: Route[] = [
    {
      path: base,
      file: "index.html",
      page: {
        kind: "index",
        id: null,
        path: base,
        title: "",
        description: site.description,
        markdownUrl: llms ? `${base}index.md` : null,
      },
    },
  ];

  if (site.pages === "per-request") {
    for (const folder of Object.values(document.folders)) {
      routes.push({
        path: folder.href,
        file: `${folder.slug}/index.html`,
        page: {
          kind: "folder",
          id: folder.id,
          path: folder.href,
          title: folder.name,
          description: folder.summary,
          markdownUrl: llms ? folder.markdownUrl : null,
        },
      });
    }

    for (const request of Object.values(document.requests)) {
      routes.push({
        path: request.href,
        file: `${request.slug}/index.html`,
        page: {
          kind: "request",
          id: request.id,
          path: request.href,
          title: request.name,
          description: request.summary,
          markdownUrl: llms ? request.markdownUrl : null,
        },
      });
    }
  }

  const notFound: Route = {
    path: `${base}404.html`,
    file: "404.html",
    page: {
      kind: "not-found",
      id: null,
      path: `${base}404.html`,
      title: "Page not found",
      description: "",
      markdownUrl: null,
    },
  };

  return { routes, notFound };
}

/** Finds the route for a URL path (ignoring query/hash; `/x` matches `/x/`). */
export function matchRoute(context: Context, pathname: string): Route | null {
  const path = decodeURIComponent(pathname.split(/[?#]/)[0] ?? "/");
  const normalized = path.endsWith("/") || path.endsWith(".html") ? path : `${path}/`;

  return (
    context.routes.find(
      (route) => route.path === normalized || `${route.path}index.html` === path,
    ) ?? null
  );
}
