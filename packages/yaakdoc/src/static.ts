/**
 * The part of the engine that runs without Vite: loading the config and export, preparing the
 * document and writing a site with a theme that's already built. The Yaak plugin bundles this entry
 * together with a precompiled Kiseki.
 */
export {
  type Context,
  matchRoute,
  publicAsset,
  type Route,
  resolveContext,
  type YaakdocOptions,
} from "./node/context";
export {
  assertSafeOutDir,
  emptyOutDir,
  type RenderEntry,
  withBase,
  writeSite,
} from "./node/site";
export { type ResolvedTheme, ThemeError, themeFromDefinition } from "./node/theme";
export { VERSION } from "./node/version";
