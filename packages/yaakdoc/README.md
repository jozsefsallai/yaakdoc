# yaakdoc

Static, themable, and LLM-friendly API documentation generated from [Yaak](https://yaak.app) exports.

```sh
npx yaakdoc          # dev server for the Yaak export in the current folder
npx yaakdoc build    # static site in dist/
```

See the [main README](https://github.com/jozsefsallai/yaakdoc#readme) for the CLI, configuration, theming and LLM features.

## Node API

```ts
import { build, createDevServer, eject, init, preview } from "yaakdoc";

const { outDir, files } = await build({ cwd: "docs", overrides: { pages: "per-request" } });

const server = await createDevServer({ cwd: "docs", port: 4000 });
console.log(server.url);

await server.close();
```

`yaakdoc` also re-exports `defineConfig`, `defineTheme` and `defineSnippet`.

`build`, `createDevServer` and `resolveContext` take `cwd`, `configFile` and `overrides` (config values that win over the config file). They also take `exportData`, the Yaak export as an object, to use instead of reading it from a file.

### Without Vite: `yaakdoc/static`

`yaakdoc/static` is the part of the engine that doesn't need Vite. It loads the config and export, prepares the document, and writes a site with a theme that's already built. Use it to bundle yaakdoc into an environment where Vite can't run, the way the [Yaak plugin](https://github.com/jozsefsallai/yaakdoc/tree/master/packages/yaak-plugin) does.

```ts
import {
  emptyOutDir,
  resolveContext,
  themeFromDefinition,
  withBase,
  writeSite,
} from "yaakdoc/static";

const context = await resolveContext({
  exportData,

  overrides: {
    outDir: "site",
  },

  // Supply the theme instead of loading it from a package or path.
  resolveTheme: (spec, { themeOptions }) => {
    return themeFromDefinition(myTheme, {
      manifest: "/themes/my-theme/theme.ts",
      themeOptions,
    });
  },
});

await emptyOutDir(context.config.outDir, context.root);

// ...copy the theme's prebuilt client assets into the output directory...
await writeSite(context, {
  render,
  assets: withBase(assets, context.config.base),
});
```

The theme's client assets and its `render` function come from `bundleTheme(context, outDir, { base: "./" })` in the main entry. It builds the theme with Vite once, and the `"./"` base makes the client assets work under any base path.
