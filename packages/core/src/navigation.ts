import { pageId, titleFromPath } from "./pages";
import { createUniqueSlugger, slugify } from "./slug";
import type { Navigation, NavigationItem, NavigationTab, PageDoc } from "./types";

/*
 * The navigation as configured. Defined structurally so that core stays
 * independent of `@yaakdoc/config`, whose schema output matches these types.
 */

/** A page path, a group, or `{ api: true }` (the Yaak folders and requests). */
export type NavigationInputItem = string | NavigationInputGroup | { api: boolean };

export type NavigationInputGroup = {
  group: string;
  icon?: string | undefined;
  expanded?: boolean | undefined;
  pages?: NavigationInputItem[] | undefined;
  /** Adds the Yaak folders and requests after the group's pages. */
  api?: boolean | undefined;
};

export type NavigationInputTab = {
  tab: string;
  icon?: string | undefined;
  pages?: NavigationInputItem[] | undefined;
  groups?: NavigationInputGroup[] | undefined;
  /** Adds the Yaak folders and requests after the tab's pages and groups. */
  api?: boolean | undefined;
};

export type NavigationInput = {
  tabs?: NavigationInputTab[] | undefined;
  groups?: NavigationInputGroup[] | undefined;
  pages?: NavigationInputItem[] | undefined;
};

export type NavigationTarget = { type: "page"; id: string } | { type: "api" };

export type ResolveNavigationOptions = {
  /** URL of a page, or of the API reference. */
  href: (target: NavigationTarget) => string;
  /** Title of the group/tab the API reference is added to when the navigation doesn't place it. */
  apiTitle?: string;
};

export class NavigationError extends Error {
  override name = "NavigationError";
}

const API: NavigationItem = { type: "api" };

/**
 * Resolves the configured navigation (or, without one, a navigation generated from the pages'
 * directories) into tabs of groups, pages and the API reference. The API reference is always
 * included: when the navigation doesn't place it, it's appended as a last group (or tab).
 */
export function resolveNavigation(
  input: NavigationInput | undefined,
  pages: readonly PageDoc[],
  options: ResolveNavigationOptions,
): Navigation {
  const apiTitle = options.apiTitle ?? "API Reference";
  const byId = new Map(pages.map((page) => [page.id, page]));

  let apiCount = 0;

  const page = (ref: string): NavigationItem => {
    const id = pageId(ref);
    const match = byId.get(id) ?? byId.get(id ? `${id}/index` : "index");

    if (!match) {
      const available = [...byId.keys()].map((key) => `"${key}"`).join(", ") || "none";
      throw new NavigationError(
        `The navigation references the page "${ref}", which doesn't exist. Available pages: ${available}.`,
      );
    }

    return { type: "page", id: match.id };
  };

  const api = (): NavigationItem => {
    apiCount++;
    return API;
  };

  const items = (entries: readonly NavigationInputItem[] | undefined): NavigationItem[] =>
    (entries ?? []).map((entry) => {
      if (typeof entry === "string") {
        return page(entry);
      }

      if ("group" in entry) {
        return group(entry);
      }

      if (entry.api) {
        return api();
      }

      throw new NavigationError("Invalid navigation entry: `api` must be `true`.");
    });

  const group = (entry: NavigationInputGroup): NavigationItem => ({
    type: "group",
    title: entry.group,
    icon: entry.icon ?? null,
    expanded: entry.expanded ?? true,
    items: [...items(entry.pages), ...(entry.api ? [api()] : [])],
  });

  let tabs: Array<Omit<NavigationTab, "id" | "href">>;

  if (input?.tabs?.length) {
    tabs = input.tabs.map((tab) => ({
      title: tab.tab,
      icon: tab.icon ?? null,
      items: [...items(tab.pages), ...(tab.groups ?? []).map(group), ...(tab.api ? [api()] : [])],
    }));
  } else {
    const resolved = input
      ? [...items(input.pages), ...(input.groups ?? []).map(group)]
      : autoNavigation(pages);

    tabs = [{ title: null, icon: null, items: resolved }];
  }

  if (apiCount > 1) {
    throw new NavigationError(
      "The API reference (`api: true`) can only appear once in the navigation.",
    );
  }

  if (apiCount === 0) {
    const [first] = tabs;

    if (tabs.length > 1 || first?.title) {
      tabs.push({ title: apiTitle, icon: null, items: [API] });
    } else if (first && first.items.length > 0) {
      first.items.push({
        type: "group",
        title: apiTitle,
        icon: null,
        expanded: true,
        items: [API],
      });
    } else {
      tabs = [{ title: null, icon: null, items: [API] }];
    }
  }

  const unique = createUniqueSlugger();

  return {
    tabs: tabs.map((tab) => {
      const target = firstTarget(tab.items);

      if (!target) {
        throw new NavigationError(`The navigation tab "${tab.title}" is empty.`);
      }

      return { id: unique(slugify(tab.title ?? "docs")), ...tab, href: options.href(target) };
    }),
  };
}

