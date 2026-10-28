# @yaakdoc/react

Unstyled React components, hooks and the island runtime for building [yaakdoc](https://github.com/jozsefsallai/yaakdoc#readme) themes.

```sh
npm i @yaakdoc/react react react-dom
```

## Anatomy of a theme

```
my-theme/
  theme.ts          manifest, loaded by yaakdoc in Node
  src/entry.tsx     server entry: { Layout, components?, Head? }
  src/client.ts     client entry: the islands to hydrate
  src/styles.css    styles (any Vite-supported CSS: plain CSS, Tailwind, ...)
```

```ts
// theme.ts – keep this file free of React imports
import { defineTheme } from "@yaakdoc/react/theme";
import { z } from "zod";

export default defineTheme({
  name: "my-theme",
  entry: "./src/entry.tsx",

  client: "./src/client.ts",
  styles: ["./src/styles.css"],

  // Font files (from your styles) to preload, so the first paint doesn't use a fallback font.
  // A role is skipped when the user sets `branding.fonts.sans` / `branding.fonts.mono`.
  preloadFonts: {
    sans: ["inter-latin-wght-normal.woff2"]
  },

  highlight: {
    light: "github-light",
    dark: "github-dark",
  }, // Shiki themes

  options: z.object({
    accent: z.string().default("violet"),
  }), // validates `themeOptions`

  vitePlugins: async () => [], // e.g. Tailwind

  eject: {
    files: ["theme.ts", "src/**"],
    dependencies: ["@yaakdoc/react"],
  },
});
```

Theme source is processed by Vite, so TSX works without a build step. A theme package can ship its source as-is.

Load fonts from `styles` rather than from the client entry: CSS imported by the client entry is only applied once its script runs (in dev), so text first renders in a fallback font. To avoid a visible switch when the font arrives, preload the fonts with `preloadFonts` and declare them with `font-display: optional`.

## The layout

`entry.tsx` default-exports a `ThemeRuntime`. The `Layout` renders the page `<body>`; yaakdoc renders `<html>`/`<head>` (meta tags, assets, branding CSS variables, the color mode script).

```tsx
import { Content, Footer, Logo, NavTree, type ThemeRuntime } from "@yaakdoc/react";
import { ColorModeToggle, NavFilter } from "@yaakdoc/react/islands";

const theme: ThemeRuntime = {
  Layout: ({ page }) => (
    <div className="layout">
      <aside id="sidebar">
        <Logo />
        <NavFilter target="#sidebar [data-yd=nav]" />
        <NavTree />
      </aside>

      <ColorModeToggle />

      <Content />

      <Footer />
    </div>
  ),
};

export default theme;
```

`page.kind` is `index`, `folder`, `request` or `not-found`. In `pages: "single"` mode, the index page contains everything. In `per-request` mode each folder and request has its own page. `<Content />` handles both, but you can compose the pieces yourself.

## Data hooks

| Hook | Returns |
| --- | --- |
| `useDocument()` | The `PreparedDocument`: `tree`, `requests`, `folders`, `workspace`, `environment`, `variables`, `pages`, `navigation`, `referenceBase`. |
| `useSite()` | Site data: title, description, logo, colors, links, `llms` settings, `base`, `pages`, ... |
| `usePage()` | The current page (`kind`, `id`, `path`, `markdownUrl`, ...). `kind` is `page` (custom page), `index` (API overview), `folder`, `request` or `not-found`. |
| `useRequest(id)` / `useFolder(id)` / `usePageDoc(id)` | A single prepared request, folder or custom page. |
| `useNavigation()` | The navigation: `tabs`, each with `items` (pages, groups and `{ type: "api" }`, the folders and requests). |
| `useActiveTab()` | The tab of the current page (the API reference's tab for the overview, folders and requests). |
| `usePageNeighbors(id)` | Previous and next entries around a page, in navigation order. |
| `useThemeOptions<T>()` | Your validated `themeOptions`. |

A prepared request already contains everything a theme needs:

- `href` and `markdownUrl`
- `resolvedUrl` (variables resolved, secrets as `{{placeholders}}`)
- `descriptionHtml` (sanitized Markdown)
- `bodyHtml`, `examples[].html` and `responses[]` (Shiki-highlighted example responses with `status`, `label`, `language`)
- headers, params and auth, each with `inheritedFrom` information

A prepared custom page has `title`, `description`, `sidebarTitle`, `icon`, `href`, `markdownUrl`, `summary` and `html`. In `html`, the blocks that use variables come once per environment, wrapped in `[data-yd-env]` like other environment variants, so the environment switcher works on pages without any extra code.

## Components

All components are unstyled. They render semantic markup with stable `data-yd="..."` attributes and accept `className`:

- **Page structure:** `Content`, `Overview`, `TreeContent`, `FolderDoc`, `ChildLinks`, `NotFound`, `Heading`
- **Custom pages:** `PageDoc`, `PageNav` (previous/next links)
- **Requests:** `RequestDoc`, `RequestBody`, `MethodBadge`, `RequestUrl`, `AuthInfo`, `KeyValueTable`, `Variables`
- **Code and Markdown:** `CodeBlock`, `CodeExamples`, `ResponseExamples`, `Markdown`, `Html`
- **Environments:** `EnvironmentVariants`, `EnvironmentSelect`
- **Navigation:** `Navigation` (a tab's groups, pages and the API reference), `NavTabs`, `NavTree` (the API reference alone), `NavIcon` (renders nothing; override it to show icons), `Breadcrumbs`
- **Search:** `Search` (a `SearchTrigger` and a `SearchDialog`)
- **Site chrome:** `Logo`, `SiteLinks`, `Footer`, `PageActions`, `RunInYaak`, `BrandingStyles`

A few attributes are useful when styling with plain CSS:

- `[data-method="get"]` on method badges.
- `[data-yd="url-variable"]` on the `{{variables}}` inside a `RequestUrl`.
- `[data-yd-section]` on documented sections, which the scroll spy uses.
- `aria-current` on the active navigation link.

### Overriding components

Every component above can be replaced everywhere, including where other components render it, by registering an override under its name:

```tsx
const theme: ThemeRuntime = {
  Layout,
  components: {
    // The override receives the same props, plus `Default` (the original component).
    MethodBadge: ({ request, Default }) => <Default request={request} className="badge" />,
  },
};
```

Use `overridable(name, Component)` to make your own components overridable.

`<Content />` decides what each page shows (a custom page, the API reference, a folder, a request or the 404 page). A theme can keep that logic and only restyle the parts. Kiseki, for example, renders `<Content />` and overrides `Overview`, `FolderDoc`, `RequestDoc`, `ChildLinks`, `PageDoc`, `PageNav`, `NavIcon` and `NotFound`.

### Helpers

These shared helpers keep themes consistent with the built-in components:

| Helper | Purpose |
| --- | --- |
| `usePageActions(markdownUrl)` | Data for "Copy page/section" actions (`null` when disabled). |
| `copyActionLabel(level)` | "Copy page" or "Copy section", depending on the heading level. |
| `useRunInYaak()` | Name and export URL for the "Run in Yaak" button (`null` when disabled). |
| `toAbsoluteUrl(site, path)` | Absolute URL of a site path, when `branding.url` is set. |
| `tabGroupIds`, `tabPanelProps`, `visibleTabPanelSelector` | Ids, panel props and copy targets for server-rendered panels controlled by `TabList`. |
| `methodLabel` (and `grpcMethodPath`, `formFieldValue` from `@yaakdoc/core`) | Display values for methods, gRPC calls and form fields. |

## Branding

Users' branding settings arrive as CSS custom properties on `:root`:

- `--yd-color-primary`, `--yd-color-accent`, `--yd-color-background` and `--yd-color-foreground`, with per-mode values under `[data-theme="light"]` and `[data-theme="dark"]`
- `--yd-font-sans` and `--yd-font-mono`

Use them with fallbacks:

```css
:root {
  --primary: var(--yd-color-primary, #6d28d9);
}
```

The color mode is applied before first paint as `data-theme="light|dark"` on `<html>`, and `color-scheme` is set accordingly. Without JavaScript, follow `prefers-color-scheme`. Highlighted code uses Shiki's dual themes. Pick the right variant with:

```css
.shiki,
.shiki span {
  color: light-dark(var(--shiki-light), var(--shiki-dark));
}
```

## Islands

Pages are static HTML. Interactive parts are **islands**: components that are rendered on the server and hydrated individually on the client.

```tsx
import { createIsland, useCopy } from "@yaakdoc/react/islands";

export const CopyLink = createIsland("my-theme:copy-link", ({ href }: { href: string }) => {
  const { copied, copy } = useCopy();
  return <button onClick={() => copy({ text: href })}>{copied ? "Copied" : "Copy link"}</button>;
});
```

```ts
// src/client.ts
import { builtinIslands } from "@yaakdoc/react/islands";
import { CopyLink } from "./islands";

export default [...builtinIslands, CopyLink];
```

Islands follow two rules:

- **Props must be JSON-serializable.** They're embedded in the HTML.
- **Islands can't use the data hooks**, because they're hydrated in isolation. Pass data in through props.

Islands are rendered as isolated roots on the server too, so `useId()` (and libraries such as Radix UI) produce matching ids when they hydrate.

**Built-in islands:**

- `ColorModeToggle`
- `CopyButton`
- `EnvironmentSwitcher`
- `TabList`, which controls server-rendered tab panels and keeps the chosen language in sync across the page
- `NavToggle`
- `NavFilter`
- `ScrollSpy`
- `OpenInLink`
- `RunInYaakLink`
- `SearchTrigger` and `SearchDialog` (a native `<dialog>`), opened with Cmd+K / Ctrl+K or `/`

**Headless hooks** for building your own: `useColorMode`, `useCopy`, `useTabs`, `useNavToggle`, `useScrollSpy`, `useEnvironment`, `useRunInYaakHref`, plus `openInUrl()` and `runInYaakUrl()` for "Open in ChatGPT/Claude" links.

**Search:** `site.searchUrl` is the URL of the search index (`SearchEntry[]`: `title`, `description`, `href`, `kind`, `method`, `section`), or `null` when search is off. Pass it to a search island as a prop; the index is fetched when the dialog first opens.

- `useSearchDialog()` returns `{ open, setOpen, restoreFocus }`. It opens on `openSearch()` and the keyboard shortcuts, and `restoreFocus()` returns focus without scrolling.
- `useSearch(url, { enabled })` returns `{ query, setQuery, results, active, setActive, onKeyDown, loading, error }`. `onKeyDown` handles ↑, ↓ and Enter.
- `searchEntries(entries, query)` is the ranking: every term must match, and titles rank above sections and descriptions.
- `<SearchShortcut />` renders `Cmd+K` on Apple platforms and `Ctrl K` elsewhere. Both are rendered, and a head script (`platformScript`, added by yaakdoc when search is on) shows the right one before first paint, so the label doesn't change when hydrating.
- `useSearchShortcutLabel()` returns the same label as a string (for `title` attributes). It's `Cmd+K` until hydrated.

## Environments

When the config lists several `environments`, environment-dependent data is prepared per environment:

- `request.variants` holds `resolvedUrl` and `examples` for each environment.
- `document.variableSets` holds the variables table for each environment.
- `document.environments` lists the options, default first.
- `page.html` of custom pages contains the variants of the blocks that use variables.

Render the variants with `<EnvironmentVariants variants={...}>{(variant) => ...}</EnvironmentVariants>`, and add a switcher with `<EnvironmentSelect />` (or build your own with `useEnvironment`). yaakdoc adds a small head script and CSS so that a remembered choice shows up before first paint.

## Entry points

| Import | Contents |
| --- | --- |
| `@yaakdoc/react` | Components, hooks, overrides, types. |
| `@yaakdoc/react/islands` | Islands and headless hooks (client-safe). |
| `@yaakdoc/react/client` | `hydrateIslands()` (used by yaakdoc's client entry). |
| `@yaakdoc/react/server` | `renderPage()` (used by yaakdoc's SSR entry). |
| `@yaakdoc/react/theme` | `defineTheme()` and theme types (Node-safe). |
