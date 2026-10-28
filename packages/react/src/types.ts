import type { Branding, HeadTag, ResolvedConfig } from "@yaakdoc/config";
import type { EnvironmentRef, PreparedDocument } from "@yaakdoc/core";
import type { ComponentType, ReactNode } from "react";

export type ColorMode = "light" | "dark";
export type ColorModePreference = Branding["defaultColorMode"];
export type SiteColors = NonNullable<Branding["colors"]>;
export type ModeColors = NonNullable<SiteColors["light"]>;
export type SiteFonts = NonNullable<Branding["fonts"]>;
export type LlmProvider = ResolvedConfig["llms"]["openIn"][number];
export type { HeadTag };
/** An environment readers can switch to. */
export type EnvironmentOption = EnvironmentRef;

/** Logo with local paths resolved to public URLs. */
export type SiteLogo = {
  light?: string;
  dark?: string;
  alt: string;
  href: string;
  width?: number;
  height?: number;
};

/** Site-wide, serializable data derived from the yaakdoc config and the export. */
export type SiteData = {
  title: string;
  description: string;
  /** Absolute public URL of the deployed site, if configured. */
  url: string | null;
  /** Base path, always with leading and trailing slash. */
  base: string;
  pages: ResolvedConfig["pages"];
  logo: SiteLogo | null;
  favicon: string | null;
  colors: SiteColors;
  fonts: SiteFonts;
  links: Branding["links"];
  /** Footer rendered from Markdown. */
  footerHtml: string | null;
  defaultColorMode: ColorModePreference;
  colorModeToggle: boolean;
  llms: ResolvedConfig["llms"] & {
    /** URL of llms.txt, when enabled. */
    txtUrl: string | null;
    fullTxtUrl: string | null;
  };
  showVariables: boolean;
  /** URL of the search index (`SearchEntry[]` as JSON), when search is enabled. */
  searchUrl: string | null;
  /** "Run in Yaak" button, when enabled. */
  runInYaak: {
    name: string;
    /** URL of the importable export (may be relative to the site when `url` is unknown). */
    dataUrl: string;
  } | null;
  head: HeadTag[];
  themeOptions: Record<string, unknown>;
  /** e.g. "yaakdoc 1.0.0" */
  generator: string;
};

/** `index` is the API reference overview; `page` a custom Markdown page. */
export type PageKind = "index" | "page" | "folder" | "request" | "not-found";

export type PageData = {
  kind: PageKind;
  /** Page, folder or request id for `page` / `folder` / `request` pages. */
  id: string | null;
  /** Route path, e.g. `/` or `/docs/products/get-a-product/`. */
  path: string;
  /** Document title (without the site title suffix). */
  title: string;
  description: string;
  /** Markdown twin of this page, if any. */
  markdownUrl: string | null;
};

export type Assets = {
  styles: string[];
  scripts: string[];
  /** Inline styles (dev mode). `id` is used for HMR (`data-vite-dev-id`). */
  inlineStyles: Array<{ id: string; css: string }>;
  modulePreloads: string[];
  /** Font files to preload (`<link rel="preload" as="font">`), with the role they play. */
  fontPreloads?: FontPreload[];
};

export type FontPreload = { href: string; role: "sans" | "mono" };

export type LayoutProps = { page: PageData };

// biome-ignore lint/suspicious/noExplicitAny: components have arbitrary props
export type ThemeComponents = Partial<Record<string, ComponentType<any>>>;

/** Runtime part of a theme (rendered by the SSR entry). */
export type ThemeRuntime = {
  Layout: ComponentType<LayoutProps>;
  /** Overrides for base components (by component name, e.g. `MethodBadge`). */
  components?: ThemeComponents;
  /** Extra elements rendered in <head>. */
  Head?: ComponentType<{ page: PageData }>;
};

export type RenderContext = {
  document: PreparedDocument;
  site: SiteData;
  page: PageData;
  children?: ReactNode;
};
