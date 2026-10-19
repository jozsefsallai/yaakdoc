import { useEffect, useState } from "react";
import { createIsland } from "../island";
import { resolveUrl } from "./browser";

/** Official "Run in Yaak" badge image. */
export const RUN_IN_YAAK_BADGE = "https://yaak.app/static/button.svg";

/** Link that opens Yaak and prompts to import the export/spec at `dataUrl` (must be absolute). */
export function runInYaakUrl(name: string, dataUrl: string): string {
  return `https://yaak.app/button/run?${new URLSearchParams({ name, url: dataUrl })}`;
}

/**
 * "Run in Yaak" link for an export URL. Relative URLs (sites without a configured public URL) are
 * made absolute on the client, after hydration.
 */
export function useRunInYaakHref(name: string, dataUrl: string): string {
  const [href, setHref] = useState(() => runInYaakUrl(name, dataUrl));

  useEffect(() => {
    setHref(runInYaakUrl(name, resolveUrl(dataUrl)));
  }, [name, dataUrl]);

  return href;
}

export type RunInYaakLinkProps = {
  name: string;
  dataUrl: string;
  /** Render the official badge image instead of text. */
  badge?: boolean;
  label?: string;
  className?: string;
};

function RunInYaakLinkImpl({
  name,
  dataUrl,
  badge = false,
  label = "Run in Yaak",
  className,
}: RunInYaakLinkProps) {
  const href = useRunInYaakHref(name, dataUrl);

  return (
    <a href={href} data-yd="run-in-yaak" className={className} target="_blank" rel="noopener">
      {badge ? <img src={RUN_IN_YAAK_BADGE} alt={label} height={32} /> : label}
    </a>
  );
}

/** Unstyled "Run in Yaak" link (or the official badge with `badge`). */
export const RunInYaakLink = createIsland("yd:run-in-yaak", RunInYaakLinkImpl);
