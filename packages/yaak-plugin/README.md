# yaakdoc for Yaak

Build static, themable, LLM-friendly API documentation from your [Yaak](https://yaak.app) workspace with [yaakdoc](https://yaakdoc.dev), without leaving Yaak.

## Install

In Yaak, open **Settings → Plugins**, search for `@yaakdoc/yaakdoc` and install it.

- There's nothing else to install for [Kiseki](https://yaakdoc.dev/docs/theming/kiseki), the default theme: yaakdoc and a precompiled Kiseki are built into the plugin and run in Yaak itself.
- Other themes need [Node.js](https://nodejs.org) ≥ 20.19 with npm. The plugin builds them with the yaakdoc CLI through `npx`, and installs npm themes for you.
- Installing the [Yaak CLI](https://github.com/mountain-loop/yaak) is recommended too, so environments and gRPC/WebSocket requests are included in the docs.

## Actions

Both actions are in the workspace menu:

- **Build docs with yaakdoc...** exports the workspace, shows a form with the yaakdoc options, and builds the static site into the output directory you choose.
- **Save as yaakdoc project...** writes `yaakdoc.json` (the export) and `yaakdoc.config.json` into a folder, ready to commit, preview with `npx yaakdoc` or build in CI.

See the [plugin docs](https://yaakdoc.dev/docs/yaak-plugin) for the form, themes from npm, progress and cancelling, and the advanced settings.

## Development

```sh
pnpm --filter @yaakdoc/yaakdoc build   # prebuild + yaak plugin build → build/
pnpm --filter @yaakdoc/yaakdoc dev     # rebuild the plugin on change (run build first)
```

The build has two steps:

1. `scripts/prebuild.mjs` precompiles Kiseki with Vite (`bundleTheme` from yaakdoc). It then bundles `src/engine.ts`, which is [`yaakdoc/static`](https://yaakdoc.dev/docs/reference/node-api#without-vite-yaakdocstatic) plus the precompiled theme, into `generated/engine.cjs`.
2. `yaak plugin build` bundles the plugin itself. `yaak.buildAssets` in `package.json` ships the engine next to it, and the engine is only loaded when an action runs.

`yaak plugin dev` only rebuilds the plugin, so run the prebuild again after changing the engine, yaakdoc or Kiseki.

Install the plugin from this directory in Yaak's plugin settings. To build other themes against a local yaakdoc, set the yaakdoc command to `node /path/to/yaakdoc/packages/yaakdoc/bin/yaakdoc.js`. To publish to Yaak's registry, run `pnpm --filter @yaakdoc/yaakdoc publish:yaak` after `yaak auth login`.

## License

MIT

yaakdoc is an independent project. It isn't affiliated with, endorsed by or sponsored by [Yaak](https://yaak.app) or Mountain Loop.
