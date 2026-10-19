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
