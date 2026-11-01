import { existsSync, type FSWatcher, watch } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { loadConfig } from "@yaakdoc/config/node";
import { consola } from "consola";
import type { YaakdocOptions } from "./context";
import {
  createDevMiddleware,
  type DevMiddleware,
  type DevServerOptions,
  devRequestHandler,
  devServerHmr,
} from "./dev";
import { errorPage, pollScript } from "./error-page";
import { listen, serverUrl } from "./server";

export type RecoveringDevServer = {
  url: string;
  close: () => Promise<void>;
};

/**
 * The dev server, for integrations, where failing docs mustn't take the host app down with them.
 * When the docs can't load (a missing export, an invalid config...), every request gets an error
 * page and the docs load once the files are fixed. It listens on `port` from the start, so the
 * host app can proxy to it right away.
 */
export async function createRecoveringDevServer(
  options: DevServerOptions & { port: number; base: string },
): Promise<RecoveringDevServer> {
  const host = options.host ?? false;
  const httpServer = createServer();

  let handler: (req: IncomingMessage, res: ServerResponse) => void = () => {};
  httpServer.on("request", (req, res) => handler(req, res));

  const port = await listen(httpServer, options.port, host);

  if (port !== options.port) {
    httpServer.close();
    throw new Error(`Port ${options.port} is already in use.`);
  }

  let dev: DevMiddleware | undefined;
  let watchers: FSWatcher[] = [];
  let lastError: string | undefined;
  let closed = false;

  const stopWatching = () => {
    for (const watcher of watchers) {
      watcher.close();
    }

    watchers = [];
  };

  const start = async () => {
    try {
      dev = await createDevMiddleware({ ...options, hmr: devServerHmr(httpServer, options) });
      handler = devRequestHandler(dev);

      if (lastError) {
        consola.success("The docs loaded.");
      }
    } catch (error) {
      // Saving other files in a watched folder retries too; only log what's new.
      if ((error as Error).message !== lastError) {
        consola.error(
          `${(error as Error).message}\nThe docs show this error until it's fixed; the rest of the app keeps working.`,
        );
      }

      lastError = (error as Error).message;

      handler = (_req, res) => {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(errorPage(error as Error, { title: "Couldn't load the docs", script: pollScript }));
      };

      let timer: ReturnType<typeof setTimeout> | undefined;

      const retry = () => {
        clearTimeout(timer);

        timer = setTimeout(() => {
          if (closed) {
            return;
          }

          stopWatching();
          start().catch((error: Error) => consola.error(error));
        }, 100);
      };

      watchers = (await inputDirs(options)).map((dir) => watch(dir, retry));
    }
  };

  await start();

  return {
    url: serverUrl(host, port, options.base),
    close: async () => {
      closed = true;
      stopWatching();

      await dev?.close();
      await new Promise<void>((done) => {
        httpServer.close(() => done());
        httpServer.closeAllConnections();
      });
    },
  };
}

/**
 * Directories whose files decide whether the docs load: the project (where the export and config
 * are detected), and the folders of the config file, the export and the pages, when they're known.
 */
async function inputDirs(options: YaakdocOptions): Promise<string[]> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const dirs = new Set([cwd]);

  if (typeof options.configFile === "string") {
    dirs.add(dirname(resolve(cwd, options.configFile)));
  }

  try {
    const { config, configFile } = await loadConfig({
      cwd,
      ...(options.configFile !== undefined ? { configFile: options.configFile } : {}),
      ...(options.overrides ? { overrides: options.overrides } : {}),
    });

    if (configFile) {
      dirs.add(dirname(configFile));
    }

    if (config.export) {
      dirs.add(dirname(config.export));
    }

    if (config.pagesDir) {
      dirs.add(config.pagesDir);
    }
  } catch {
    // The config itself is broken: watching its folder is enough.
  }

  return [...dirs].filter((dir) => existsSync(dir));
}
