---
"@yaakdoc/yaakdoc": minor
"yaakdoc": patch
---

Yaak plugin: progress in one dialog, npm themes, and pages and search.

- Each action keeps one dialog open from the export to the result. It shows the step that's running (with the end of a command's output) and the steps already done, and offers **Run in background** and **Cancel**. Choosing the action again while it runs brings the dialog back instead of starting a second run. The result, or an error with its log, is shown in the same dialog instead of a toast that disappears before the build is done.
- Themes from npm are fetched when the build needs them. Unless the theme is installed next to the config file, the plugin finds its package (`winxp` → `@yaakdoc/theme-winxp`, then `yaakdoc-theme-winxp`) and installs it into a cache. It only fails when no such package exists. A package named just `winxp` is never fetched, because it might not be a theme; full package names (`yaakdoc-theme-winxp`, `@acme/docs-theme`) are fetched as written.
- The form shows one section at a time, picked with a **Settings** select, instead of a long list of accordions. Values in the other sections are kept.
- The form has a **Pages and search** section: the pages directory, the API reference path and search. A saved project gets a relative `pagesDir` when the pages are inside it.
- `yaakdoc`: themes share yaakdoc's `@yaakdoc/react`, even when they come with an older copy of their own. Before, their hooks couldn't see yaakdoc's provider, and rendering failed. `yaakdoc/static` exports `themePackageCandidates`.
