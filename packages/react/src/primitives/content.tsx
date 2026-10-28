import { findFolderNode, type TreeNode } from "@yaakdoc/core";
import type { ReactNode } from "react";
import { useDocument, usePage, useSite } from "../context";
import { overridable } from "../overrides";
import { AuthInfo, KeyValueTable, Markdown } from "./basic";
import { EnvironmentSelect, EnvironmentVariants } from "./environment";
import { clampHeadingLevel, Heading } from "./heading";
import { copyActionLabel, PageActions } from "./llm";
import { PageDoc } from "./page";
import { RequestDoc } from "./request";
import { RunInYaak } from "./site";

export type FolderDocProps = {
  id: string;
  level?: number;
  /** Also render the folder's contents (requests and sub folders). */
  nested?: boolean;
  className?: string;
};

/** A folder section: title, description, inherited auth, then (optionally) its contents. */
export const FolderDoc = overridable(
  "FolderDoc",
  function FolderDoc({ id, level = 2, nested = true, className }: FolderDocProps) {
    const document = useDocument();

    const folder = document.folders[id];
    if (!folder) {
      return null;
    }

    const node = findFolderNode(document.tree, id);

    return (
      <section id={folder.anchor} data-yd="folder" data-yd-section className={className}>
        <header data-yd="folder-header">
          <Heading level={level}>
            <a href={`#${folder.anchor}`} data-yd="anchor">
              {folder.name}
            </a>
          </Heading>

          <PageActions markdownUrl={folder.markdownUrl} label={copyActionLabel(level)} />
        </header>

        <Markdown html={folder.descriptionHtml} />

        {nested && node ? <TreeContent nodes={node.children} level={level + 1} /> : null}
      </section>
    );
  },
);

/** Renders a list of tree nodes as documentation sections, recursively. */
export const TreeContent = overridable(
  "TreeContent",
  function TreeContent({ nodes, level = 2 }: { nodes: TreeNode[]; level?: number }) {
    const document = useDocument();

    return (
      <>
        {nodes.map((node) =>
          node.type === "folder" ? (
            <FolderDoc key={node.id} id={node.id} level={level} />
          ) : document.requests[node.id] ? (
            <RequestDoc
              key={node.id}
              request={document.requests[node.id]!}
              level={clampHeadingLevel(level)}
            />
          ) : null,
        )}
      </>
    );
  },
);

/** Overview of the workspace: description, authentication and variables. */
export const Overview = overridable(
  "Overview",
  function Overview({ className, level = 1 }: { className?: string; level?: number }) {
    const document = useDocument();
    const site = useSite();
    const page = usePage();

    return (
      <section id="overview" data-yd="overview" className={className}>
        <header data-yd="overview-header">
          <Heading level={level}>{site.title}</Heading>
          <RunInYaak />
          <PageActions markdownUrl={page.kind === "index" ? page.markdownUrl : null} />
        </header>

        <Markdown html={document.workspace.descriptionHtml} />

        {document.workspace.auth ? (
          <>
            <Heading level={level + 1} id="authentication-overview">
              Authentication
            </Heading>

            <AuthInfo auth={document.workspace.auth} />
          </>
        ) : null}

        <Variables level={level + 1} />
      </section>
    );
  },
);

/** Environment variables table (secrets redacted). */
export const Variables = overridable(
  "Variables",
  function Variables({ level = 2, className }: { level?: number; className?: string }) {
    const document = useDocument();
    const site = useSite();

    if (!site.showVariables || document.variables.length === 0) {
      return null;
    }

    return (
      <div data-yd="variables" className={className}>
        <Heading level={level} id="variables">
          Variables
          {document.environments.length > 1 ? (
            <>
              {" "}
              <EnvironmentSelect />
            </>
          ) : document.environment ? (
            <>
              {" "}
              <span
                data-yd="environment"
                style={
                  document.environment.color ? { color: document.environment.color } : undefined
                }
              >
                {document.environment.name}
              </span>
            </>
          ) : null}
        </Heading>

        <EnvironmentVariants variants={document.variableSets}>
          {(set) => <KeyValueTable items={set.variables} />}
        </EnvironmentVariants>
      </div>
    );
  },
);

/**
 * The main content for the current page: a custom page, the API reference (everything in
 * single-page mode), a folder, a request, or a not-found message. Themes can use this or compose the pieces themselves.
 */
export const Content = overridable(
  "Content",
  function Content({ className }: { className?: string }) {
    const document = useDocument();
    const site = useSite();
    const page = usePage();

    let content: ReactNode;

    if (page.kind === "page" && page.id && document.pages[page.id]) {
      content = <PageDoc id={page.id} />;
    } else if (page.kind === "request" && page.id && document.requests[page.id]) {
      content = <RequestDoc request={document.requests[page.id]!} level={1} />;
    } else if (page.kind === "folder" && page.id) {
      content = <FolderDoc id={page.id} level={1} nested={false} />;

      const node = findFolderNode(document.tree, page.id);

      content = (
        <>
          {content}
          {node ? <ChildLinks nodes={node.children} /> : null}
        </>
      );
    } else if (page.kind === "not-found") {
      content = <NotFound />;
    } else {
      content = (
        <>
          <Overview />
          {site.pages === "single" ? (
            <TreeContent nodes={document.tree} level={2} />
          ) : (
            <ChildLinks nodes={document.tree} />
          )}
        </>
      );
    }

    return (
      <main id="content" data-yd="content" data-page={page.kind} className={className}>
        {content}
      </main>
    );
  },
);

/** Content of the 404 page. */
export const NotFound = overridable(
  "NotFound",
  function NotFound({ className }: { className?: string }) {
    const site = useSite();

    return (
      <section data-yd="not-found" className={className}>
        <h1>Page not found</h1>
        <p>
          <a href={site.base}>Back to the documentation</a>
        </p>
      </section>
    );
  },
);

/** List of links to child folders/requests (per-request pages mode). */
export const ChildLinks = overridable(
  "ChildLinks",
  function ChildLinks({ nodes, className }: { nodes: TreeNode[]; className?: string }) {
    const document = useDocument();

    return (
      <ul data-yd="child-links" className={className}>
        {nodes.map((node) => {
          const item =
            node.type === "folder" ? document.folders[node.id] : document.requests[node.id];

          if (!item) {
            return null;
          }

          return (
            <li key={node.id} data-type={node.type}>
              <a href={item.href}>{item.name}</a>
              {item.summary ? <p>{item.summary}</p> : null}
            </li>
          );
        })}
      </ul>
    );
  },
);
