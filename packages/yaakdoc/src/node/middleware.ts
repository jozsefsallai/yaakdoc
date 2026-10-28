import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "@yaakdoc/config/node";
import type { HmrOptions } from "vite";
import { build } from "./build";
import { createDevMiddleware } from "./dev";
import { type MountOptions, mountOptions } from "./mount";
import { createStaticMiddleware } from "./preview";
import type { Middleware } from "./server";

export type YaakdocMiddlewareOptions = MountOptions & {
  /**
   * Serve the live dev server (SSR, HMR, reload on export changes) instead of a built site.
   * Defaults to `true` unless `NODE_ENV` is `production`.
   */
  dev?: boolean;
  /** In production, build the docs when the middleware is created instead of serving a prebuilt site. */
  build?: boolean;
  /** HMR options in dev, e.g. `{ server }` to share your HTTP server (default: a separate port). */
  hmr?: HmrOptions;
};

export type YaakdocMiddleware = Middleware & {
  /** Stops the dev server (no-op for built sites). */
  close: () => Promise<void>;
};

/**
 * Mounts the docs at `options.path` (default `/docs`) in a Connect/Express-style server. Requests
 * outside that path are passed on with `next()`.
 */
export async function yaakdocMiddleware(
  options: YaakdocMiddlewareOptions = {},
): Promise<YaakdocMiddleware> {
  const engine = mountOptions(options);
  const base = engine.overrides.base!;

  let handler: Middleware;
  let close = async () => {};

  if (options.dev ?? process.env.NODE_ENV !== "production") {
    const dev = await createDevMiddleware({
      ...engine,
      ...(options.hmr ? { hmr: options.hmr } : {}),
    });

    handler = dev.middleware;
    close = dev.close;
  } else if (options.build) {
    const { outDir } = await build(engine);
    handler = createStaticMiddleware({ outDir, base });
  } else {
    const { config } = await loadConfig(engine);

    if (!existsSync(join(config.outDir, "index.html"))) {
      throw new Error(
        `No docs build found in ${config.outDir}. Run \`yaakdoc build --base ${base}\` first, or pass \`build: true\`.`,
      );
    }

    handler = createStaticMiddleware({ outDir: config.outDir, base });
  }

  const middleware: Middleware = (req, res, next) => {
    // Express strips the mount path from `req.url` (`app.use("/docs", ...)`); the docs need all of it.
    const original = (req as { originalUrl?: string }).originalUrl;

    if (original === undefined || original === req.url) {
      return handler(req, res, next);
    }

    const url = req.url;
    req.url = original;

    handler(req, res, (error) => {
      req.url = url;
      next(error);
    });
  };

  return Object.assign(middleware, { close });
}
