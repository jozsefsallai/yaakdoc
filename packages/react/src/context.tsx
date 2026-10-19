import type { PreparedDocument, PreparedFolder, PreparedRequest } from "@yaakdoc/core";
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
