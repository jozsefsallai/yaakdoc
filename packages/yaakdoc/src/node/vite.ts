import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { escapeRegExp } from "@yaakdoc/core";
import { type InlineConfig, searchForWorkspaceRoot } from "vite";
import type { Context } from "./context";
import { nodeModulesRoot, yaakdocPlugin } from "./plugin";
import { ENGINE_DIR, resolvePackageDir } from "./resolve";

export type ViteMode = "development" | "production";

/** Base Vite config shared by the dev server and builds. */
export async function createViteConfig(
  getContext: () => Context,
  mode: ViteMode,
  extra: { onSsrUpdate?: () => void; logLevel?: InlineConfig["logLevel"] } = {},
): Promise<InlineConfig> {
  const context = getContext();
  const themePlugins = (await context.theme.definition.vitePlugins?.()) ?? [];

  // Don't create node_modules in a project that has none (e.g. `npx yaakdoc` next to an export).
  const cacheDir = existsSync(join(context.root, "node_modules"))
    ? join(context.root, "node_modules", ".vite-yaakdoc")
    : join(
        tmpdir(),
        "yaakdoc-vite",
        createHash("sha256").update(context.root).digest("hex").slice(0, 12),
      );

  return {
    configFile: false,
    envDir: false,
    root: context.root,
    base: context.config.base,
    mode,
    logLevel: extra.logLevel ?? "warn",
    clearScreen: false,
    publicDir: context.publicDir,
    cacheDir,
    plugins: [yaakdocPlugin(getContext, extra.onSsrUpdate), ...themePlugins],
    resolve: { alias: styleAliases(context) },
    oxc: {
      jsx: { runtime: "automatic", importSource: "react" },
    },
    ssr: {
      noExternal: ["@yaakdoc/react", /^@yaakdoc\/theme-/, /^yaakdoc-theme-/],
    },
    optimizeDeps: {
      // Dependencies are discovered while serving (see `optimized()` in plugin.ts).
      entries: [],
    },
    build: {
      rolldownOptions: {
        onLog(level, log, handler) {
          // Radix & co. ship "use client" directives, which are meaningless here.
          if (log.code === "MODULE_LEVEL_DIRECTIVE") return;
          handler(level, log);
        },
      },
    },
    server: {
      // When yaakdoc runs inside a host app, the project root is the app's; skip its build output.
      watch: { ignored: ["**/.next/**", "**/.svelte-kit/**", "**/.astro/**", "**/.output/**"] },
      fs: {
        allow: [
          searchForWorkspaceRoot(context.root),
          cacheDir,
          context.theme.root,
          nodeModulesRoot(ENGINE_DIR),
          ...context.theme.fallbackImporters.map(nodeModulesRoot),
        ],
      },
    },
  };
}

/**
 * Whether `name` is installed in a `node_modules` folder in `dir` or above. Stricter than
 * resolving it, which may fall back to the resolver's own location.
 */
function installedFrom(name: string, dir: string): boolean {
  for (let current = dir; ; current = dirname(current)) {
    if (existsSync(join(current, "node_modules", name, "package.json"))) {
      return true;
    }

    if (current === dirname(current)) {
      return false;
    }
  }
}

/**
 * CSS `@import "pkg"` is resolved by Vite's CSS resolver (aliases only, no plugins). For CSS packages
 * an ejected theme doesn't have installed (e.g. `tailwindcss`), alias them to yaakdoc's copy.
 */
function styleAliases(context: Context) {
  const aliases: Array<{ find: RegExp; replacement: string }> = [];
  const seen = new Set<string>();

  for (const fallback of context.theme.fallbackImporters) {
    let dependencies: string[] = [];

    try {
      dependencies = Object.keys(JSON.parse(readFileSync(fallback, "utf8")).dependencies ?? {});
    } catch {}

    for (const name of dependencies) {
      if (seen.has(name)) {
        continue;
      }

      seen.add(name);

      if (installedFrom(name, context.theme.root)) {
        continue;
      }

      // `resolvePackageDir`: some packages (e.g. Fontsource) don't export their package.json.

      const packageDir = resolvePackageDir(name, fallback);

      if (!packageDir) {
        continue;
      }

      const pkgJson = join(packageDir, "package.json");

      const pkg = JSON.parse(readFileSync(pkgJson, "utf8")) as {
        style?: string;
        exports?: Record<string, unknown>;
      };

      const root = pkg.exports?.["."];

      // Stylesheet packages: a `style` condition, a CSS default export (e.g. Fontsource), `style`.
      const conditions = typeof root === "object" && root ? (root as Record<string, unknown>) : {};
      const style =
        typeof conditions.style === "string"
          ? conditions.style
          : typeof conditions.default === "string" && conditions.default.endsWith(".css")
            ? conditions.default
            : pkg.style;

      if (typeof style === "string") {
        aliases.push({
          find: new RegExp(`^${escapeRegExp(name)}$`),
          replacement: join(dirname(pkgJson), style),
        });
      }
    }
  }

  return aliases;
}
