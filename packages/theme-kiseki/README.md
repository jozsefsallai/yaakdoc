# @yaakdoc/theme-kiseki

**Kiseki** (奇跡, "miracle") is the default [yaakdoc](https://yaakdoc.dev) theme.

It's built with [Tailwind CSS v4](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com) components (Radix UI, lucide icons), and uses Geist fonts that are bundled locally, so there are no external requests. [See it live](https://demo.yaakdoc.dev).

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

See the [Kiseki docs](https://yaakdoc.dev/docs/theming/kiseki) for tabs, icons, search and customizing, and [Ejecting](https://yaakdoc.dev/docs/theming/ejecting) to change anything.
