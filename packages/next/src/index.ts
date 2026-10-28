import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import type { NextConfig } from "next";
import { type MountOptions, mountBase, runBuildWorker, startDevWorker } from "yaakdoc/integration";

export type YaakdocNextOptions = MountOptions;

type Rewrite = {
  source: string;
  destination: string;
};

type Rewrites = {
  beforeFiles: Rewrite[];
  afterFiles: Rewrite[];
  fallback: Rewrite[];
};

type NextConfigContext = {
  defaultConfig: NextConfig;
};

type NextConfigInput =
  | NextConfig
  | ((phase: string, context: NextConfigContext) => NextConfig | Promise<NextConfig>);

// The values of `next/constants`, inlined so the adapter doesn't load Next.js itself.
const PHASE_DEVELOPMENT_SERVER = "phase-development-server";
const PHASE_PRODUCTION_BUILD = "phase-production-build";
const PHASE_PRODUCTION_SERVER = "phase-production-server";

// Next.js loads its config in several processes; these are shared with child processes through
// the environment, so the docs are built (and the dev server started) once.
const pending = new Map<string, Promise<string>>();

export type WithYaakdoc = (
  nextConfig?: NextConfigInput,
) => (phase: string, context: NextConfigContext) => Promise<NextConfig>;

/**
 * Creates `withYaakdoc`, which serves yaakdoc documentation from a Next.js app at `options.path`
 * (default `/docs`):
 *
 * - `next dev` starts the yaakdoc dev server in a child process and proxies the docs to it.
 * - `next build` prerenders the docs into `public/<path>`, so they're deployed as static files.
 *
 * ```ts
 * const withYaakdoc = createNextYaakdoc({ export: "./yaak.json" });
 * export default withYaakdoc(nextConfig);
 * ```
 */
export function createNextYaakdoc(options: YaakdocNextOptions = {}): WithYaakdoc {
  const path = mountBase(options).slice(0, -1);

  if (path === "") {
    throw new Error("createNextYaakdoc: the docs can't be mounted at the root of a Next.js app.");
  }

  return (nextConfig = {}) =>
    async (phase, context) => {
      const config =
        typeof nextConfig === "function" ? await nextConfig(phase, context) : nextConfig;

      const cwd = resolve(options.cwd ?? process.cwd());

      // Public files and rewrites are relative to Next's basePath; the docs' own links aren't.
      const mount: MountOptions = { ...options, cwd, path: `${config.basePath ?? ""}${path}` };
      const outDir = join(cwd, "public", path);

      let rewrites: Partial<Rewrites>;

      if (phase === PHASE_DEVELOPMENT_SERVER) {
        const url = new URL(await once(`DEV_${mount.path}`, () => startDevServer(mount)));
        const target = `${url.origin}${mountBase(mount)}`;

        rewrites = {
          beforeFiles: [
            { source: path, destination: target },
            { source: `${path}/:path*`, destination: `${target}:path*` },
          ],
        };
      } else if (phase === PHASE_PRODUCTION_BUILD) {
        await once(`BUILT_${mount.path}`, () => {
          assertOwnedOutDir(outDir);
          return runBuildWorker({ ...mount, config: { ...mount.config, outDir } });
        });

        rewrites = staticRewrites(path);
      } else if (phase === PHASE_PRODUCTION_SERVER) {
        if (!existsSync(join(outDir, "index.html"))) {
          console.warn(`[yaakdoc] No docs found in ${outDir}. Run \`next build\` first.`);
        }

        rewrites = staticRewrites(path);
      } else {
        return config;
      }

      // Static exports have no rewrites; static hosts serve `<path>/index.html` by themselves.
      if (config.output === "export") {
        return config;
      }

      return {
        ...config,
        rewrites: mergeRewrites(config.rewrites, rewrites),
      };
    };
}

/** Pages are `<path>/<page>/index.html` in `public/`; real files (assets, `.md`, ...) win. */
function staticRewrites(path: string): Partial<Rewrites> {
  return {
    afterFiles: [
      { source: path, destination: `${path}/index.html` },
      { source: `${path}/:path*`, destination: `${path}/:path*/index.html` },
    ],
  };
}

async function startDevServer(options: MountOptions) {
  const { url } = await startDevWorker(options);
  return url;
}

/** Runs `task` once across Next's processes, sharing its result through the environment. */
function once(key: string, task: () => Promise<string>): Promise<string> {
  const name = `YAAKDOC_NEXT_${key.replace(/\W/g, "_").toUpperCase()}`;

  const done = process.env[name];

  if (done !== undefined) {
    return Promise.resolve(done);
  }

  let promise = pending.get(name);

  if (!promise) {
    promise = task().then((result) => {
      process.env[name] = result;
      return result;
    });

    pending.set(name, promise);
  }

  return promise;
}

/** The build replaces the output folder, so refuse to touch one that isn't a yaakdoc build. */
function assertOwnedOutDir(outDir: string) {
  if (
    existsSync(outDir) &&
    readdirSync(outDir).length > 0 &&
    !existsSync(join(outDir, "_yaakdoc"))
  ) {
    throw new Error(
      `createNextYaakdoc: ${outDir} exists and isn't a yaakdoc build. Move its files or mount the docs at another path.`,
    );
  }
}

type RewritesConfig = NonNullable<NextConfig["rewrites"]>;

/** Adds the docs' rewrites to the app's own (an array or `{ beforeFiles, afterFiles, fallback }`). */
function mergeRewrites(existing: NextConfig["rewrites"], docs: Partial<Rewrites>): RewritesConfig {
  return async () => {
    const own = existing ? await existing() : [];

    const app = Array.isArray(own)
      ? { beforeFiles: [], afterFiles: own, fallback: [] }
      : { beforeFiles: [], afterFiles: [], fallback: [], ...own };

    return {
      beforeFiles: [...(docs.beforeFiles ?? []), ...app.beforeFiles],
      afterFiles: [...(docs.afterFiles ?? []), ...app.afterFiles],
      fallback: [...(docs.fallback ?? []), ...app.fallback],
    };
  };
}
