---
"yaakdoc": minor
"@yaakdoc/core": minor
"@yaakdoc/config": minor
"@yaakdoc/markdown": minor
"@yaakdoc/react": minor
"@yaakdoc/theme-kiseki": minor
"@yaakdoc/next": minor
---

Fixes from adding yaakdoc to an existing Next.js app:

- **Next.js dev keeps working when the docs don't.** A missing export, an unknown environment or an invalid config no longer stops `next dev` from starting. The error is logged and shown at the docs' path, and the docs load as soon as the file is fixed. The same goes for errors after a reload in any dev server: the page shows the error instead of the old docs. `next build` still fails.
- **Clearer errors.** A missing export shows its full path, and errors about `export`, `workspace`, `environment` and `environments` say where the value was set (an option or the config file).
- **The host app's PostCSS config is ignored.** Vite no longer picks up a `postcss.config.*` from the project or a parent folder (e.g. Next.js's `["@tailwindcss/postcss"]`, which it can't load). A theme can still have its own, in its folder.
- **Response headers.** Example responses can start with `Name: value` lines and a blank line, like a raw HTTP response. Themes show them above the body (`ResponseHeaders`), and the Markdown output includes them.
- **Example responses are checked.** A status that isn't an HTTP status code (100–599), such as `response:2001`, fails `yaakdoc build` and warns in dev. A body that looks like JSON but doesn't parse warns.
- **Logo.** `branding.logo.showTitle: false` hides the title next to the logo, and Kiseki shows the logo at `branding.logo.height` (at most 40 px).
- **Fewer dependencies.** Kiseki depends on the three Radix packages it uses instead of the `radix-ui` umbrella package.
- **Dev servers listen on 127.0.0.1 by default**, instead of `localhost`, which Node can resolve to the IPv6 loopback only. Browsers that can't reach it, such as Windows with WSL's mirrored networking, timed out.
- **One version.** `@yaakdoc/next` depends on the exact same `yaakdoc` version and includes its `yaakdoc` CLI.
