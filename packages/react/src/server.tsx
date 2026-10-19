import type { PreparedDocument } from "@yaakdoc/core";
import { renderToString } from "react-dom/server";
import { prerender } from "react-dom/static";
import { YaakdocProvider } from "./context";
import { Document } from "./document";
import { type IslandRenderer, IslandRendererContext } from "./island";
import { ComponentsProvider } from "./overrides";
import type { Assets, PageData, SiteData, ThemeRuntime } from "./types";

export type RenderPageOptions = {
  theme: ThemeRuntime;
  document: PreparedDocument;
  site: SiteData;
  page: PageData;
  assets: Assets;
};

/** Renders a full HTML page (static: no hydration of the page itself, islands hydrate separately). */
export async function renderPage({
  theme,
  document,
  site,
  page,
  assets,
}: RenderPageOptions): Promise<string> {
  const { Layout } = theme;

  let counter = 0;

  const islandRenderer: IslandRenderer = {
    render: (island, identifierPrefix) => renderToString(island, { identifierPrefix }),
    next: () => `i${(counter++).toString(36)}-`,
  };

  const element = (
    <IslandRendererContext value={islandRenderer}>
      <YaakdocProvider document={document} site={site} page={page}>
        <ComponentsProvider components={theme.components}>
          <Document site={site} page={page} assets={assets} ThemeHead={theme.Head}>
            <Layout page={page} />
          </Document>
        </ComponentsProvider>
      </YaakdocProvider>
    </IslandRendererContext>
  );

  const { prelude } = await prerender(element, {
    onError(error) {
      console.error("[yaakdoc] Render error:", error);
    },
  });

  const html = await new Response(prelude).text();
  return html.startsWith("<!DOCTYPE") ? html : `<!DOCTYPE html>${html}`;
}

export { Document, type DocumentProps } from "./document";
