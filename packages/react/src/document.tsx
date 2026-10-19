import type { ReactNode } from "react";
import { useDocument } from "./context";
import { colorModeScript } from "./islands/color-mode";
import { environmentCss, environmentScript } from "./islands/environment";
import { BrandingStyles } from "./primitives/site";
import { toAbsoluteUrl } from "./site-url";
import type { Assets, PageData, SiteData, ThemeRuntime } from "./types";

export type DocumentProps = {
  site: SiteData;
  page: PageData;
  assets: Assets;
  ThemeHead?: ThemeRuntime["Head"];
  children: ReactNode;
};

const absolute = (site: SiteData, path: string) => toAbsoluteUrl(site, path) ?? path;

/** The HTML document shell: meta tags, color mode script, assets, branding. */
export function Document({ site, page, assets, ThemeHead, children }: DocumentProps) {
  const title =
    page.title && page.title !== site.title ? `${page.title} · ${site.title}` : site.title;
  const description = page.description || site.description;

  const environmentIds = useDocument().environments.map((env) => env.id);

  return (
    <html lang="en" data-color-mode={site.defaultColorMode} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <title>{title}</title>

        {description ? <meta name="description" content={description} /> : null}
        <meta name="generator" content={site.generator} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        {description ? <meta property="og:description" content={description} /> : null}

        {site.url ? (
          <>
            <link rel="canonical" href={absolute(site, page.path)} />
            <meta property="og:url" content={absolute(site, page.path)} />
          </>
        ) : null}

        {page.kind === "not-found" ? <meta name="robots" content="noindex" /> : null}

        <script dangerouslySetInnerHTML={{ __html: colorModeScript(site.defaultColorMode) }} />

        {environmentIds.length > 1 ? (
          <>
            <script dangerouslySetInnerHTML={{ __html: environmentScript(environmentIds) }} />

            <style
              data-yd="environments"
              dangerouslySetInnerHTML={{ __html: environmentCss(environmentIds) }}
            />
          </>
        ) : null}

        {site.favicon ? <link rel="icon" href={site.favicon} /> : null}
        {site.fonts.stylesheet ? <link rel="stylesheet" href={site.fonts.stylesheet} /> : null}
        {page.markdownUrl ? (
          <link rel="alternate" type="text/markdown" href={page.markdownUrl} title="Markdown" />
        ) : null}
        {site.llms.txtUrl ? (
          <link rel="alternate" type="text/plain" href={site.llms.txtUrl} title="llms.txt" />
        ) : null}
        {assets.modulePreloads.map((href) => (
          <link key={href} rel="modulepreload" href={href} />
        ))}
        {assets.styles.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        {assets.inlineStyles.map((style) => (
          <style
            key={style.id}
            data-vite-dev-id={style.id}
            dangerouslySetInnerHTML={{ __html: style.css }}
          />
        ))}

        <BrandingStyles />

        {ThemeHead ? <ThemeHead page={page} /> : null}

        {site.head.map(({ tag: Tag, attrs, content }) => (
          <Tag
            key={`${Tag}:${JSON.stringify(attrs)}:${content ?? ""}`}
            {...attrs}
            {...(content ? { dangerouslySetInnerHTML: { __html: content } } : {})}
          />
        ))}
      </head>

      <body>
        {children}
        {assets.scripts.map((src) => (
          <script key={src} type="module" src={src} />
        ))}
      </body>
    </html>
  );
}
