![yaakdoc](.github/assets/yaakdoc-banner.png)

# yaakdoc

Static, themable, and LLM-friendly API documentation generated from [Yaak](https://yaak.app) exports.

**SEE A LIVE DEMO HERE: https://yaakdoc-demo.vercel.app**

```sh
npx yaakdoc
```

Run it next to a Yaak export (`yaak.json`) and your docs are served at `http://localhost:4000`. `npx yaakdoc build` writes a static site to `dist/` that you can host anywhere.

- **Rendered on the server.** Every page is prerendered HTML. The docs are readable without JavaScript, and only small interactive "islands" (tabs, copy buttons, the color mode toggle) hydrate on the client.
- **Zero config.** The export is auto-detected, and the workspace name, description and environment come from Yaak. Add an optional [`yaakdoc.config.json`](#configuration) for branding and options.
- **Themable.** Unstyled React components (`@yaakdoc/react`), a component override system and a free layout. The default theme, [Kiseki](packages/theme-kiseki), uses Tailwind CSS v4 and shadcn/ui, with light and dark mode and syntax highlighting.
- **Ejectable.** `yaakdoc eject` copies the theme into your project, where you can change anything.
- **LLM friendly.** It generates `llms.txt`, `llms-full.txt` and a Markdown version of every page. Kiseki adds "Copy page", "View as Markdown" and "Open in ChatGPT/Claude" actions.
- **Code examples.** Each request gets examples in cURL, JavaScript, Python, Go, grpcurl and wscat. The generators are pluggable.

## Getting started

There are multiple ways to generate a documentation site from your Yaak workspace.

## Yaak plugin

The [yaakdoc plugin for Yaak](packages/yaak-plugin) builds the docs without leaving Yaak. Install `@yaakdoc/yaakdoc` from Yaak's plugin registry (**Settings → Plugins**), then use the workspace menu:

- **Build docs with yaakdoc...** exports the workspace, lets you set every config option in a form, and builds the static site into a folder you choose.
- **Save as yaakdoc project...** writes `yaakdoc.json` and `yaakdoc.config.json` into a folder, ready to commit and build in CI.

With Kiseki, the default theme, there's nothing else to install: the plugin bundles yaakdoc and a precompiled Kiseki and builds inside Yaak. Other themes are built with the yaakdoc CLI, so they need Node.js ≥ 20.19 with npm. Install the [Yaak CLI](https://github.com/mountain-loop/yaak) too, so environments and gRPC/WebSocket requests are included in the docs.

## CLI

1. In Yaak, export your workspace (**Settings (cog in the top right corner) → Export Data**) and save it as `yaak.json`.
2. Run `npx yaakdoc` in the same folder to start the dev server. It reloads when the export changes.
3. Run `npx yaakdoc build` to produce a static site in `dist/`.

To keep yaakdoc as a project dependency:

```sh
npm i -D yaakdoc
npx yaakdoc init     # creates yaakdoc.config.json (with editor autocomplete)
```

### Commands

| Command | Description |
| --- | --- |
| `yaakdoc [export]` | Same as `yaakdoc dev`. |
| `yaakdoc dev [export]` | Dev server with SSR, live reload and HMR. Options: `--port/-p`, `--host`, `--open/-o`, `--no-watch`. |
| `yaakdoc build [export]` | Builds the static site. Options: `--out-dir/-o`. |
| `yaakdoc preview` | Serves the built site locally. Options: `--port/-p`, `--host`, `--out-dir`, `--open`. |
| `yaakdoc init` | Interactive setup that writes `yaakdoc.config.json`. Options: `--yes/-y`, `--force`. |
| `yaakdoc eject` | Copies the current theme to `./theme` and switches the config to it. Options: `--out`, `--force`. |

`dev` and `build` also accept `--config/-c`, `--theme/-t`, `--pages single|per-request`, `--base`, `--environment/-e` and `--workspace/-w`. Flags take precedence over the config file.

For anything else, `--overrides` takes a JSON file or inline JSON with any [config](#configuration) values. It's deep-merged over the config file, and explicit flags still win over it. Paths in it are relative to the current directory.

```sh
npx yaakdoc build --overrides '{"branding":{"title":"Staging API"},"runInYaak":false}'
```

When no export is passed (as an argument or `export` in the config), yaakdoc uses `yaakdoc.json` or, failing that, `yaak.json` from the current directory.

## Inside an existing app

The docs can also live at a path (e.g. `/docs`) of an app you already have. Each integration takes the docs' `path`, the yaakdoc `config` inline, so no `yaakdoc.config.*` file is needed, and the location of the `export`.

**Next.js** with [`@yaakdoc/next`](packages/next):

```ts
// next.config.ts
import { createNextYaakdoc } from "@yaakdoc/next";

const withYaakdoc = createNextYaakdoc({
  path: "/docs",
  export: "./yaak.json",
  config: {
    branding: {
      title: "Acme API",
    },
  },
});

export default withYaakdoc(nextConfig);
```

- **`next dev`** proxies the docs to a yaakdoc dev server, with live reload.
- **`next build`** prerenders them into `public/docs`. Add that folder to `.gitignore`.

**Vite-based apps** (Vite, React Router, SvelteKit, Astro, ...) with `yaakdoc/vite`:

```ts
// vite.config.ts
import yaakdoc from "yaakdoc/vite";

export default defineConfig({
  plugins: [
    yaakdoc({
      path: "/docs",
      export: "./yaak.json",
    }),
  ],
});
```

**Node servers** (Express, Connect, Fastify, Nitro, ...) with `yaakdocMiddleware`:

```ts
import { yaakdocMiddleware } from "yaakdoc";

app.use(await yaakdocMiddleware({ path: "/docs", export: "./yaak.json" }));
```

The [yaakdoc package README](packages/yaakdoc#inside-an-existing-app) lists every option.

## Configuration

Everything is optional. `yaakdoc.config.json` (`.jsonc`, `.ts` and `.js` also work) looks like this:

```jsonc
{
  "$schema": "./node_modules/yaakdoc/config.schema.json",
  "export": "./yaak.json",
  "theme": "kiseki", // short name, npm package, or local path (e.g. "./theme")
  "themeOptions": {
    "codePanel": "right" // theme-specific configuration
  },
  "workspace": "Acme Store API", // when the export has several workspaces
  "environment": "Production", // used to resolve variables in examples; false = none
  "environments": "public", // adds an environment switcher: "public" or a list of names/ids
  "pages": "single", // "single" (one page, anchors) | "per-request"
  "pagesDir": "./docs", // Markdown pages, see "Custom pages" below
  "navigation": {
    "tabs": []
  }, // tabs, groups and pages, see "Custom pages" below
  "apiPath": "reference", // where the API reference lives (default: "" or "reference")
  "search": true, // search index and Cmd+K search
  "base": "/", // e.g. "/docs/" when hosted in a subfolder
  "outDir": "dist",
  "server": {
    "port": 4000,
    "host": false,
    "open": false
  },
  "branding": {
    "title": "Acme API",
    "description": "Manage your Acme store.",
    "url": "https://docs.acme.dev", // enables canonical URLs, sitemap.xml and absolute llms.txt links
    "logo": {
      "light": "./logo.svg",
      "dark": "./logo-dark.svg"
    },
    "favicon": "./favicon.svg",
    "colors": {
      "primary": "#0f766e",
      "dark": {
        "primary": "#5eead4"
      }
    },
    "fonts": {
      "sans": "\"Inter\", sans-serif",
      "stylesheet": "https://fonts.googleapis.com/css2?family=Inter"
    },
    "links": [
      {
        "label": "Status",
        "href": "https://status.acme.dev"
      }
    ],
    "footer": "© Acme Inc. [Contact us](mailto:api@acme.dev)",
    "defaultColorMode": "system",
    "colorModeToggle": true,
    "customCss": "./brand.css"
  },
  "snippets": ["curl", "javascript", "python", "go", "grpcurl", "wscat"],
  "runInYaak": true, // or { "name": "Acme API", "url": "https://.../openapi.json" }
  "llms": {
    "enabled": true,
    "full": true,
    "copyButton": true,
    "openIn": ["chatgpt", "claude"]
  },
  "variables": {
    "resolve": true,
    "show": true,
    "hide": ["token", "secret", "password"]
  },
  "filter": {
    "include": [],
    "exclude": ["internal/**"]
  },
  "head": [
    {
      "tag": "script",
      "attrs": {
        "src": "https://plausible.io/js/script.js",
        "defer": true
      }
    }
  ]
}
```

The full reference is the JSON schema at [`config.schema.json`](https://unpkg.com/yaakdoc/config.schema.json) (published with the `yaakdoc` package), which is generated from the [Zod schema](packages/config/src/schema.ts). Some details:

- **Secrets.** yaakdoc never inlines a variable whose value uses a template function (such as `secure(...)`) or whose name matches `variables.hide`. Those show up as `{{name}}` placeholders in the examples and as `<redacted>` in the tables. Private environments are only used when you select one explicitly.
- **Environment switcher.** With `environments`, the examples and the variables table are prerendered for each listed environment, and readers switch between them without a reload. Their choice is remembered.
- **Run in Yaak.** `runInYaak` adds a button that opens [Yaak](https://yaak.app/button/new) and imports the API. yaakdoc publishes a sanitized copy of the export at `<base>yaak.json`. The copy contains only the documented workspace and requests, has no private environments, blanks secret variables, headers and auth fields, and removes `secure(...)` values. Set `runInYaak.url` to link to a spec hosted elsewhere instead. Set `branding.url` so the link is absolute in the HTML; otherwise it's made absolute in the browser.
- **`public/`.** Files in a `public/` folder next to the config are copied to the site root as-is.
- **Branding colors.** These are exposed to themes as CSS custom properties (`--yd-color-primary`, `--yd-font-sans`, ...).

## Custom pages

Besides the API reference generated from Yaak, a site can have pages written in Markdown: guides, a quickstart, a changelog... what have you! Point `pagesDir` to a directory of `.md` files (subdirectories are also supported):

```text
docs/
├── index.md          → /
├── quickstart.md     → /quickstart/
└── guides/
    ├── authentication.md → /guides/authentication/
    └── token-flow.svg
```

Pages start with optional YAML front matter:

```md
---
title: Authentication
description: Get an access token and keep it fresh.
sidebarTitle: Auth
icon: key-round
---

Send the token to `${[ base_url ]}` in the `Authorization` header.
See the [quickstart](../quickstart.md#1-get-a-token).

![The token flow](./token-flow.svg)
```

| Field | Description |
| --- | --- |
| `title` | Page title. Defaults to the first `# Heading` (which is then not repeated in the body), then the file name. |
| `description` | Shown under the title, in search and in `llms.txt`. |
| `sidebarTitle` | Shorter title for the navigation. |
| `icon` | Icon hint for themes. The default theme uses [Lucide](https://lucide.dev/icons) names, e.g. `book-open`. |
| `order` | Sort order in the generated navigation. |
| `hidden` | Built, but left out of the generated navigation and search. |

- **Variables.** Use Yaak's template syntax, `${[ base_url ]}`, anywhere in a page, code blocks included. Values come from the selected environment, and the parts of a page that use variables switch with the environment switcher. Secrets follow the same rules as everywhere else: they show up as `{{name}}` placeholders.
- **Links and images.** Relative links to other pages (`./quickstart.md#install`) point to their URLs, and relative images are copied into the site. Headings get ids, so you can link to them.
- **Raw HTML** is sanitized, as in descriptions.

### Navigation

Without a `navigation`, it's generated from the directory: pages sorted by `order` and then by title (`index.md` first), each subdirectory as a group, and the API reference at the end. To arrange it yourself, use tabs, groups and pages (all optional). Pages are paths relative to `pagesDir`, without the extension. `{ "api": true }`, or `"api": true` on a tab or group, places the folders and requests from Yaak:

```jsonc
{
  "pagesDir": "./docs",
  "navigation": {
    "tabs": [
      {
        "tab": "Guides",
        "icon": "book-open",
        "groups": [
          {
            "group": "Getting started",
            "pages": ["index", "quickstart"]
          },
          {
            "group": "Guides",
            "pages": ["guides/authentication", "guides/pagination"]
          }
        ]
      },
      {
        "tab": "API Reference",
        "icon": "square-terminal",
        "api": true
      },
      {
        "tab": "Changelog",
        "pages": ["changelog"]
      }
    ]
  }
}
```

Without tabs, use `groups` and `pages` at the top level. Groups can be nested:

```json
{
  "navigation": {
    "pages": ["index", "quickstart"],
    "groups": [
      {
        "group": "Guides",
        "pages": [
          "guides/authentication",
          {
            "group": "Advanced",
            "pages": ["guides/webhooks"]
          }
        ]
      },
      {
        "group": "API Reference",
        "api": true
      }
    ]
  }
}
```

If the navigation doesn't place the API reference, it's added at the end (as a last tab when there are tabs).

### Where the API reference lives

Sites without pages are unchanged: the reference is the home page. When `pagesDir` has an `index.md`, that page becomes the home page and the reference moves to `/reference/`, so requests and folders live under it (e.g. `/reference/#products-get-a-product`, or `/reference/products/get-a-product/` with `"pages": "per-request"`). Set `apiPath` to choose another path, or `""` to keep the reference at the root. If nothing lives at the root, it redirects to the first page of the navigation.

### Search

Every site has a search index (`<base>_yaakdoc/search.json`) of the titles and descriptions of pages, folders and requests. In the default theme, you can also press Cmd+K / Ctrl+K or `/`, or use the search button in the sidebar. Set `"search": false` to turn it off.

## Example responses

Document responses by adding `response` code blocks to a request's description in Yaak. Add an HTTP status code to show several responses (success, errors, ...):

````md
Retrieve a single product by its id.

```response:200
{ "id": "prod_123", "name": "Running shoes" }
```

```response:404
{ "error": "not_found" }
```
````

- **Removed from the description.** Response blocks are shown as tabbed, syntax-highlighted examples labeled by status (`200 OK`, `404 Not Found`). They're also included in the Markdown and `llms.txt` output.
- **Without a status code.** A plain `response` block is labeled "Response".
- **Language.** JSON, XML and HTML are detected automatically. To set it explicitly, add it after the status, e.g. `response:200 yaml`.
- **Empty bodies.** A block with no content (e.g. `response:204`) shows "No response body".

## LLM-friendly output

When `llms.enabled` is on (the default), every site includes:

- `/llms.txt`, following the [llms.txt](https://llmstxt.org) format, with links to the Markdown of every page and endpoint.
- `/llms-full.txt`, the complete documentation in a single Markdown file.
- A Markdown version of every page: append `.md` to a page, request or folder path, e.g. `/quickstart.md` or `/products/get-a-product.md`. Variables in pages are resolved for the default environment. The dev server also returns Markdown for requests with `Accept: text/markdown`.
- A `<link rel="alternate" type="text/markdown">` tag on every page, and "Copy page" and "Open in ChatGPT/Claude" actions in the default theme.

## Themes

A theme is a small manifest plus React components that Vite renders on the server:

```ts
// theme.ts
import { defineTheme } from "@yaakdoc/react/theme";

export default defineTheme({
  name: "my-theme",
  entry: "./src/entry.tsx", // default-exports { Layout, components?, Head? }
  client: "./src/client.ts", // default-exports the islands to hydrate
  styles: ["./src/styles.css"],
  vitePlugins: async () => [(await import("@tailwindcss/vite")).default()],
});
```

Set `"theme": "./my-theme"` to use a local theme. To publish one, name the package `yaakdoc-theme-<name>`; users can then refer to it by its short name. See the [theme authoring guide](packages/react/README.md) for the components, hooks, override system and islands, and [Kiseki](packages/theme-kiseki) as a complete example.

The quickest way to customize is `npx yaakdoc eject`. The ejected theme's dependencies are provided by yaakdoc, so it works without installing anything.

## Packages

| Package | Description |
| --- | --- |
| [`yaakdoc`](packages/yaakdoc) | CLI, Node API (`createDevServer`, `build`, `preview`, `eject`, `init`), the Vite-based engine, the `yaakdoc/vite` plugin and `yaakdocMiddleware`. |
| [`@yaakdoc/core`](packages/core) | Parses Yaak exports (all schema versions), normalizes them into a documentation model, resolves templates and variables. |
| [`@yaakdoc/config`](packages/config) | The config schema (Zod), `defineConfig`, loader and JSON schema. |
| [`@yaakdoc/snippets`](packages/snippets) | Code example generators and `defineSnippet`. |
| [`@yaakdoc/markdown`](packages/markdown) | Markdown rendering of requests and folders, `llms.txt` and `llms-full.txt`. |
| [`@yaakdoc/react`](packages/react) | Unstyled components, hooks, component overrides, the island runtime and the theme contract. |
| [`@yaakdoc/theme-kiseki`](packages/theme-kiseki) | The default theme. |
| [`@yaakdoc/next`](packages/next) | Serves the docs from a Next.js app (`createNextYaakdoc`). |
| [`@yaakdoc/yaakdoc`](packages/yaak-plugin) | The Yaak plugin (published to Yaak's plugin registry, not npm). |

## How it works

```
yaak.json ─▶ @yaakdoc/core ─▶ prepareDocument ─▶ PreparedDocument ─┬─▶ theme (React SSR via Vite) ─▶ HTML
              normalize         + Shiki, Markdown,                  ├─▶ @yaakdoc/markdown ─▶ .md, llms.txt
                                + snippets, routes                  └─▶ islands (hydrated) ─▶ client JS
```

- **Dev server.** Vite runs in middleware mode, and each request is server-rendered through Vite's SSR module runner. Theme and CSS changes hot-reload. Changes to the export or config rebuild the document and reload the page.
- **Build.** Vite builds the client islands and CSS, then bundles the SSR entry. Every route is prerendered with `react-dom/static`, and the Markdown and `llms.txt` files are written alongside.
- **Highlighting and Markdown.** Shiki and the descriptions' Markdown are rendered at build time, so highlighting ships no client JS. Dual themes switch with CSS variables.

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
```

Releases are managed with [Changesets](https://github.com/changesets/changesets): run `pnpm changeset`, then `pnpm version-packages` and `pnpm release`.

## License

[MIT](LICENSE) © József Sallai
