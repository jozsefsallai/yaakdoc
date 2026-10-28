# next-demo

A Next.js app that serves the [demo](../demo) API docs at `/docs` with [`@yaakdoc/next`](../../packages/next). The docs are configured inline in [`yaakdoc.mjs`](yaakdoc.mjs), which [`next.config.mjs`](next.config.mjs) uses.

```sh
pnpm dev        # next dev; the docs reload when ../demo/yaak.json changes
pnpm build      # next build; prerenders the docs into public/docs
pnpm start      # next start
pnpm test:e2e   # Playwright end-to-end tests (builds and starts the app)
```
