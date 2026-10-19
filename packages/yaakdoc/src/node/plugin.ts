import { createRequire } from "node:module";
import { dirname, join, sep } from "node:path";
import type { DevEnvironment, Plugin, Rollup } from "vite";

type ResolvedId = Rollup.ResolvedId;

import type { Assets } from "@yaakdoc/react";
import type { Context, Route } from "./context";
import { ENGINE_ANCHOR } from "./resolve";

export const VIRTUAL_SERVER = "virtual:yaakdoc/entry-server";

/** What the SSR entry (`VIRTUAL_SERVER`) exports, in dev and in builds. */
export type RenderEntry = {
  render: (input: {
    document: Context["document"];
    site: Context["site"];
    page: Route["page"];
    assets: Assets;
  }) => Promise<string>;
};

export const VIRTUAL_CLIENT = "virtual:yaakdoc/entry-client";

const RESOLVED = (id: string) => `\0${id}`;

const isBare = (id: string) =>
  !id.startsWith(".") &&
  !id.startsWith("/") &&
  !id.startsWith("\0") &&
  !/^[a-z]+:/i.test(id) &&
  !id.startsWith("@/");

const json = (value: string) => JSON.stringify(value);

const REACT_RE = /^react(-dom)?(\/|$)/;
const CJS_PREFIX = "\0yaakdoc-cjs:";
const IDENTIFIER_RE = /^[A-Za-z_$][\w$]*$/;

/** ESM module re-exporting a CommonJS module required from yaakdoc's installation. */
function cjsWrapper(specifier: string): string {
  const mod = createRequire(ENGINE_ANCHOR)(specifier) as Record<string, unknown>;
  const names = Object.keys(mod).filter((name) => name !== "default" && IDENTIFIER_RE.test(name));

  return [
    `import { createRequire } from "node:module";`,
    `const mod = createRequire(${json(ENGINE_ANCHOR)})(${json(specifier)});`,
    "export default mod;",
    names.length > 0 ? `export const { ${names.join(", ")} } = mod;` : "",
  ].join("\n");
}

/**
 * The yaakdoc Vite plugin: virtual SSR/client entries, theme-scoped `@/` alias, and fallback
 * resolution of theme dependencies from the yaakdoc installation (so ejected themes and `npx` work
 * without installing anything in the project).
 */
export function yaakdocPlugin(getContext: () => Context, onSsrUpdate?: () => void): Plugin {
  return {
    name: "yaakdoc",
    enforce: "pre",

    async resolveId(source, importer, options) {
      if (source === VIRTUAL_SERVER || source === VIRTUAL_CLIENT) {
        return RESOLVED(source);
      }

      const { theme } = getContext();

      // shadcn-style `@/...` imports inside the theme resolve to the theme's `src/`.
      if (source.startsWith("@/") && importer?.startsWith(theme.root + sep)) {
        return this.resolve(join(theme.root, "src", source.slice(2)), importer, {
          ...options,
          skipSelf: true,
        });
      }

      if (!isBare(source)) {
        return null;
      }

      const server = this.environment.config.consumer === "server";

      const finish = (resolved: ResolvedId | null) => {
        if (!resolved) {
          return null;
        }

        if (server) {
          return REACT_RE.test(source) ? { ...resolved, external: true } : resolved;
        }

        return optimized(
          this.environment as DevEnvironment,
          resolved,
          (options as { scan?: boolean }).scan,
        );
      };

      // Pin React to yaakdoc's copy: one React instance, and it works without a local install.
      // The dev SSR runner can't evaluate CommonJS, so React is loaded through an ESM wrapper.
      if (REACT_RE.test(source) && server && this.environment.mode === "dev")
        return `${CJS_PREFIX}${source}`;
      if (REACT_RE.test(source)) {
        return finish(await this.resolve(source, ENGINE_ANCHOR, { ...options, skipSelf: true }));
      }

      const virtualImporter = !importer || importer.startsWith("\0");

      if (!virtualImporter) {
        const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });

        if (resolved) {
          return finish(resolved);
        }
      }

      for (const fallback of [
        ENGINE_ANCHOR,
        ...theme.fallbackImporters,
        join(theme.root, "package.json"),
      ]) {
        const resolved = await this.resolve(source, fallback, { ...options, skipSelf: true });
        if (resolved) {
          return finish(resolved);
        }
      }

      return null;
    },

    load(id) {
      if (id.startsWith(CJS_PREFIX)) {
        return cjsWrapper(id.slice(CJS_PREFIX.length));
      }

      const context = getContext();

      if (id === RESOLVED(VIRTUAL_SERVER)) {
        return [
          `import theme from ${json(context.theme.entry)};`,
          `import { renderPage } from "@yaakdoc/react/server";`,
          "export function render(input) {",
          "  return renderPage({ theme, ...input });",
          "}",
        ].join("\n");
      }

      if (id === RESOLVED(VIRTUAL_CLIENT)) {
        return [
          ...styleEntries(context).map((style) => `import ${json(style)};`),
          `import { hydrateIslands } from "@yaakdoc/react/client";`,
          context.theme.client
            ? `import islands from ${json(context.theme.client)};`
            : `import { builtinIslands as islands } from "@yaakdoc/react/islands";`,
          "hydrateIslands(islands);",
        ].join("\n");
      }

      return null;
    },

    hotUpdate({ modules, file }) {
      // Pages are rendered on the server: a change to a server-only module needs a full reload.
      if (this.environment.name !== "ssr" || modules.length === 0 || /\.css($|\?)/.test(file)) {
        return;
      }

      onSsrUpdate?.();
    },
  };
}

const NODE_MODULES_RE = /[\\/]node_modules[\\/]/;
const JS_RE = /\.(m?js|cjs)$/;

/**
 * Dev only: maps a dependency in node_modules to its pre-bundled version.
 *
 * Vite skips dependency discovery for imports coming from inside node_modules – which is where
 * yaakdoc and its theme live when run with `npx`. Such dependencies are registered here by absolute
 * path (reusing an existing entry for the same file), so they are served pre-bundled as ESM.
 */
function optimized(
  environment: DevEnvironment,
  resolved: ResolvedId,
  scan?: boolean,
): ResolvedId | string {
  const optimizer = environment.mode === "dev" ? environment.depsOptimizer : undefined;
  if (!optimizer || scan || resolved.external) {
    return resolved;
  }

  const file = resolved.id.split("?")[0]!;
  if (!NODE_MODULES_RE.test(file) || !JS_RE.test(file) || optimizer.isOptimizedDepFile(file)) {
    return resolved;
  }

  const { optimized: done, discovered } = optimizer.metadata;

  const info =
    done[file] ??
    discovered[file] ??
    [...Object.values(done), ...Object.values(discovered)].find((dep) => dep.src === file) ??
    optimizer.registerMissingImport(file, file);

  return optimizer.getOptimizedDepId(info);
}

/** CSS entries loaded on every page: the theme's styles, then `branding.customCss`. */
export function styleEntries(context: Context): string[] {
  const { customCss } = context.config.branding;
  return [...context.theme.styles, ...(customCss ? [customCss] : [])];
}

export const nodeModulesRoot = (file: string) => {
  const index = file.lastIndexOf(`${sep}node_modules${sep}`);
  return index === -1 ? dirname(file) : file.slice(0, index + `${sep}node_modules`.length);
};
