import { useSite } from "./context";
import { toAbsoluteUrl } from "./site-url";

/**
 * Data for "Copy page/section" actions, or `null` when they are disabled (or there is no Markdown
 * twin). `absoluteUrl` is `null` when the public site URL isn't configured.
 */
export function usePageActions(markdownUrl: string | null) {
  const site = useSite();

  if (!markdownUrl || !site.llms.enabled || !site.llms.copyButton) {
    return null;
  }

  return { markdownUrl, absoluteUrl: toAbsoluteUrl(site, markdownUrl), openIn: site.llms.openIn };
}

/** Name and export URL for the "Run in Yaak" button, or `null` when it is disabled. */
export function useRunInYaak() {
  const site = useSite();

  if (!site.runInYaak) {
    return null;
  }

  const { name, dataUrl } = site.runInYaak;
  return { name, dataUrl: toAbsoluteUrl(site, dataUrl) ?? dataUrl };
}
