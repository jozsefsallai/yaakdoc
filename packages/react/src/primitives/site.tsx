import type { CSSProperties } from "react";
import { useSite } from "../context";
import { useRunInYaak } from "../hooks";
import { RunInYaakLink } from "../islands/run-in-yaak";
import { overridable } from "../overrides";
import type { SiteData } from "../types";
import { Html } from "./basic";

/**
 * Site logo (light/dark variants) linking to the docs home, falling back to the title. The title is
 * shown next to it unless `showTitle` (or `branding.logo.showTitle`) is `false`. A configured height
 * is exposed as `--yd-logo-height` for themes to size the logo with.
 */
export const Logo = overridable(
  "Logo",
  function Logo({ className, showTitle }: { className?: string; showTitle?: boolean }) {
    const site = useSite();

    const logo = site.logo;
    const href = logo?.href ?? site.base;
    const size = { width: logo?.width, height: logo?.height };
    const hasImage = Boolean(logo?.light || logo?.dark);
    const title = !hasImage || (showTitle ?? logo?.showTitle ?? true);

    return (
      <a
        href={href}
        data-yd="logo"
        className={className}
        style={
          logo?.height ? ({ "--yd-logo-height": `${logo.height}px` } as CSSProperties) : undefined
        }
      >
        {logo?.light ? (
          <img
            src={logo.light}
            alt={logo.alt}
            data-yd-logo={logo.dark ? "light" : "both"}
            {...size}
          />
        ) : null}

        {logo?.dark ? (
          <img
            src={logo.dark}
            alt={logo.alt}
            data-yd-logo={logo.light ? "dark" : "both"}
            {...size}
          />
        ) : null}

        {title ? <span data-yd="site-title">{site.title}</span> : null}
      </a>
    );
  },
);

/** Header links from `branding.links`. */
export const SiteLinks = overridable(
  "SiteLinks",
  function SiteLinks({ className }: { className?: string }) {
    const site = useSite();

    if (site.links.length === 0) {
      return null;
    }

    return (
      <ul data-yd="site-links" className={className}>
        {site.links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              data-icon={link.icon}
              {...(/^https?:/.test(link.href) ? { target: "_blank", rel: "noopener" } : {})}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    );
  },
);

/** Footer text from `branding.footer` plus an llms.txt link. */
export const Footer = overridable("Footer", function Footer({ className }: { className?: string }) {
  const site = useSite();

  return (
    <footer data-yd="footer" className={className}>
      {site.footerHtml ? <Html html={site.footerHtml} data-yd="footer-text" /> : null}

      {site.llms.txtUrl ? (
        <a href={site.llms.txtUrl} data-yd="llms-link">
          llms.txt
        </a>
      ) : null}
    </footer>
  );
});

const declarations = (vars: Record<string, string | undefined>) =>
  Object.entries(vars)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}:${value!.replace(/[;{}<]/g, "")}`)
    .join(";");

/**
 * Branding as CSS custom properties on :root:
 * `--yd-color-primary`, `--yd-color-accent`, `--yd-color-background`, `--yd-color-foreground`,
 * `--yd-font-sans`, `--yd-font-mono` (with per-mode overrides under `[data-theme]`).
 */
export function brandingCss(site: Pick<SiteData, "colors" | "fonts">): string {
  const { colors, fonts } = site;

  const base = declarations({
    "--yd-color-primary": colors.primary,
    "--yd-color-accent": colors.accent,
    "--yd-font-sans": fonts.sans,
    "--yd-font-mono": fonts.mono,
  });

  const mode = (c: SiteData["colors"]["light"]) =>
    declarations({
      "--yd-color-primary": c?.primary,
      "--yd-color-accent": c?.accent,
      "--yd-color-background": c?.background,
      "--yd-color-foreground": c?.foreground,
    });

  const light = mode(colors.light);
  const dark = mode(colors.dark);

  return [
    base && `:root{${base}}`,
    light && `:root[data-theme="light"]{${light}}`,
    dark &&
      `:root[data-theme="dark"]{${dark}}@media (prefers-color-scheme:dark){:root:not([data-theme]){${dark}}}`,
  ]
    .filter(Boolean)
    .join("");
}

export function BrandingStyles() {
  const css = brandingCss(useSite());
  return css ? <style data-yd="branding" dangerouslySetInnerHTML={{ __html: css }} /> : null;
}

/**
 * "Run in Yaak" link for the site's shareable export (renders nothing unless `runInYaak` is enabled
 * in the config).
 */
export const RunInYaak = overridable(
  "RunInYaak",
  function RunInYaak({ badge, className }: { badge?: boolean; className?: string }) {
    const runInYaak = useRunInYaak();
    if (!runInYaak) {
      return null;
    }

    return (
      <RunInYaakLink
        name={runInYaak.name}
        dataUrl={runInYaak.dataUrl}
        {...(badge ? { badge } : {})}
        {...(className ? { className } : {})}
      />
    );
  },
);
