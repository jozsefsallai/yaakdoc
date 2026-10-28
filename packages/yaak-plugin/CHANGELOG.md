# @yaakdoc/yaakdoc

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
