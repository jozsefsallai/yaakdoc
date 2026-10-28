# yaakdoc

## 0.3.0

### Minor Changes

- b633382: Serve the docs from an existing app at a path such as `/docs`:
  
  - `@yaakdoc/next`: `createNextYaakdoc(options)` returns `withYaakdoc(nextConfig)` for Next.js. `next dev` proxies to a live yaakdoc dev server; `next build` prerenders the docs into `public/<path>`.
  - `yaakdoc/vite`: a Vite plugin for Vite-based apps.
  - `yaakdocMiddleware`: Connect/Express-style middleware for Node servers.
  
  Every integration takes the mount `path`, inline `config` and the `export` location, so no `yaakdoc.config.*` is needed. The engine gains `configFile: false`, a `publicDir` option, `createDevMiddleware` and `createStaticMiddleware`, and the dev server now works with a non-root `base`.

### Patch Changes

- Updated dependencies [b633382]
  - @yaakdoc/config@0.3.0
  - @yaakdoc/core@0.3.0
  - @yaakdoc/react@0.3.0
  - @yaakdoc/markdown@0.3.0
  - @yaakdoc/snippets@0.3.0
  - @yaakdoc/theme-kiseki@0.3.0

## 0.2.0

### Minor Changes

- 6fa7ba9: Add the yaakdoc plugin for Yaak (`@yaakdoc/yaakdoc`), which builds the docs or saves a yaakdoc project from a workspace. Kiseki builds run inside Yaak without Node.js.
  
  - Add `--overrides` to `yaakdoc dev` and `yaakdoc build`: a JSON file or inline JSON with config values that are merged over the config file.
  - Add `yaakdoc/static`, the Vite-free part of the engine (`resolveContext`, `writeSite`, `themeFromDefinition`, …), and `bundleTheme` for prebuilding a theme.
  - `resolveContext` and `build` take `exportData` (the export as an object) and `resolveTheme` (a theme loading hook).

### Patch Changes

- @yaakdoc/config@0.2.0
  - @yaakdoc/core@0.2.0
  - @yaakdoc/markdown@0.2.0
  - @yaakdoc/react@0.2.0
  - @yaakdoc/snippets@0.2.0
  - @yaakdoc/theme-kiseki@0.2.0
