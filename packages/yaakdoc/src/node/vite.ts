import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { escapeRegExp } from "@yaakdoc/core";
import { type InlineConfig, searchForWorkspaceRoot } from "vite";
import type { Context } from "./context";
import { nodeModulesRoot, yaakdocPlugin } from "./plugin";
import { ENGINE_DIR, resolveFrom } from "./resolve";

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
 * CSS `@import "pkg"` is resolved by Vite's CSS resolver (aliases only, no plugins). For CSS packages
 * an ejected theme doesn't have installed (e.g. `tailwindcss`), alias them to yaakdoc's copy.
 */
function styleAliases(context: Context) {
  const themeAnchor = join(context.theme.root, "package.json");
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

      if (resolveFrom(`${name}/package.json`, themeAnchor)) {
        continue;
      }

      const pkgJson = resolveFrom(`${name}/package.json`, fallback);

      if (!pkgJson) {
        continue;
      }

      const pkg = JSON.parse(readFileSync(pkgJson, "utf8")) as {
        style?: string;
        exports?: Record<string, unknown>;
      };

      const root = pkg.exports?.["."];

      const style =
        typeof root === "object" && root && "style" in root
          ? (root as { style: string }).style
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
