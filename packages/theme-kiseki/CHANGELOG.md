# @yaakdoc/theme-kiseki

## 0.6.0

### Minor Changes

- 0451495: Fixes from adding yaakdoc to an existing Next.js app:
  
  - **Next.js dev keeps working when the docs don't.** A missing export, an unknown environment or an invalid config no longer stops `next dev` from starting. The error is logged and shown at the docs' path, and the docs load as soon as the file is fixed. The same goes for errors after a reload in any dev server: the page shows the error instead of the old docs. `next build` still fails.
  - **Clearer errors.** A missing export shows its full path, and errors about `export`, `workspace`, `environment` and `environments` say where the value was set (an option or the config file).
  - **The host app's PostCSS config is ignored.** Vite no longer picks up a `postcss.config.*` from the project or a parent folder (e.g. Next.js's `["@tailwindcss/postcss"]`, which it can't load). A theme can still have its own, in its folder.
  - **Response headers.** Example responses can start with `Name: value` lines and a blank line, like a raw HTTP response. Themes show them above the body (`ResponseHeaders`), and the Markdown output includes them.
  - **Example responses are checked.** A status that isn't an HTTP status code (100–599), such as `response:2001`, fails `yaakdoc build` and warns in dev. A body that looks like JSON but doesn't parse warns.
  - **Logo.** `branding.logo.showTitle: false` hides the title next to the logo, and Kiseki shows the logo at `branding.logo.height` (at most 40 px).
  - **Fewer dependencies.** Kiseki depends on the three Radix packages it uses instead of the `radix-ui` umbrella package.
  - **Dev servers listen on 127.0.0.1 by default**, instead of `localhost`, which Node can resolve to the IPv6 loopback only. Browsers that can't reach it, such as Windows with WSL's mirrored networking, timed out.
  - **One version.** `@yaakdoc/next` depends on the exact same `yaakdoc` version and includes its `yaakdoc` CLI.

### Patch Changes

- Updated dependencies [0451495]
  - @yaakdoc/react@0.6.0

## 0.5.2

### Patch Changes

- cc8debd: The documentation moved to https://yaakdoc.dev. Package READMEs and homepages now link to it, and Kiseki declares its theme metadata (the `yaakdoc` field in `package.json`).
- Updated dependencies [cc8debd]
  - @yaakdoc/react@0.5.2

## 0.5.1

### Patch Changes

- @yaakdoc/react@0.5.1

## 0.5.0

### Patch Changes

- @yaakdoc/react@0.5.0

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
  - @yaakdoc/react@0.4.0

## 0.3.0

### Patch Changes

- @yaakdoc/react@0.3.0

## 0.2.0

### Patch Changes

- @yaakdoc/react@0.2.0
