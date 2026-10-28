import type { NavigationItem, NavigationTab, TreeNode } from "@yaakdoc/core";
import { useActiveTab, useDocument, useNavigation, usePage } from "../context";
import { overridable } from "../overrides";
import { MethodBadge } from "./basic";

export type NavTreeProps = {
  nodes?: TreeNode[];
  className?: string;
  /** Folders deeper than this are collapsed by default (unless they contain the current page). */
  openDepth?: number;
};

/**
 * Navigation tree. Folders use native `<details>` (collapsible without JavaScript). Items carry
 * `data-yd-nav-item` / `data-yd-nav-folder` for the `NavFilter` island, and the current page link
 * gets `aria-current="page"`.
 */
export const NavTree = overridable(
  "NavTree",
  function NavTree({ nodes, className, openDepth = 1 }: NavTreeProps) {
    const document = useDocument();
    const page = usePage();

    const activeAncestors = new Set(
      page.id
        ? (
            document.requests[page.id]?.breadcrumbs ??
            document.folders[page.id]?.breadcrumbs ??
            []
          ).map((b) => b.id)
        : [],
    );

    if (page.id) {
      activeAncestors.add(page.id);
    }

    const renderNodes = (items: TreeNode[], depth: number) => (
      <ul data-yd="nav-list" data-depth={depth}>
        {items.map((node) => {
          if (node.type === "request") {
            const request = document.requests[node.id];
            if (!request) {
              return null;
            }

            return (
              <li key={node.id} data-yd-nav-item data-yd-nav-label={request.name}>
                <a
                  href={request.href}
                  data-yd="nav-link"
                  aria-current={page.id === node.id ? "page" : undefined}
                >
                  <MethodBadge request={request} />
                  <span data-yd="nav-label">{request.name}</span>
                </a>
              </li>
            );
          }

          const folder = document.folders[node.id];
          if (!folder) {
            return null;
          }

          return (
            <li key={node.id} data-yd-nav-folder data-yd-nav-label={folder.name}>
              <details open={depth < openDepth || activeAncestors.has(node.id) || undefined}>
                <summary data-yd="nav-folder">
                  <span data-yd="nav-label">{folder.name}</span>
                </summary>

                {renderNodes(node.children, depth + 1)}
              </details>
            </li>
          );
        })}
      </ul>
    );

    return (
      <nav data-yd="nav" aria-label="API reference" className={className}>
        {renderNodes(nodes ?? document.tree, 0)}
      </nav>
    );
  },
);

/** Breadcrumb trail of the current request/folder. */
export const Breadcrumbs = overridable(
  "Breadcrumbs",
  function Breadcrumbs({ id, className }: { id: string; className?: string }) {
    const document = useDocument();

    const item = document.requests[id] ?? document.folders[id];
    if (!item || item.breadcrumbs.length === 0) {
      return null;
    }

    return (
      <nav aria-label="Breadcrumb" data-yd="breadcrumbs" className={className}>
        <ol>
          {item.breadcrumbs.map((crumb) => (
            <li key={crumb.id}>
              <a href={document.folders[crumb.id]?.href}>{crumb.name}</a>
            </li>
          ))}
        </ol>
      </nav>
    );
  },
);

/** Icon of a page, group or tab (`icon` in front matter or the navigation). Renders nothing by default. */
export const NavIcon = overridable(
  "NavIcon",
  function NavIcon(_props: { name: string; className?: string }) {
    return null;
  },
);

const containsPage = (items: readonly NavigationItem[], id: string | null): boolean =>
  items.some(
    (item) =>
      (item.type === "page" && item.id === id) ||
      (item.type === "group" && containsPage(item.items, id)),
  );

export type NavigationProps = {
  /** Tab to render (default: the current page's tab). */
  tab?: NavigationTab;
  className?: string;
  /** `openDepth` of the API reference's {@link NavTree}. */
  openDepth?: number;
};

/**
 * Sidebar navigation of a tab: groups (top-level ones as titled sections, nested ones as
 * collapsible `<details>`), pages, and the API reference as a {@link NavTree}.
 */
export const Navigation = overridable(
  "Navigation",
  function Navigation({ tab, className, openDepth }: NavigationProps) {
    const document = useDocument();
    const page = usePage();
    const active = useActiveTab();

    const current = page.kind === "page" ? page.id : null;

    const renderItems = (items: readonly NavigationItem[], depth: number) => (
      <ul data-yd="nav-list" data-depth={depth}>
        {items.map((item, index) => {
          if (item.type === "api") {
            return (
              <li key="api" data-yd-nav-api>
                <NavTree {...(openDepth !== undefined ? { openDepth } : {})} />
              </li>
            );
          }

          if (item.type === "page") {
            const target = document.pages[item.id];
            if (!target) {
              return null;
            }

            const label = target.sidebarTitle ?? target.title;

            return (
              <li key={item.id} data-yd-nav-item data-yd-nav-label={label}>
                <a
                  href={target.href}
                  data-yd="nav-link"
                  data-type="page"
                  aria-current={current === item.id ? "page" : undefined}
                >
                  {target.icon ? <NavIcon name={target.icon} /> : null}
                  <span data-yd="nav-label">{label}</span>
                </a>
              </li>
            );
          }

          const title = (
            <>
              {item.icon ? <NavIcon name={item.icon} /> : null}
              <span data-yd="nav-label">{item.title}</span>
            </>
          );

          return depth === 0 ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: groups have no ids; order is static
            <li key={index} data-yd-nav-group data-yd-nav-label={item.title}>
              <p data-yd="nav-group-title">{title}</p>
              {renderItems(item.items, depth + 1)}
            </li>
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: groups have no ids; order is static
            <li key={index} data-yd-nav-folder data-yd-nav-label={item.title}>
              <details open={item.expanded || containsPage(item.items, current) || undefined}>
                <summary data-yd="nav-folder">{title}</summary>
                {renderItems(item.items, depth + 1)}
              </details>
            </li>
          );
        })}
      </ul>
    );

    return (
      <nav data-yd="navigation" aria-label="Documentation" className={className}>
        {renderItems((tab ?? active).items, 0)}
      </nav>
    );
  },
);

/** Links to the navigation tabs (renders nothing with a single tab). */
export const NavTabs = overridable(
  "NavTabs",
  function NavTabs({ className }: { className?: string }) {
    const { tabs } = useNavigation();
    const active = useActiveTab();

    if (tabs.length < 2) {
      return null;
    }

    return (
      <nav data-yd="nav-tabs" aria-label="Sections" className={className}>
        <ul>
          {tabs.map((tab) => (
            <li key={tab.id}>
              <a
                href={tab.href}
                data-yd="nav-tab"
                aria-current={tab.id === active.id ? "page" : undefined}
              >
                {tab.icon ? <NavIcon name={tab.icon} /> : null}
                <span>{tab.title}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  },
);
