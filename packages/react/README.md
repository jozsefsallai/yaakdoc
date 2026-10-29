# @yaakdoc/react

Unstyled React components, hooks and the island runtime for building [yaakdoc](https://yaakdoc.dev) themes.

```sh
npm i @yaakdoc/react react react-dom
```

```tsx
// src/entry.tsx
import { Content, Footer, Logo, NavTree, type ThemeRuntime } from "@yaakdoc/react";
import { ColorModeToggle } from "@yaakdoc/react/islands";

const theme: ThemeRuntime = {
  Layout: () => (
    <div className="layout">
      <aside>
        <Logo />
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

| Import | Contents |
| --- | --- |
| `@yaakdoc/react` | Components, hooks, overrides, types. |
| `@yaakdoc/react/islands` | Islands and headless hooks (client-safe). |
| `@yaakdoc/react/client` | `hydrateIslands()` (used by yaakdoc's client entry). |
| `@yaakdoc/react/server` | `renderPage()` (used by yaakdoc's SSR entry). |
| `@yaakdoc/react/theme` | `defineTheme()` and theme types (Node-safe). |

The theme authoring guide is on the website:

- [Writing a theme](https://yaakdoc.dev/docs/theming/authoring): the manifest, layout, data hooks, components, overrides, branding tokens and environments
- [Islands](https://yaakdoc.dev/docs/theming/islands): built-in islands, headless hooks and search
- [Publishing a theme](https://yaakdoc.dev/docs/theming/publishing)
