import {
  findNavigationTab,
  flattenNavigation,
  type Navigation,
  type NavigationTab,
  type PreparedDocument,
  type PreparedFolder,
  type PreparedPage,
  type PreparedRequest,
} from "@yaakdoc/core";
import { createContext, type ReactNode, use } from "react";
import type { PageData, SiteData } from "./types";

type YaakdocContextValue = {
  document: PreparedDocument;
  site: SiteData;
  page: PageData;
};

const YaakdocContext = createContext<YaakdocContextValue | null>(null);

export function YaakdocProvider({
  document,
  site,
  page,
  children,
}: YaakdocContextValue & { children: ReactNode }) {
  return <YaakdocContext value={{ document, site, page }}>{children}</YaakdocContext>;
}

function useYaakdocContext(): YaakdocContextValue {
  const value = use(YaakdocContext);

  if (!value) {
    throw new Error(
      "yaakdoc hooks must be used inside <YaakdocProvider>. Note: islands are hydrated in isolation and cannot use these hooks; pass data via props instead.",
    );
  }

  return value;
}

/** The prepared documentation (requests, folders, tree, environment...). */
export const useDocument = (): PreparedDocument => useYaakdocContext().document;
/** Site configuration and branding. */
export const useSite = (): SiteData => useYaakdocContext().site;
/** The page currently being rendered. */
export const usePage = (): PageData => useYaakdocContext().page;
/** Theme-specific options from `themeOptions` in the config. */
export const useThemeOptions = <T extends Record<string, unknown>>(): T =>
  useYaakdocContext().site.themeOptions as T;

export function useRequest(id: string): PreparedRequest {
  const request = useDocument().requests[id];
  if (!request) {
    throw new Error(`Unknown request id "${id}"`);
  }

  return request;
}

export function useFolder(id: string): PreparedFolder {
  const folder = useDocument().folders[id];
  if (!folder) {
    throw new Error(`Unknown folder id "${id}"`);
  }

  return folder;
}

export function usePageDoc(id: string): PreparedPage {
  const page = useDocument().pages[id];

  if (!page) {
    throw new Error(`Unknown page id "${id}"`);
  }

  return page;
}

/** Tabs, groups and pages of the site, with the place of the API reference. */
export const useNavigation = (): Navigation => useDocument().navigation;

/**
 * The navigation tab of the current page: the tab containing the page, or the tab of the API
 * reference for the overview, folders and requests.
 */
export function useActiveTab(): NavigationTab {
  const { navigation } = useDocument();
  const page = usePage();

  return findNavigationTab(
    navigation,
    page.kind === "page" && page.id ? { type: "page", id: page.id } : { type: "api" },
  );
}

export type PageLink = { title: string; href: string };

/** Previous and next entries (pages or the API reference) around a page, in navigation order. */
export function usePageNeighbors(id: string): { previous: PageLink | null; next: PageLink | null } {
  const document = useDocument();

  const links: Array<PageLink & { id: string }> = [];

  for (const { target } of flattenNavigation(document.navigation)) {
    const page = target.type === "page" ? document.pages[target.id] : null;

    const link =
      target.type === "api"
        ? { id: ":api", title: "API Reference", href: document.referenceBase }
        : page
          ? { id: page.id, title: page.sidebarTitle ?? page.title, href: page.href }
          : null;

    if (link && !links.some((existing) => existing.id === link.id)) {
      links.push(link);
    }
  }

  const index = links.findIndex((link) => link.id === id);

  const pick = (link: (PageLink & { id: string }) | undefined) =>
    link ? { title: link.title, href: link.href } : null;

  return index === -1
    ? { previous: null, next: null }
    : { previous: pick(links[index - 1]), next: pick(links[index + 1]) };
}
