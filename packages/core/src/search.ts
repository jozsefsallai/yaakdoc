import { flattenNavigation } from "./navigation";
import { walkTree } from "./tree";
import type { PreparedDocument, SearchEntry } from "./types";
import { methodLabel } from "./util";

/**
 * The search index of a prepared document: titles and descriptions of the pages (in navigation
 * order, hidden pages excluded), folders and requests.
 */
export function buildSearchIndex(document: PreparedDocument): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const seen = new Set<string>();

  let apiSection = "API Reference";

  for (const { target, tab, groups } of flattenNavigation(document.navigation)) {
    const section = [tab.title, ...groups].filter(Boolean).join(" › ");

    if (target.type === "api") {
      apiSection = section || apiSection;
      continue;
    }

    const page = document.pages[target.id];

    if (!page || page.hidden || seen.has(page.id)) {
      continue;
    }

    seen.add(page.id);

    entries.push({
      title: page.title,
      description: page.summary,
      href: page.href,
      kind: "page",
      section,
    });
  }

  for (const { node } of walkTree(document.tree)) {
    const item = node.type === "folder" ? document.folders[node.id] : document.requests[node.id];

    if (!item) {
      continue;
    }

    const section = [apiSection, ...item.breadcrumbs.map((crumb) => crumb.name)].join(" › ");

    entries.push({
      title: item.name,
      description: item.summary,
      href: item.href,
      kind: node.type,
      ...("kind" in item ? { method: methodLabel(item) } : {}),
      section,
    });
  }

  return entries;
}
