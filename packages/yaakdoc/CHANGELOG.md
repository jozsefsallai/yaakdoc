# yaakdoc

## 0.4.0

### Minor Changes

- 6d74c70: Add custom Markdown pages, better navigation, and search.
  
  - `pagesDir` points to a directory of Markdown pages with front matter (`title`, `description`, `sidebarTitle`, `icon`, `order`, `hidden`). Pages can use `${[ variables ]}`, which follow the environment switcher (secrets stay placeholders). Relative links to other pages and relative images work.
  - `navigation` arranges pages with optional `tabs`, `groups` and `pages`. `{ "api": true }` (or `api: true` on a tab or group) places the folders and requests from Yaak. Without it, the navigation is generated from the directory.
  - When the pages include an `index.md`, the API reference moves to `/reference/`. `apiPath` sets another path. Sites without pages are unchanged.
  - `search` (on by default) publishes a search index of page, folder and request titles and descriptions. The default theme opens it with Cmd+K / Ctrl+K or `/`.
  - Pages get Markdown twins and are listed in `llms.txt` and `llms-full.txt`.
  - `@yaakdoc/core`: `createPageDoc`, `resolveNavigation`, `flattenNavigation`, `findNavigationTab` and `buildSearchIndex`. `PreparedDocument` gains `pages`, `navigation` and `referenceBase`.
  - `@yaakdoc/react`: `PageDoc`, `PageNav`, `Navigation`, `NavTabs`, `NavIcon` and `Search` components; `usePageDoc`, `useNavigation`, `useActiveTab` and `usePageNeighbors` hooks; `SearchTrigger` and `SearchDialog` islands with the headless `useSearch` and `useSearchDialog`. `PageKind` gains `"page"`, and `SiteData` gains `searchUrl`.
  - Kiseki: navigation tabs, groups with Lucide icons, page layout with previous/next links, and a Cmd+K search dialog that replaces the sidebar filter.

### Patch Changes

- 6d74c70: Fix text rendering in a fallback font and then switching fonts on page load.
  
  - Themes can declare `preloadFonts` (font files by role, `sans` or `mono`). yaakdoc preloads them in builds and in the dev server, except roles the user replaces with `branding.fonts`.
  - Kiseki loads Geist from its stylesheets (they used to be injected by the client script in dev), preloads the latin files and uses `font-display: optional`.
  - Ejected themes can import CSS packages that don't export their `package.json` (such as Fontsource) without installing them.
- Updated dependencies [6d74c70]
- Updated dependencies [6d74c70]
  - @yaakdoc/config@0.4.0
  - @yaakdoc/core@0.4.0
  - @yaakdoc/markdown@0.4.0
  - @yaakdoc/react@0.4.0
  - @yaakdoc/theme-kiseki@0.4.0
  - @yaakdoc/snippets@0.4.0

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
