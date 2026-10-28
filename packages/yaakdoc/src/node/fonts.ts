import { escapeRegExp } from "@yaakdoc/core";
import type { FontPreload } from "@yaakdoc/react";
import type { ResolvedTheme } from "./theme";

const CSS_URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

/** URLs referenced with `url(...)` in stylesheets (e.g. the dev server's inlined CSS). */
export function cssUrls(css: readonly string[]): string[] {
  return css.flatMap((text) => [...text.matchAll(CSS_URL_RE)].map((match) => match[2]!));
}

/**
 * The theme's fonts to preload, found among `candidates` (emitted files or CSS URLs). A font file
 * name matches as is, or with Vite's content hash (`geist-latin.woff2` → `geist-latin-AbC12_-x.woff2`).
 */
export function findFontPreloads(
  candidates: readonly string[],
  fonts: ResolvedTheme["preloadFonts"],
): FontPreload[] {
  const preloads: FontPreload[] = [];
  const seen = new Set<string>();

  for (const role of ["sans", "mono"] as const) {
    for (const name of fonts[role] ?? []) {
      const dot = name.lastIndexOf(".");
      const stem = escapeRegExp(dot === -1 ? name : name.slice(0, dot));
      const extension = escapeRegExp(dot === -1 ? "" : name.slice(dot));
      const pattern = new RegExp(`(^|/)${stem}(-[\\w-]{8})?${extension}$`);

      const href = candidates.find((candidate) => pattern.test(candidate.split(/[?#]/)[0]!));

      if (href && !seen.has(href)) {
        seen.add(href);
        preloads.push({ href, role });
      }
    }
  }

  return preloads;
}
