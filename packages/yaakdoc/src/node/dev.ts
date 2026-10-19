import { createReadStream, existsSync } from "node:fs";
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { extname, resolve } from "node:path";
import { consola } from "consola";
import colors from "picocolors";
import {
  createServer as createViteServer,
  isRunnableDevEnvironment,
  type ViteDevServer,
} from "vite";
import {
  type Context,
  matchRoute,
  type Route,
  resolveContext,
  type YaakdocOptions,
} from "./context";
import { type RenderEntry, styleEntries, VIRTUAL_CLIENT, VIRTUAL_SERVER } from "./plugin";
import { CONTENT_TYPES, listen, serverUrl } from "./server";
import { createViteConfig } from "./vite";

export type DevServerOptions = YaakdocOptions & {
  port?: number;
  host?: string | boolean;
  open?: boolean;
  /** Reload when the export/config/assets change (default: true). */
  watch?: boolean;
  /** Called after the context is rebuilt because a watched file changed. */
  onReload?: (context: Context) => void;
};

export type DevServer = {
  url: string;
  vite: ViteDevServer;
  httpServer: Server;
  getContext: () => Context;
  close: () => Promise<void>;
};

/** Starts the development server with SSR, HMR for theme code/CSS and reload on export changes. */
export async function createDevServer(options: DevServerOptions = {}): Promise<DevServer> {
  let context = await resolveContext(options);

  const getContext = () => context;

  const httpServer = createHttpServer();

  let vite: ViteDevServer;

  const fullReload = () => vite?.ws.send({ type: "full-reload", path: "*" });

  const config = await createViteConfig(getContext, "development", { onSsrUpdate: fullReload });

  vite = await createViteServer({
    ...config,
    appType: "custom",
    server: { ...config.server, middlewareMode: true, hmr: { server: httpServer } },
  });

  const ssr = vite.environments.ssr;
  if (!ssr || !isRunnableDevEnvironment(ssr)) {
    throw new Error("The Vite SSR environment is not runnable.");
  }

  const render = async (route: Route, url: string) => {
    const { render } = (await ssr.runner.import(VIRTUAL_SERVER)) as RenderEntry;

    const inlineStyles = await Promise.all(
      styleEntries(context).map(async (file) => {
        const mod = (await ssr.runner.import(`${file}?inline`)) as { default: string };
        return { id: file, css: mod.default };
      }),
    );

    const html = await render({
      document: context.document,
      site: context.site,
      page: route.page,
      assets: {
        styles: [],
        inlineStyles,
        scripts: [`${context.config.base}@id/__x00__${VIRTUAL_CLIENT}`],
        modulePreloads: [],
      },
    });

    return vite.transformIndexHtml(url, html);
  };

  vite.middlewares.use(
    async (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => {
      const url = req.url ?? "/";
      const pathname = decodeURIComponent(url.split(/[?#]/)[0] ?? "/");

      try {
        const assetFile = context.assets.get(pathname);

        if (assetFile && existsSync(assetFile)) {
          res.setHeader(
            "Content-Type",
            CONTENT_TYPES[extname(assetFile)] ?? "application/octet-stream",
          );

          createReadStream(assetFile).pipe(res);
          return;
        }

        const route = matchRoute(context, pathname);

        const text =
          context.textFiles.get(pathname) ??
          (route && wantsMarkdown(req)
            ? context.textFiles.get(route.page.markdownUrl ?? "")
            : undefined);

        if (text !== undefined) {
          res.setHeader("Content-Type", CONTENT_TYPES[extname(pathname)] ?? CONTENT_TYPES[".md"]!);
          res.end(text);
          return;
        }

        if (req.method !== "GET" && req.method !== "HEAD") {
          return next();
        }

        if (route || isHtmlRequest(req, pathname)) {
          const html = await render(route ?? context.notFound, url);
          res.statusCode = route ? 200 : 404;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(html);
          return;
        }

        next();
      } catch (error) {
        vite.ssrFixStacktrace(error as Error);

        consola.error(error);

        res.statusCode = 500;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(errorPage(error as Error));
      }
    },
  );

  httpServer.on("request", vite.middlewares);

  if (options.watch !== false) {
    const watched = new Set(context.watchFiles.map((file) => resolve(file)));
    vite.watcher.add([...watched]);

    let timer: ReturnType<typeof setTimeout> | undefined;

    const onChange = (file: string) => {
      if (!watched.has(resolve(file))) {
        return;
      }

      clearTimeout(timer);

      timer = setTimeout(async () => {
        try {
          const previous = context;
          const next = await resolveContext(options);

          if (
            next.theme.root !== previous.theme.root ||
            next.config.base !== previous.config.base
          ) {
            consola.warn("The theme or base path changed. Restart yaakdoc to apply it.");
          }

          context = next;

          for (const file of next.watchFiles) {
            if (!watched.has(resolve(file))) {
              watched.add(resolve(file));
              vite.watcher.add(file);
            }
          }

          // Theme options / branding may affect CSS-in-SSR; invalidate the SSR entry.
          const mod = ssr.moduleGraph.getModuleById(`\0${VIRTUAL_SERVER}`);
          if (mod) {
            ssr.moduleGraph.invalidateModule(mod);
          }

          consola.success(`Reloaded ${colors.dim(file.replace(`${context.root}/`, ""))}`);
          options.onReload?.(context);

          fullReload();
        } catch (error) {
          consola.error((error as Error).message);
        }
      }, 50);
    };

    vite.watcher.on("change", onChange);
    vite.watcher.on("add", onChange);
  }

  const port = await listen(
    httpServer,
    options.port ?? context.config.server.port,
    options.host ?? context.config.server.host,
  );

  const url = serverUrl(options.host ?? context.config.server.host, port, context.config.base);

  if (options.open ?? context.config.server.open) {
    const { default: openBrowser } = await import("./open");
    openBrowser(url);
  }

  return {
    url,
    vite,
    httpServer,
    getContext,
    close: async () => {
      await vite.close();
      await new Promise<void>((done) => httpServer.close(() => done()));
    },
  };
}

function wantsMarkdown(req: IncomingMessage) {
  const accept = req.headers.accept ?? "";
  return accept.includes("text/markdown") && !accept.includes("text/html");
}

function isHtmlRequest(req: IncomingMessage, pathname: string) {
  return (req.headers.accept ?? "").includes("text/html") && !extname(pathname);
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!,
  );

function errorPage(error: Error) {
  return `<!doctype html><meta charset="utf-8"><title>yaakdoc error</title><style>body{font:14px/1.5 ui-monospace,monospace;padding:2rem;background:#1e1e2e;color:#f5e0dc}pre{white-space:pre-wrap;color:#f38ba8}</style><h1>Render error</h1><pre>${escapeHtml(error.stack ?? error.message)}</pre><script type="module" src="/@vite/client"></script>`;
}
