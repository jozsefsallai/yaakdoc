# @yaakdoc/theme-terminal

**Terminal** is a monospace [yaakdoc](https://yaakdoc.dev) theme for CLI-first APIs: a shell prompt for the current page, the navigation as a file tree, tmux-style panes for examples and responses, and a status line with the navigation tabs, the environment and the color mode. `/` opens search, and `[` and `]` go to the previous and next page.

It's built with [Tailwind CSS v4](https://tailwindcss.com) and Radix UI, and uses JetBrains Mono, bundled locally, so there are no external requests. [See it live](https://demo.yaakdoc.dev/terminal/).

## Usage

```sh
npm i -D @yaakdoc/theme-terminal
```

```json
{
  "theme": "terminal",
  "themeOptions": {
    "palette": "green",
    "cursor": true,
    "sidebarWidth": "19rem",
    "navOpenDepth": 2
  }
}
```

| Option | Default | Description |
| --- | --- | --- |
| `palette` | `"green"` | Phosphor color: `"green"`, `"amber"` or `"mono"`. A `branding.colors.primary` takes precedence. |
| `cursor` | `true` | Show a blinking cursor after the prompt. |
| `sidebarWidth` | `"19rem"` | Any CSS length. |
| `navOpenDepth` | `2` | Folder levels expanded in the navigation by default. Folders containing the current page or section always open. |

See the [Terminal docs](https://yaakdoc.dev/docs/theming/terminal) for more, and [Ejecting](https://yaakdoc.dev/docs/theming/ejecting) to change anything.
