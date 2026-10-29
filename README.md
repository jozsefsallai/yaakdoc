![yaakdoc](.github/assets/yaakdoc-banner.png)

# yaakdoc

Static, themable, and LLM-friendly API documentation generated from [Yaak](https://yaak.app) exports.

**[Documentation](https://yaakdoc.dev/docs)** · **[Live demo](https://demo.yaakdoc.dev)** · **[Website](https://yaakdoc.dev)**

```sh
npx yaakdoc
```

Run it next to a Yaak export (`yaak.json`) and your docs are served at `http://localhost:4000`. `npx yaakdoc build` writes a static site to `dist/` that you can host anywhere. See the [quickstart](https://yaakdoc.dev/docs/quickstart).

- **Rendered on the server.** Every page is prerendered HTML. The docs are readable without JavaScript, and only small interactive "islands" (tabs, copy buttons, the color mode toggle) hydrate on the client.
- **Zero config.** The export is auto-detected, and the workspace name, description and environment come from Yaak. Add an optional [`yaakdoc.config.json`](https://yaakdoc.dev/docs/reference/configuration) for branding and options.
- **Themable.** Unstyled React components (`@yaakdoc/react`), a component override system and a free layout. The default theme, [Kiseki](https://yaakdoc.dev/docs/theming/kiseki), uses Tailwind CSS v4 and shadcn/ui, with light and dark mode and syntax highlighting.
- **Ejectable.** `yaakdoc eject` copies the theme into your project, where you can change anything.
- **LLM friendly.** It generates `llms.txt`, `llms-full.txt` and a Markdown version of every page. Kiseki adds "Copy page", "View as Markdown" and "Open in ChatGPT/Claude" actions.
- **Code examples.** Each request gets examples in cURL, JavaScript, Python, Go, grpcurl and wscat. The generators are pluggable.

## Getting started

- **[Yaak plugin](https://yaakdoc.dev/docs/yaak-plugin):** install `@yaakdoc/yaakdoc` from Yaak's plugin registry and build the docs without leaving Yaak.
- **[CLI](https://yaakdoc.dev/docs/quickstart):** `npx yaakdoc` next to an export, or `npm i -D yaakdoc` in a project.
- **Inside an existing app:** serve the docs at `/docs` of a [Next.js](https://yaakdoc.dev/docs/integrations/nextjs), [Vite-based](https://yaakdoc.dev/docs/integrations/vite) or [Node](https://yaakdoc.dev/docs/integrations/node-middleware) app.

Everything else (configuration, custom pages, navigation, environments, theming and the APIs) is in the [documentation](https://yaakdoc.dev/docs).

## Packages

| Package | Description |
| --- | --- |
| [`yaakdoc`](packages/yaakdoc) | CLI, Node API, the Vite-based engine, the `yaakdoc/vite` plugin and `yaakdocMiddleware`. |
| [`@yaakdoc/core`](packages/core) | Parses Yaak exports (all schema versions), normalizes them into a documentation model, resolves templates and variables. |
| [`@yaakdoc/config`](packages/config) | The config schema (Zod), `defineConfig`, loader and JSON schema. |
| [`@yaakdoc/snippets`](packages/snippets) | Code example generators and `defineSnippet`. |
| [`@yaakdoc/markdown`](packages/markdown) | Markdown rendering of requests and folders, `llms.txt` and `llms-full.txt`. |
| [`@yaakdoc/react`](packages/react) | Unstyled components, hooks, component overrides, the island runtime and the theme contract. |
| [`@yaakdoc/theme-kiseki`](packages/theme-kiseki) | The default theme. |
| [`@yaakdoc/next`](packages/next) | Serves the docs from a Next.js app (`createNextYaakdoc`). |
| [`@yaakdoc/yaakdoc`](packages/yaak-plugin) | The Yaak plugin (published to Yaak's plugin registry, not npm). |

## Development

```sh
pnpm install
pnpm build            # turbo: builds all packages
pnpm test             # vitest in every package
pnpm check-types
pnpm lint             # biome
pnpm --filter demo dev        # run the demo docs (apps/demo)
pnpm --filter demo test:e2e   # Playwright end-to-end tests
pnpm --filter next-demo dev   # the demo docs inside a Next.js app (apps/next-demo)
pnpm --filter website dev     # the website and documentation (apps/website)
```

The documentation lives in [`apps/website/content/docs`](apps/website/content/docs). See [Contributing](https://yaakdoc.dev/docs/contributing) for how the project is put together.

Releases are managed with [Changesets](https://github.com/changesets/changesets): run `pnpm changeset`, then `pnpm version-packages` and `pnpm release`.

## License

[MIT](LICENSE) © József Sallai

yaakdoc is an independent project. It isn't affiliated with, endorsed by or sponsored by [Yaak](https://yaak.app) or Mountain Loop.
