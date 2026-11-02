# @yaakdoc/theme-blueprint

**Blueprint** is a [yaakdoc](https://yaakdoc.dev) theme that draws your API docs as technical drawings: a title block with the environment and the sheet number, the navigation as a numbered sheet index, requests as schematics with callouts on their path parameters, and parameters as numbered parts lists, on a drafting grid. Dark mode is a blueprint (white lines on blue), light mode a whiteprint (blue lines on white).

It's built with [Tailwind CSS v4](https://tailwindcss.com) and Radix UI, and uses IBM Plex Sans and Mono, bundled locally, so there are no external requests. [See it live](https://demo.yaakdoc.dev/blueprint/).

## Usage

```sh
npm i -D @yaakdoc/theme-blueprint
```

```json
{
  "theme": "blueprint",
  "themeOptions": {
    "grid": true,
    "sidebarWidth": "18rem",
    "navOpenDepth": 2
  }
}
```

| Option | Default | Description |
| --- | --- | --- |
| `grid` | `true` | Draw the drafting grid behind the content. |
| `sidebarWidth` | `"18rem"` | Any CSS length. |
| `navOpenDepth` | `2` | Folder levels expanded in the navigation by default. Folders containing the current page or section always open. |

See the [Blueprint docs](https://yaakdoc.dev/docs/theming/blueprint) for more, and [Ejecting](https://yaakdoc.dev/docs/theming/ejecting) to change anything.
