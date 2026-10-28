# yaakdoc

Static, themable, and LLM-friendly API documentation generated from [Yaak](https://yaak.app) exports.

```sh
npx yaakdoc          # dev server for the Yaak export in the current folder
npx yaakdoc build    # static site in dist/
```

See the [main README](https://github.com/jozsefsallai/yaakdoc#readme) for the CLI, configuration, theming and LLM features.

## Inside an existing app

The docs can be mounted at a path (`/docs` by default) of an app you already have. For Next.js, use [`@yaakdoc/next`](https://github.com/jozsefsallai/yaakdoc/tree/master/packages/next). Every integration takes the same options:

| Option | Description |
| --- | --- |
| `path` | Where the docs are served. Default: `/docs`. It takes precedence over `config.base`. |
| `config` | yaakdoc [config](https://github.com/jozsefsallai/yaakdoc#configuration), merged over `yaakdoc.config.*` if there is one. Paths are relative to `cwd`. |
| `export` | Path of the Yaak export. Shorthand for `config.export`. By default, `yaakdoc.json`, then `yaak.json`, is looked up in `cwd`. |
| `cwd` | Project directory. Default: `process.cwd()` (the Vite root for the Vite plugin). |
| `configFile` | An explicit config file, or `false` to not look for one. |
| `publicDir` | A folder copied to the docs' root as-is. Default: none, because the app's `public/` folder isn't meant for the docs. |

### Vite plugin: `yaakdoc/vite`

For apps built with Vite (plain Vite, React Router, SvelteKit, Astro, ...):

```ts
// vite.config.ts
import { defineConfig } from "vite";
import yaakdoc from "yaakdoc/vite";

export default defineConfig({
  plugins: [
    yaakdoc({
      path: "/docs",
      export: "./api/yaak.json",
      config: { branding: { title: "Acme API" } },
    }),
  ],
});
```

- **Dev.** `vite dev` serves the live docs: server-rendered, with HMR and a reload when the export changes.
- **Build.** `vite build` prerenders the docs and adds them to the app's client output (e.g. `dist/docs/`), so they're deployed with the app.

yaakdoc runs its own Vite instance, so your app's Vite config and plugins don't affect the docs.

### Node middleware: `yaakdocMiddleware`

For Express, Connect, Fastify (with `@fastify/middie`), Nitro and other servers that take Connect-style middleware:

```ts
import express from "express";
import { yaakdocMiddleware } from "yaakdoc";

const app = express();

app.use(await yaakdocMiddleware({ path: "/docs", export: "./yaak.json" }));
```

- **Development.** Unless `NODE_ENV` is `production` (or you pass `dev: false`), it serves the live dev server. HMR uses its own WebSocket port; pass `hmr: { server }` to share your HTTP server instead.
- **Production.** It serves a built site from `config.outDir`. Build it ahead of time with `yaakdoc build --base /docs/`, or pass `build: true` to build when the middleware is created.
- **Other requests.** Anything outside `path` is passed on with `next()`. `app.use("/docs", ...)` works too.

The middleware has a `close()` method that stops the dev server.

## Node API

```ts
import { build, createDevServer, eject, init, preview } from "yaakdoc";

const { outDir, files } = await build({ cwd: "docs", overrides: { pages: "per-request" } });

const server = await createDevServer({ cwd: "docs", port: 4000 });
console.log(server.url);

await server.close();
```

`yaakdoc` also re-exports `defineConfig`, `defineTheme` and `defineSnippet`.

`build`, `createDevServer` and `resolveContext` take `cwd`, `configFile` (`false` to not load one) and `overrides` (config values that win over the config file). They also take `exportData`, the Yaak export as an object, to use instead of reading it from a file, and `publicDir`, the folder copied to the site root (default: `public/` in the project, `false` for none).

The lower-level building blocks behind the integrations are exported too:

- `createDevMiddleware(options)`: the dev server as a middleware (`{ middleware, vite, getContext, close }`).
- `createStaticMiddleware({ outDir, base })`: serves a built site.
- `mountOptions(options)`: turns integration options into engine options.

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
