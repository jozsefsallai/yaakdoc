import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import { type MountOptions, mountBase, mountOptions } from "./mount";
import { freePort } from "./server";

/**
 * Vite plugin that mounts the docs at `options.path` (default `/docs`) in a Vite-based app. The dev
 * server serves the live docs; builds add the prerendered docs to the client output. `cwd`
 * defaults to the app's Vite root.
 */
export function yaakdoc(options: MountOptions = {}): Plugin {
  const prefix = mountBase(options).slice(1);

  let config: ResolvedConfig;
  let built: Promise<{ dir: string; files: string[] }> | undefined;

  const buildDocs = async () => {
    const { build } = await import("./build");
    const dir = await mkdtemp(join(tmpdir(), "yaakdoc-"));
    const engine = mountOptions({ cwd: config.root, ...options });

    await build({ ...engine, overrides: { ...engine.overrides, outDir: dir } });

    const files = (await readdir(dir, { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name).slice(dir.length + 1));

    return { dir, files };
  };

  return {
    name: "yaakdoc:mount",

    configResolved(resolved) {
      config = resolved;
    },

    async configureServer(server) {
      const { createDevMiddleware } = await import("./dev");

      // Share the app's server for HMR (yaakdoc's socket lives under its own base path). Apps that
      // run Vite in middleware mode have none, so use a separate port.
      const docs = await createDevMiddleware({
        ...mountOptions({ cwd: server.config.root, ...options }),
        hmr: server.httpServer ? { server: server.httpServer } : { port: await freePort() },
      });

      // Registered before Vite's own middlewares, so SPA/framework fallbacks never see the docs.
      server.middlewares.use(docs.middleware);

      const close = server.close.bind(server);
      server.close = async () => {
        await docs.close();
        await close();
      };
    },

    async buildStart() {
      if (isClientBuild(this, config)) {
        built ??= buildDocs();
        await built;
      }
    },

    async generateBundle() {
      if (!built || !isClientBuild(this, config)) {
        return;
      }

      const { dir, files } = await built;

      for (const file of files) {
        this.emitFile({
          type: "asset",
          fileName: prefix + file.split("\\").join("/"),
          source: await readFile(join(dir, file)),
        });
      }
    },

    async closeBundle() {
      if (built && isClientBuild(this, config)) {
        await rm((await built).dir, { recursive: true, force: true });
        built = undefined;
      }
    },
  };
}

/**
 * Whether this is a client build: frameworks run several builds (client, SSR) and the docs belong
 * in the client output. Vite also calls build hooks in dev, where the docs are served live.
 */
function isClientBuild(
  context: { environment?: { config: { consumer: string } } },
  config: ResolvedConfig,
) {
  if (config.command !== "build") {
    return false;
  }

  return context.environment ? context.environment.config.consumer === "client" : !config.build.ssr;
}
