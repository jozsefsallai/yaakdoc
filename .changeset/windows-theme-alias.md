---
"yaakdoc": patch
---

Fix `@/` imports in themes on Windows. Vite's module ids use forward slashes there, so the check for whether an import came from inside the theme never matched, and themes like `yaakdoc-theme-winxp` failed to build.
