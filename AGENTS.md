# AGENTS.md

Guidance for AI coding agents working in this repository. For the user-facing documentation, see [README.md](README.md).

## What this is

yaakdoc generates static, themable, LLM-friendly API documentation sites from [Yaak](https://yaak.app) exports. It's a pnpm + Turborepo monorepo of small npm packages:

| Path | Package | Role |
| --- | --- | --- |
| `packages/core` | `@yaakdoc/core` | Parses and normalizes Yaak exports and resolves templates and variables. `prepareDocument()` builds the `PreparedDocument` that themes render. Also holds the shared helpers (`util.ts`, `tree.ts`). No React, no Vite. |
| `packages/config` | `@yaakdoc/config` | The Zod config schema (the single source of truth for config types), `defineConfig` and the c12-based loader (`./node`). |
| `packages/snippets` | `@yaakdoc/snippets` | Code example generators and `defineSnippet`. |
| `packages/markdown` | `@yaakdoc/markdown` | Markdown versions of pages, `llms.txt` and `llms-full.txt`. |
| `packages/react` | `@yaakdoc/react` | Unstyled components, hooks, the override system, the island runtime and the theme contract (`./theme` is Node-safe). |
| `packages/theme-kiseki` | `@yaakdoc/theme-kiseki` | The default theme (Tailwind CSS v4 + shadcn/ui). Ships TSX **source**; there's no build step. |
| `packages/yaakdoc` | `yaakdoc` | CLI (citty), Node API and the Vite-based engine (dev server, SSR, static build, eject, init). Also the integrations that mount the docs in other apps: `yaakdocMiddleware`, the `yaakdoc/vite` plugin and `yaakdoc/integration` (the worker launcher used by `@yaakdoc/next`). |
| `packages/next` | `@yaakdoc/next` | `createNextYaakdoc(options)` returns `withYaakdoc(nextConfig)`, which serves the docs from a Next.js app. Never loads the engine in-process; it uses `yaakdoc/integration`'s worker. Built as ESM and CJS. |
| `packages/yaak-plugin` | `@yaakdoc/yaakdoc` | The Yaak plugin (private; published to Yaak's registry with `yaak plugin publish`). Workspace actions that export the workspace and build it with a bundled engine (`yaakdoc/static` and a precompiled Kiseki), or with the yaakdoc CLI for other themes. |
| `packages/tsconfig` | `@repo/tsconfig` | Shared tsconfigs (private). |
| `apps/demo` | `demo` | Demo docs (`yaak.json`, `yaakdoc.config.json`) and the Playwright e2e tests. |
| `apps/next-demo` | `next-demo` | A Next.js app serving the demo docs at `/docs` with `@yaakdoc/next`, and its Playwright e2e tests. |
| `apps/website` | `website` | The website (https://yaakdoc.dev): the landing page and the documentation. Next.js + Fumadocs; MDX pages in `content/docs`. |

Package dependencies: config, snippets and markdown depend on core; react depends on core and config; theme-kiseki depends on react; yaakdoc depends on all of them; next depends on yaakdoc; the Yaak plugin bundles config and, through its prebuild, yaakdoc/static and Kiseki. Keep `@yaakdoc/core` free of the other packages, and don't add dependency cycles.

## Commands

Use **pnpm** (the version is pinned by `packageManager` in `package.json`). Node ≥ 20.19.

```sh
pnpm install
pnpm build          # turbo: tsdown in every package + the demo site
pnpm test           # vitest in every package
pnpm check-types    # tsc (TypeScript 7) in every package
pnpm lint           # biome check .
pnpm format         # biome check --write .
pnpm dev            # watchers + the demo dev server (http://localhost:4000)

pnpm --filter demo test:e2e     # Playwright (builds and previews the demo)
pnpm --filter @yaakdoc/core test  # a single package
```

Before you finish a change, run `pnpm build && pnpm check-types && pnpm test && pnpm lint`. Run the e2e tests too if you touched the React package, Kiseki or the engine. Tests in one package import the **built** `dist/` of the packages it depends on, so rebuild those first (turbo does this for you).

## How it works

1. **Load:** the config (optional) and the export (`yaakdoc.json`, then `yaak.json`, or an explicit path; there is no scanning) are loaded, along with the theme.
2. **Normalize:** `normalize()` turns the raw export (any Yaak schema version) into a `YaakDocument`.
3. **Prepare:** `prepareDocument()` adds links, display values (with secrets redacted), the rendered Markdown and Shiki HTML, code examples, one set of environment variants per selectable environment, and the example responses (from ` ```response:<status> ` blocks in descriptions).
4. **Render:** the theme renders the prepared document on the server through the virtual SSR entry. Interactive parts are **islands**, which are hydrated individually on the client.
5. **Write out:** in dev, Vite serves the pages in middleware mode. `build` builds the client and SSR bundles, prerenders every route with `react-dom/static`, and writes the `.md` files, `llms.txt`, the sanitized `yaak.json` (for Run in Yaak) and the sitemap.

Key files:

- **Pipeline:** `packages/core/src/prepare.ts` and `packages/yaakdoc/src/node/context.ts`.
- **Vite integration:** `packages/yaakdoc/src/node/plugin.ts` (virtual entries and dependency resolution) and `vite.ts`.
- **Islands:** `packages/react/src/island.tsx` and `packages/react/src/client.ts`.

## Conventions

- **No duplicated logic or types.** Generic helpers go in `@yaakdoc/core` (`util.ts`, `tree.ts`). React and theme helpers go in `@yaakdoc/react` (hooks, `site-url.ts`, tab helpers in `islands/tabs.tsx`, `primitives/heading.tsx`). Config-shaped types derive from `@yaakdoc/config` (`ResolvedConfig`, `Branding`). Search for an existing helper before writing a new one.
- **Themes override, they don't re-implement.** `<Content />` decides what a page shows. Themes restyle pieces by registering overrides (`components: { RequestDoc, FolderDoc, Overview, ChildLinks, NotFound, ... }`). New base components must be wrapped with `overridable(name, Component)`.
- **Islands:** props must be JSON-serializable, and islands can't use the data hooks (`useDocument`, `useSite`, ...). Create them with `createIsland(name, Component)` and register them in the theme's `client.ts`. Keep big data out of island props: panels are static HTML, and islands only control them (see `TabList` and `tabPanelProps`).
- **Secrets never reach the output.** Variables defined with template functions (e.g. `secure(...)`), names matching `variables.hide`, and private environments must never appear in HTML, Markdown, examples or the shared export. Add a test if you touch resolution, display or `sanitizeExport`.
- **Formatting and lint:** Biome (`biome.json`), with double quotes, semicolons and 100 columns. Don't add ESLint or Prettier.
- **TypeScript:** strict, `moduleResolution: Bundler`, no `.ts` extensions in relative imports. Packages build with tsdown (`fixedExtension: false`, so the output is `.js`/`.d.ts`).
- **Exports:** `package.json` exports include an `"@yaakdoc/source"` condition that points at `src/`. tsconfig uses it so type-checking doesn't need a build. Keep it in sync when adding entry points.
- **Package format:** public packages follow the `package.json` layout already in place (author, `files` with a leading `/`, `repository.directory`, `prepack`, MIT, and a `LICENSE` file in each package). Package READMEs must use **absolute** GitHub links (`https://github.com/jozsefsallai/yaakdoc...`), because relative links break on npm.
- **Docs:** user-facing changes need docs updates in `apps/website/content/docs` (MDX; sidebar order in each folder's `meta.json`). READMEs stay short: install, a minimal example and absolute links to the matching docs page. The config's JSON schema is generated from the Zod schema (`packages/yaakdoc/scripts/generate-schema.js`); never edit it by hand. The website's [configuration reference](apps/website/content/docs/reference/configuration.mdx) is generated from it too (`<ConfigReference />`), so describe new options with `.meta({ description })` in the schema instead of in the docs.
- **Releases:** use Changesets (`pnpm changeset`). All public packages are versioned together (`fixed` in `.changeset/config.json`).

## Testing notes

- Unit tests live in `packages/*/test`. The fixture `packages/core/test/fixtures/current.json` is a copy of the demo export, kept stable for tests. Change the demo freely, but update the fixture only on purpose.
- Snapshot files (`__snapshots__/*.snap`) are committed. If you change generated output on purpose, update them with `vitest -u` and review the diff.
- `packages/yaakdoc/test/dev.test.ts` must stay separate from the build tests. Builds load React's production build and the dev server loads the development build, and mixing them in one worker breaks rendering.
- The e2e tests are in `apps/demo/e2e`. Code and response panels exist once per environment, so filter locators with `{ visible: true }`. Use raw `page.mouse` clicks when testing scroll behavior, because locator clicks scroll elements into view themselves.

## Pitfalls (learned the hard way)

- **Engine resolution:** yaakdoc must work with `npx` and with ejected themes, where the project has no `node_modules`. The Vite plugin therefore:
  - pins React to yaakdoc's own copy (served to the dev SSR runner through an ESM wrapper, because the runner can't evaluate CommonJS);
  - resolves theme dependencies through fallback importers;
  - registers client dependencies with the optimizer by absolute path;
  - aliases CSS packages such as `tailwindcss`.

  Test changes there with a packed install (`pnpm pack` every package, install the tarballs into an empty directory, run its `yaakdoc` binary from another empty directory that contains only a `yaak.json`). Testing in the monorepo isn't enough.
- **`tsdown --watch --no-clean`:** the `dev` scripts must not clean `dist/`, or the demo server races the watchers and fails to load `@yaakdoc/react/dist/theme.js`.
- **pnpm version:** pnpm 12 installs a native binary through an install script that other pnpm versions skip when they fetch it on your behalf. That's why `packageManager` is pinned to pnpm 11. Don't upgrade casually.
- **Radix menus:** dropdowns in the sticky header must restore focus with `preventScroll` (see `useRestoreFocus` in Kiseki's `islands.tsx`), or closing them scrolls the page.
- **Overlays:** fixed overlays must not render inside an element with `backdrop-filter`, because it becomes their containing block. Portal them to `document.body`.
- **Island ids:** islands are server-rendered as isolated roots with their own `identifierPrefix`, so `useId()` matches when they hydrate. Keep it that way when touching `island.tsx` or `server.tsx`.
- **Yaak plugin:** `yaak plugin build` bundles into one CommonJS file and can't handle dynamic imports (Shiki loads languages that way), so `scripts/prebuild.mjs` bundles the engine into `generated/engine.cjs` itself. The engine is `yaakdoc/static` plus Kiseki, precompiled with `bundleTheme(…, { base: "./" })`. Keep `yaakdoc/static` free of Vite, and keep `ENGINE_DIR` working when bundled to CommonJS (no `import.meta.url`, and maybe no `package.json` above it). Themes other than Kiseki go through the yaakdoc CLI (`--overrides`), which needs Node.js. Yaak's plugin API only lists folders and HTTP requests, so the full export comes from `yaak export` (with `--data-dir` found from the plugin's install path); the API is only a fallback. The plugin's version follows yaakdoc's (changesets `fixed`), because it pins `npx yaakdoc@<version>`.
- **Mounting in other apps:** all integrations go through `MountOptions`/`mountOptions()` (`src/node/mount.ts`). The mount path always wins over `config.base`, and `publicDir` defaults to `false`, because the project's `public/` belongs to the host app (in Next.js it even contains the output, `public/docs`). Vite strips the base from `req.url` before yaakdoc's dev handler runs, so routes are matched on `req.originalUrl`. Vite's dev `transformIndexHtml` also prefixes the base onto absolute URLs that already contain it, so the dev server only takes Vite's injected tags from an empty document.
- **Next.js:** Next loads `next.config` in several processes and compiles `next.config.ts` to CommonJS. So `@yaakdoc/next` forks `yaakdoc`'s `dist/worker.js` (through `yaakdoc/integration`, which must not import Vite), and it guards the dev server and the build with `YAAKDOC_NEXT_*` environment variables that child processes inherit. Next's rewrite proxy doesn't forward WebSockets, so the worker's dev server sets `hmrClientPort` to its own port. The worker exits when its parent disconnects.
- **Vite plugin:** Vite calls `buildStart` in dev too. The docs build must only run when `config.command === "build"`, in the client environment, because it sets `NODE_ENV=production` while it runs and would load React's production build into the dev server.
- **Website code blocks:** Shiki fails the website build on unknown languages (e.g. `gitignore`); use `text` for those.
- **Background processes:** when stopping servers you started, don't use `pkill -f <pattern>`; the pattern can match your own shell. Look up the PID and kill that.
