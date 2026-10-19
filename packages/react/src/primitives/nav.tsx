import type { TreeNode } from "@yaakdoc/core";
import { useDocument, usePage } from "../context";
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
