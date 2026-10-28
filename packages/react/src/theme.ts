/**
 * Node-side theme manifest. This module must stay free of React/runtime imports: it is loaded by the
 * yaakdoc engine in Node to discover the theme's files and Vite plugins.
 */

/** Anything with a `parse` method (e.g. a Zod schema) can validate theme options. */
export type OptionsValidator = { parse(input: unknown): unknown };

export type ThemeDefinition = {
  /** Theme name, e.g. "kiseki". */
  name: string;
  /**
   * Server entry module (relative to the manifest file, or absolute). Its default export is a
   * `ThemeRuntime`: `{ Layout, components?, Head? }`. Processed by Vite, so TSX source is fine.
   */
  entry: string;
  /**
   * Client entry module that hydrates islands, e.g.
   * `hydrateIslands([...builtinIslands, MyIsland])`. Defaults to hydrating the built-in islands.
   */
  client?: string;
  /** CSS entry files (relative to the manifest), loaded in order. */
  styles?: string[];
  /**
   * Font files to preload, by the role they play, so text doesn't render in a fallback font first.
   * Use file names of fonts referenced by the theme's styles (e.g.
   * `geist-latin-wght-normal.woff2`; hashed build names match too). A role is skipped when the
   * user replaces its font with `branding.fonts.sans` / `branding.fonts.mono`.
   */
  preloadFonts?: { sans?: string[]; mono?: string[] };
  /** Vite plugins the theme needs (e.g. Tailwind). */
  // biome-ignore lint/suspicious/noExplicitAny: avoid depending on Vite types here
  vitePlugins?: () => any[] | Promise<any[]>;
  /** Shiki themes for syntax highlighting (default: github-light / github-dark). */
  highlight?: { light: string; dark: string };
  /** Validates/defaults `themeOptions` from the config. */
  options?: OptionsValidator;
  /** What `yaakdoc eject` copies (globs relative to the manifest directory). */
  eject?: {
    files?: string[];
    /** Packages the ejected theme imports; printed after ejecting. */
    dependencies?: string[];
  };
};

/** Defines a yaakdoc theme. */
export function defineTheme(definition: ThemeDefinition): ThemeDefinition {
  return definition;
}

export type { LayoutProps, ThemeComponents, ThemeRuntime } from "./types";
