# @yaakdoc/theme-editorial

**Editorial** is a [yaakdoc](https://yaakdoc.dev) theme for APIs that are mostly prose: serif type in a comfortable reading column, a masthead with the navigation tabs as its sections, a table of contents, numbered figures for examples and responses, and side notes for parameters on wide screens. Light mode is paper, dark mode a night-reading mode.

It's built with [Tailwind CSS v4](https://tailwindcss.com) and Radix UI, and uses Source Serif 4, Inter and JetBrains Mono, bundled locally, so there are no external requests. [See it live](https://demo.yaakdoc.dev/editorial/).

## Usage

```sh
npm i -D @yaakdoc/theme-editorial
```

```json
{
  "theme": "editorial",
  "themeOptions": {
    "measure": "68ch",
    "dropCap": true,
    "navOpenDepth": 2
  }
}
```

| Option | Default | Description |
| --- | --- | --- |
| `measure` | `"68ch"` | Width of the reading column (any CSS length). |
| `dropCap` | `true` | Start the overview's introduction with a drop cap. |
| `navOpenDepth` | `2` | Folder levels expanded in the contents by default. Folders containing the current page or section always open. |

`branding.fonts.sans` replaces the serif reading font. See the [Editorial docs](https://yaakdoc.dev/docs/theming/editorial) for more, and [Ejecting](https://yaakdoc.dev/docs/theming/ejecting) to change anything.
