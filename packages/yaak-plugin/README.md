# yaakdoc for Yaak

Build static, themable, LLM-friendly API documentation from your [Yaak](https://yaak.app) workspace with [yaakdoc](https://github.com/jozsefsallai/yaakdoc), without leaving Yaak.

## Install

In Yaak, open **Settings → Plugins**, search for `@yaakdoc/yaakdoc` and install it.

There's nothing else to install for [Kiseki](https://github.com/jozsefsallai/yaakdoc/tree/master/packages/theme-kiseki), the default theme: yaakdoc and a precompiled Kiseki are built into the plugin and run in Yaak itself.

Other themes (npm packages, local paths, ejected themes) need [Node.js](https://nodejs.org) ≥ 20.19 with npm. The plugin builds them with the yaakdoc CLI through `npx`. Without Node.js, it says so and offers to build with Kiseki instead.

You don't have to install npm themes yourself. When a theme isn't installed next to the chosen config file, the plugin looks it up on npm (`winxp` → `@yaakdoc/theme-winxp`, then `yaakdoc-theme-winxp`) and installs it into a cache in your temp folder, which later builds reuse. The build only fails when no such package exists. A full package name (`yaakdoc-theme-winxp`, `@acme/docs-theme`) is fetched as written. A package named just `winxp` is never fetched, because it might not be a theme; to use one, install it next to your config file.

Installing the [Yaak CLI](https://github.com/mountain-loop/yaak) is recommended too. The plugin uses it to export the workspace, because Yaak's plugin API can't see environments or gRPC/WebSocket requests. Without it, the plugin falls back to the plugin API and warns you that those parts are missing.

## Actions

Both actions are in the workspace menu. Each one runs in a single dialog, from the export to the result. While a step runs, the dialog shows it (with the end of a command's output) and the steps already done. **Run in background** hides the dialog, and the result then comes as a toast. To bring the dialog back, choose the same action again: while it runs for a workspace, it shows its progress instead of starting over. **Cancel** stops the export, the theme install or a CLI build. The built-in Kiseki build can't be stopped halfway, so it finishes and the dialog says so.

- **Build docs with yaakdoc...** exports the workspace, shows a form with the yaakdoc options, and builds the static site into the output directory you choose. You can also pick an existing `yaakdoc.config.*` file to build on.
- **Save as yaakdoc project...** writes `yaakdoc.json` (the export) and `yaakdoc.config.json` into a folder. From there you can commit it, run `npx yaakdoc` to preview it, or build it in CI. An existing `yaakdoc.config.json` gets the form's values merged into it, unless you choose to replace it. A logo, favicon or custom CSS picked from outside the folder is copied into its `assets/` folder, so the project still works after you commit or move it. A pages directory inside the folder is saved as a relative path; one outside it stays absolute, so keep your pages in the project folder.

The form is remembered per workspace. Its **Settings** select switches between sections (Yaak's plugin forms have no tabs), and values in the other sections are kept. Together they cover the whole [configuration](https://github.com/jozsefsallai/yaakdoc#configuration):

- General: theme (Kiseki or another theme), request pages, base path, environment, environment switcher
- Pages and search: the [pages directory](https://github.com/jozsefsallai/yaakdoc#custom-pages), the API reference path, search
- Branding: title, description, URL, logo, favicon, colors, fonts, header links, footer, color mode, custom CSS
- Code example snippets
- LLM outputs
- Variables: inlining, the variables table, hidden name patterns
- Slug filters
- Run in Yaak

Anything else goes in the **Extra config (JSON)** field, including `navigation` and a URL for the logo, favicon or custom CSS (the pickers only take local files).

With Kiseki, custom CSS is published as it is and linked after the theme's styles. The CLI bundles it with the theme instead, so with Kiseki, `@import`s of npm packages and `url()`s relative to the CSS file aren't resolved. Plain CSS works the same either way.

**Empty fields and "Default" don't override anything.** The value then comes from the chosen config file or from yaakdoc's default. For themes other than Kiseki, the form's values are passed to the yaakdoc CLI with [`--overrides`](https://github.com/jozsefsallai/yaakdoc#cli).

Under **Advanced** you can change the commands the plugin runs. The yaakdoc command is only used for themes other than Kiseki. It defaults to `npx -y yaakdoc@<plugin version>`; you can point it at a global or project-local install instead. The Yaak CLI command defaults to `yaak`, then `npx -y @yaakapp/cli`.

Private environments and secrets get the same treatment as with the yaakdoc CLI: they never appear in the generated docs.

## Development

```sh
pnpm --filter @yaakdoc/yaakdoc build   # prebuild + yaak plugin build → build/
pnpm --filter @yaakdoc/yaakdoc dev     # rebuild the plugin on change (run build first)
```

The build has two steps:

1. `scripts/prebuild.mjs` precompiles Kiseki with Vite (`bundleTheme` from yaakdoc). It then bundles `src/engine.ts`, which is [`yaakdoc/static`](https://github.com/jozsefsallai/yaakdoc/tree/master/packages/yaakdoc#without-vite-yaakdocstatic) plus the precompiled theme, into `generated/engine.cjs`.
2. `yaak plugin build` bundles the plugin itself. `yaak.buildAssets` in `package.json` ships the engine next to it, and the engine is only loaded when an action runs.

`yaak plugin dev` only rebuilds the plugin, so run the prebuild again after changing the engine, yaakdoc or Kiseki.

Install the plugin from this directory in Yaak's plugin settings. To build other themes against a local yaakdoc, set the yaakdoc command to `node /path/to/yaakdoc/packages/yaakdoc/bin/yaakdoc.js`. To publish to Yaak's registry, run `pnpm --filter @yaakdoc/yaakdoc publish:yaak` after `yaak auth login`.

## License

MIT
