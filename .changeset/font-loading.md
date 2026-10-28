---
"yaakdoc": patch
"@yaakdoc/react": patch
"@yaakdoc/theme-kiseki": patch
---

Fix text rendering in a fallback font and then switching fonts on page load.

- Themes can declare `preloadFonts` (font files by role, `sans` or `mono`). yaakdoc preloads them in builds and in the dev server, except roles the user replaces with `branding.fonts`.
- Kiseki loads Geist from its stylesheets (they used to be injected by the client script in dev), preloads the latin files and uses `font-display: optional`.
- Ejected themes can import CSS packages that don't export their `package.json` (such as Fontsource) without installing them.
