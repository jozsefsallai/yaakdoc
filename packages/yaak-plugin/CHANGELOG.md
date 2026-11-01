# @yaakdoc/yaakdoc

## 0.6.1

### Patch Changes

- The plugin catches up with yaakdoc 0.6:
  
  - The build result lists warnings, such as an example response whose JSON doesn't parse, for Kiseki builds and for builds with the yaakdoc CLI. Before, they were only in the plugin's log.
  - The Branding section has a dark mode logo, the logo's height and a "Title next to the logo" option (`branding.logo.dark`, `height` and `showTitle`). A dark mode logo picked from outside a saved project is copied into it, like the other files.
  - The bundled engine has 0.6's changes: response headers in example responses, invalid status codes failing the build, and the logo options.

## 0.6.0

### Patch Changes

- Updated dependencies [0451495]
  - @yaakdoc/config@0.6.0

## 0.5.2

### Patch Changes

- cc8debd: The documentation moved to https://yaakdoc.dev. Package READMEs and homepages now link to it, and Kiseki declares its theme metadata (the `yaakdoc` field in `package.json`).
- Updated dependencies [cc8debd]
  - @yaakdoc/config@0.5.2

## 0.5.1

### Patch Changes

- @yaakdoc/config@0.5.1

## 0.5.0

### Minor Changes

- 9173b88: Yaak plugin: progress in one dialog, npm themes, and pages and search.
  
  - Each action keeps one dialog open from the export to the result. It shows the step that's running (with the end of a command's output) and the steps already done, and offers **Run in background** and **Cancel**. Choosing the action again while it runs brings the dialog back instead of starting a second run. The result, or an error with its log, is shown in the same dialog instead of a toast that disappears before the build is done.
  - Themes from npm are fetched when the build needs them. Unless the theme is installed next to the config file, the plugin finds its package (`winxp` → `@yaakdoc/theme-winxp`, then `yaakdoc-theme-winxp`) and installs it into a cache. It only fails when no such package exists. A package named just `winxp` is never fetched, because it might not be a theme; full package names (`yaakdoc-theme-winxp`, `@acme/docs-theme`) are fetched as written.
  - The form shows one section at a time, picked with a **Settings** select, instead of a long list of accordions. Values in the other sections are kept.
  - The form has a **Pages and search** section: the pages directory, the API reference path and search. A saved project gets a relative `pagesDir` when the pages are inside it.
  - `yaakdoc`: themes share yaakdoc's `@yaakdoc/react`, even when they come with an older copy of their own. Before, their hooks couldn't see yaakdoc's provider, and rendering failed. `yaakdoc/static` exports `themePackageCandidates`.

### Patch Changes

- @yaakdoc/config@0.5.0

## 0.4.0

### Patch Changes

- Updated dependencies [6d74c70]
  - @yaakdoc/config@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [b633382]
  - @yaakdoc/config@0.3.0

## 0.2.0

### Minor Changes

- 6fa7ba9: Add the yaakdoc plugin for Yaak (`@yaakdoc/yaakdoc`), which builds the docs or saves a yaakdoc project from a workspace. Kiseki builds run inside Yaak without Node.js.
  
  - Add `--overrides` to `yaakdoc dev` and `yaakdoc build`: a JSON file or inline JSON with config values that are merged over the config file.
  - Add `yaakdoc/static`, the Vite-free part of the engine (`resolveContext`, `writeSite`, `themeFromDefinition`, …), and `bundleTheme` for prebuilding a theme.
  - `resolveContext` and `build` take `exportData` (the export as an object) and `resolveTheme` (a theme loading hook).

### Patch Changes

- @yaakdoc/config@0.2.0