/** Navigation generated from the pages: directories become groups, sorted by `order` and title. */
function autoNavigation(pages: readonly PageDoc[]): NavigationItem[] {
  const visible = pages.filter((page) => !page.hidden);

  const build = (prefix: string): Array<{ item: NavigationItem; sort: [number, string] }> => {
    const entries: Array<{ item: NavigationItem; sort: [number, string] }> = [];
    const directories = new Set<string>();

    for (const page of visible) {
      if (!page.id.startsWith(prefix)) {
        continue;
      }

      const rest = page.id.slice(prefix.length);
      const slash = rest.indexOf("/");

      if (slash === -1) {
        const isIndex = rest.toLowerCase() === "index";

        entries.push({
          item: { type: "page", id: page.id },
          sort: [isIndex ? -Infinity : (page.order ?? Infinity), page.sidebarTitle ?? page.title],
        });
      } else {
        directories.add(rest.slice(0, slash));
      }
    }

    for (const directory of directories) {
      const path = `${prefix}${directory}/`;
      const index = visible.find((page) => page.id === `${path}index`);
      const children = build(path).map((entry) => entry.item);
      const title = titleFromPath(directory);

      entries.push({
        item: { type: "group", title, icon: index?.icon ?? null, expanded: true, items: children },
        sort: [index?.order ?? Infinity, title],
      });
    }

    return entries.sort((a, b) => a.sort[0] - b.sort[0] || a.sort[1].localeCompare(b.sort[1]) || 0);
  };

  return build("").map((entry) => entry.item);
}

function firstTarget(items: readonly NavigationItem[]): NavigationTarget | null {
  for (const item of items) {
    if (item.type === "group") {
      const target = firstTarget(item.items);

      if (target) {
        return target;
      }
    } else {
      return item;
    }
  }

  return null;
}

/** Depth-first iteration over navigation items, with the titles of the enclosing groups. */
export function* walkNavigation(
  items: readonly NavigationItem[],
  groups: readonly string[] = [],
): Generator<{ item: NavigationItem; groups: readonly string[] }> {
  for (const item of items) {
    yield { item, groups };

    if (item.type === "group") {
      yield* walkNavigation(item.items, [...groups, item.title]);
    }
  }
}

export type FlatNavigationEntry = {
  target: NavigationTarget;
  tab: NavigationTab;
  /** Titles of the enclosing groups, outermost first. */
  groups: readonly string[];
};

/** Pages and the API reference in navigation order (for previous/next links and llms.txt). */
export function flattenNavigation(navigation: Navigation): FlatNavigationEntry[] {
  const entries: FlatNavigationEntry[] = [];

  for (const tab of navigation.tabs) {
    for (const { item, groups } of walkNavigation(tab.items)) {
      if (item.type !== "group") {
        entries.push({ target: item, tab, groups });
      }
    }
  }

  return entries;
}

/** The tab containing a page or the API reference (the first tab when it isn't in any). */
export function findNavigationTab(navigation: Navigation, target: NavigationTarget): NavigationTab {
  const match = flattenNavigation(navigation).find(
    (entry) =>
      entry.target.type === target.type &&
      (target.type === "api" || (entry.target.type === "page" && entry.target.id === target.id)),
  );

  return match?.tab ?? navigation.tabs[0]!;
}
