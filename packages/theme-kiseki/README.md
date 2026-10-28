# @yaakdoc/theme-kiseki

**Kiseki** (奇跡, "miracle") is the default [yaakdoc](https://github.com/jozsefsallai/yaakdoc#readme) theme.

It's built with [Tailwind CSS v4](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com) components (Radix UI, lucide icons), and uses Geist fonts that are bundled locally, so there are no external requests.

## Options

```json
{
  "theme": "kiseki",
  "themeOptions": {
    "codePanel": "right",
    "sidebarWidth": "18rem",
    "navOpenDepth": 2,
    "showEnvironment": true
  }
}
```

| Option | Default | Description |
| --- | --- | --- |
| `codePanel` | `"right"` | `"right"` puts code examples in a sticky column on wide screens. `"inline"` puts them below each request. |
| `sidebarWidth` | `"18rem"` | Any CSS length. |
| `navOpenDepth` | `2` | Folder levels expanded in the navigation by default. Folders containing the current page or section always open. |
| `showEnvironment` | `true` | Show the environment used for the examples in the header. |

## Pages, tabs and search

- **Tabs.** With several navigation tabs, they're shown under the header, and the sidebar shows the current tab.
- **Groups.** Top-level groups are titled sections. Nested groups collapse.
- **Icons.** `icon` on pages, groups and tabs takes a [Lucide](https://lucide.dev/icons) icon name, such as `book-open` or `key-round`.
- **Search.** Press Cmd+K / Ctrl+K or `/`, or use the search button in the sidebar. With `"search": false`, the sidebar shows a filter instead.

## Customizing

- **Colors and fonts.** Use `branding.colors` and `branding.fonts` in the config. They feed the shadcn-style tokens in `src/styles.css`.
- **Small CSS tweaks.** Use `branding.customCss`.
- **Everything else.** Run `npx yaakdoc eject` to copy this theme into `./theme`. The theme's shadcn config (`components.json`) is copied too, and `@/...` imports resolve to `theme/src`, so components copied from shadcn/ui work as-is.
