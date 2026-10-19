import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { extname, join, resolve } from "node:path";
import { loadConfig } from "@yaakdoc/config/node";
import sirv from "sirv";
import { CONTENT_TYPES, listen, serverUrl } from "./server";

export type PreviewOptions = {
  cwd?: string;
  configFile?: string;
  outDir?: string;
  port?: number;
  host?: string | boolean;
  open?: boolean;
};

/** Serves a built site (like a static host would, including 404.html and base path). */
export async function preview(
  options: PreviewOptions = {},
): Promise<{ url: string; server: Server; close: () => Promise<void> }> {
  const { config } = await loadConfig({
    cwd: options.cwd ?? process.cwd(),
    ...(options.configFile ? { configFile: options.configFile } : {}),
  });

  const outDir = options.outDir
    ? resolve(options.cwd ?? process.cwd(), options.outDir)
    : config.outDir;

  if (!existsSync(join(outDir, "index.html"))) {
    throw new Error(`No build found in ${outDir}. Run \`yaakdoc build\` first.`);
  }

  const serve = sirv(outDir, {
    dev: true,
    etag: true,
    extensions: ["html"],
    setHeaders: (res, pathname) => {
      // sirv doesn't know Markdown; use the same content types as the dev server.
      const type = CONTENT_TYPES[extname(pathname)];
      if (type) {
        res.setHeader("Content-Type", type);
      }
    },
  });

  const notFoundFile = join(outDir, "404.html");
  const base = config.base;

  const server = createServer((req, res) => {
    const url = req.url ?? "/";

    if (!url.startsWith(base) && base !== "/") {
      res.writeHead(302, { Location: base });
      res.end();
      return;
    }

    req.url = base === "/" ? url : url.slice(base.length - 1);

    serve(req, res, () => {
      res.statusCode = 404;

      if (existsSync(notFoundFile)) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(readFileSync(notFoundFile));
      } else {
        res.end("Not found");
      }
    });
  });

  const host = options.host ?? config.server.host;
  const port = await listen(server, options.port ?? config.server.port, host);
  const url = serverUrl(host, port, base);

  if (options.open) {
    (await import("./open")).default(url);
  }

  return { url, server, close: () => new Promise((done) => server.close(() => done())) };
}
