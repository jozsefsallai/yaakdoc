import { absoluteUrl } from "@yaakdoc/core";
import type { SiteData } from "./types";

/**
 * Absolute URL of a site path (one starting with `/`, including the base) when the public site
 * URL is configured; `null` otherwise (or for URLs that aren't site paths).
 */
export function toAbsoluteUrl(site: Pick<SiteData, "url" | "base">, path: string): string | null {
  return site.url && path.startsWith("/") ? absoluteUrl(site.url, site.base, path) : null;
}
