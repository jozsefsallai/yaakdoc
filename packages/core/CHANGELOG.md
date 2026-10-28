# @yaakdoc/core

## 0.3.0

### Minor Changes

- b633382: Serve the docs from an existing app at a path such as `/docs`:
  
  - `@yaakdoc/next`: `createNextYaakdoc(options)` returns `withYaakdoc(nextConfig)` for Next.js. `next dev` proxies to a live yaakdoc dev server; `next build` prerenders the docs into `public/<path>`.
  - `yaakdoc/vite`: a Vite plugin for Vite-based apps.
  - `yaakdocMiddleware`: Connect/Express-style middleware for Node servers.
  
  Every integration takes the mount `path`, inline `config` and the `export` location, so no `yaakdoc.config.*` is needed. The engine gains `configFile: false`, a `publicDir` option, `createDevMiddleware` and `createStaticMiddleware`, and the dev server now works with a non-root `base`.

## 0.2.0

No changes in this release.
