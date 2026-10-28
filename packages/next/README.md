# @yaakdoc/next

Serve [yaakdoc](https://github.com/jozsefsallai/yaakdoc) API documentation from a Next.js app, e.g. at `/docs`.

```sh
npm i @yaakdoc/next
```

```ts
// next.config.ts
import type { NextConfig } from "next";
import { createNextYaakdoc } from "@yaakdoc/next";

const withYaakdoc = createNextYaakdoc({
  path: "/docs",
  export: "./yaak.json",
  config: {
    branding: { title: "Acme API" },
    pages: "per-request",
  },
});

const nextConfig: NextConfig = {};

export default withYaakdoc(nextConfig);
```

`createNextYaakdoc(options)` returns `withYaakdoc`. You can keep it in a file of its own and import it into `next.config.ts`:

```ts
// yaakdoc.ts
import { createNextYaakdoc } from "@yaakdoc/next";

export const withYaakdoc = createNextYaakdoc({
  export: "./api/yaak.json",
});
```

The docs are configured inline, so you don't need a `yaakdoc.config.*` file (if there is one, `config` is merged over it). The options are:

| Option | Description |
| --- | --- |
| `path` | Where the docs are served. Default: `/docs`. |
| `config` | yaakdoc [config](https://github.com/jozsefsallai/yaakdoc#configuration). Paths are relative to `cwd`. |
| `export` | Path of the Yaak export. By default, `yaakdoc.json`, then `yaak.json`, is looked up in `cwd`. |
| `cwd` | Project directory. Default: `process.cwd()`. |
| `configFile` | An explicit config file, or `false` to not look for one. |
| `publicDir` | A folder copied to the docs' root as-is. Default: none. |

`withYaakdoc(nextConfig)` accepts an object or a function (`(phase, context) => config`), like any Next.js config. Next's `basePath` is respected.

## How it works

- **`next dev`.** The yaakdoc dev server starts in a child process, and the docs are proxied to it with rewrites. Editing the export or the theme reloads the page.
- **`next build`.** The docs are prerendered into `public/<path>` and served as static files, so they're deployed with the app (Vercel or any other host). Add the folder to `.gitignore`:

  ```gitignore
  public/docs
  ```

  The build replaces that folder each time. It refuses to touch one that wasn't created by yaakdoc.

- **`next start`.** The docs are served from `public/<path>` through rewrites.
- **`output: "export"`.** The docs are part of the exported site, and no rewrites are added.

## Notes

- **Trailing slashes.** yaakdoc links to `/docs/page/`. With Next's default `trailingSlash: false`, these redirect to `/docs/page`, which then serves the page.
- **Not found pages.** An unknown page under `/docs` shows your app's 404 page.
- **Other frameworks.** For Vite-based apps and Node servers, see [`yaakdoc/vite` and `yaakdocMiddleware`](https://github.com/jozsefsallai/yaakdoc/tree/master/packages/yaakdoc#inside-an-existing-app).
