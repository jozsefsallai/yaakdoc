# yaakdoc

Static, themable, and LLM-friendly API documentation generated from [Yaak](https://yaak.app) exports.

```sh
npx yaakdoc          # dev server for the Yaak export in the current folder
npx yaakdoc build    # static site in dist/
```

**[Documentation](https://yaakdoc.dev/docs)** · **[Quickstart](https://yaakdoc.dev/docs/quickstart)** · **[Live demo](https://demo.yaakdoc.dev)**

This package contains:

- the **CLI** (`dev`, `build`, `preview`, `init`, `eject`): see the [CLI reference](https://yaakdoc.dev/docs/reference/cli);
- the **Node API** (`build`, `createDevServer`, `preview`, `eject`, `init`) and `yaakdoc/static`: see the [Node API](https://yaakdoc.dev/docs/reference/node-api);
- the integrations that serve the docs from an existing app: the [`yaakdoc/vite` plugin](https://yaakdoc.dev/docs/integrations/vite) and [`yaakdocMiddleware`](https://yaakdoc.dev/docs/integrations/node-middleware). For Next.js, use [`@yaakdoc/next`](https://yaakdoc.dev/docs/integrations/nextjs).

```ts
// vite.config.ts
import { defineConfig } from "vite";
import yaakdoc from "yaakdoc/vite";

export default defineConfig({
  plugins: [yaakdoc({ path: "/docs", export: "./yaak.json" })],
});
```

The config's JSON schema is published as `yaakdoc/config.schema.json`. See the [configuration reference](https://yaakdoc.dev/docs/reference/configuration).
