import { findFolderNode, type TreeNode } from "@yaakdoc/core";
import {
  AuthInfo,
  Content,
  copyActionLabel,
  EnvironmentVariants,
  Heading,
  type LayoutProps,
  Logo,
  Markdown,
  Navigation,
  NavTabs,
  TreeContent,
  useDocument,
  useNavigation,
  usePage,
  useSite,
  useThemeOptions,
} from "@yaakdoc/react";
import { NavFilter, ScrollSpy } from "@yaakdoc/react/islands";
import { cn } from "@/lib/utils";
import type { EditorialOptions } from "../../theme";
import {
  EnvironmentDot,
  EnvironmentMenu,
  MobileNavToggle,
  SearchButton,
  SearchCommand,
  ThemeToggle,
} from "./islands";
import { ArticleHeader, PageNav, PageSection } from "./page";
import { CopyPage, KeyValueTable, MethodBadge, RunInYaak } from "./parts";
import { RequestSection } from "./request";

const CONTENTS_ID = "editorial-sidebar";

/** The strip above the masthead: the edition (export date) and the site links. */
function Dateline() {
  const site = useSite();
  const document = useDocument();

  return (
    <div className="border-b border-border">
      <div className="mx-auto flex h-9 max-w-[96rem] items-center justify-between gap-4 px-4 font-sans text-xs text-muted-foreground sm:px-8">
        <p className="truncate">
          {document.exportedAt
            ? `Edition of ${new Date(document.exportedAt).toLocaleDateString("en", { dateStyle: "long" })}`
            : document.workspace.name}
        </p>

        <div className="flex shrink-0 items-center gap-4">
          {site.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hidden hover:text-foreground sm:block"
              {...(/^https?:/.test(link.href) ? { target: "_blank", rel: "noopener" } : {})}
            >
              {link.label}
            </a>
          ))}

          <RunInYaak className="hidden sm:block [&_img]:h-6" />
        </div>
      </div>
    </div>
  );
}

/** The masthead: the site's name, large and centered, with its description as a tagline. */
function Masthead() {
  const site = useSite();

  return (
    <div className="px-4 pt-8 pb-6 text-center sm:px-8">
      <Logo
        className={cn(
          "inline-flex items-center gap-3 text-4xl font-semibold tracking-tight sm:text-5xl",
          "[&_img]:h-(--yd-logo-height,2.5rem) [&_img]:max-h-14 [&_img]:w-auto [&_img[data-yd-logo=dark]]:hidden dark:[&_img[data-yd-logo=dark]]:block dark:[&_img[data-yd-logo=light]]:hidden",
        )}
      />

      {site.description ? (
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground italic">{site.description}</p>
      ) : null}
    </div>
  );
}

/** The sticky bar under the masthead: contents toggle, sections (tabs), environment and tools. */
function SectionBar() {
  const site = useSite();
  const document = useDocument();
  const { tabs } = useNavigation();

  return (
    <header className="sticky top-0 z-20 border-y-2 border-rule bg-background">
      <div className="mx-auto flex h-12 max-w-[96rem] items-stretch gap-3 px-4 sm:px-8">
        <div className="flex items-center xl:w-56">
          <span className="xl:hidden">
            <MobileNavToggle target={`#${CONTENTS_ID}`} />
          </span>
        </div>

        {tabs.length > 1 ? (
          <NavTabs className="ed-sections min-w-0 flex-1" />
        ) : (
          <span className="flex-1" />
        )}

        <div className="flex shrink-0 items-center justify-end gap-1 xl:w-56">
          {document.environments.length > 1 ? (
            <EnvironmentMenu
              environments={document.environments}
              defaultId={document.environments[0]!.id}
            />
          ) : document.environment ? (
            <span
              className="mr-2 hidden items-center gap-1.5 font-sans text-xs text-muted-foreground sm:inline-flex"
              title="Environment used for examples"
            >
              <EnvironmentDot color={document.environment.color} />
              {document.environment.name}
            </span>
          ) : null}

          {site.searchUrl ? <SearchButton variant="icon" /> : null}
          {site.colorModeToggle ? <ThemeToggle /> : null}
        </div>
      </div>
    </header>
  );
}

/** The contents: a column on wide screens, a drawer below. */
function Contents() {
  const options = useThemeOptions<EditorialOptions>();
  const site = useSite();

  return (
    <aside
      id={CONTENTS_ID}
      aria-label="Navigation"
      className="ed-drawer fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] overflow-y-auto overscroll-contain border-r border-border bg-background px-6 py-8 [scrollbar-width:thin] xl:sticky xl:top-12 xl:z-auto xl:h-[calc(100dvh-3rem)] xl:w-auto xl:max-w-none xl:border-r-0 xl:px-0 xl:pt-12"
    >
      <p className="ed-kicker mb-4 text-foreground">Contents</p>

      {site.searchUrl ? (
        <div className="mb-6">
          <SearchButton />
        </div>
      ) : (
        <NavFilter
          target={`#${CONTENTS_ID} [data-yd=navigation]`}
          placeholder="Filter"
          className="mb-6 h-8 w-full border-b border-rule bg-transparent font-sans text-[0.8125rem] outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />
      )}

      <Navigation className="ed-contents" openDepth={options.navOpenDepth} />
    </aside>
  );
}

function Overview() {
  const document = useDocument();
  const site = useSite();
  const page = usePage();
  const options = useThemeOptions<EditorialOptions>();

  return (
    <section id="overview" className="max-w-(--measure) pt-14 pb-10">
      <ArticleHeader
        kicker="The reference"
        title={site.title}
        // The masthead already carries the site's description.
        standfirst={null}
        markdownUrl={page.markdownUrl}
      />

      {document.workspace.descriptionHtml ? (
        <Markdown
          html={document.workspace.descriptionHtml}
          className={cn("ed-prose", options.dropCap && "ed-dropcap")}
        />
      ) : null}

      {document.workspace.auth ? (
        <>
          <h2 id="authentication-overview" className="mt-12 mb-3 text-2xl font-semibold">
            Authentication
          </h2>

          <AuthInfo
            auth={document.workspace.auth}
            className="text-[1.0625rem] leading-relaxed text-muted-foreground [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.8em] [&_code]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground"
          />
        </>
      ) : null}

      {site.showVariables && document.variables.length > 0 ? (
        <>
          <h2 id="variables" className="mt-12 mb-4 text-2xl font-semibold">
            Variables
            {document.environment ? (
              <span className="ml-3 font-normal text-muted-foreground italic">
                in {document.environment.name}
              </span>
            ) : null}
          </h2>

          <EnvironmentVariants variants={document.variableSets}>
            {(set) => <KeyValueTable items={set.variables} />}
          </EnvironmentVariants>
        </>
      ) : null}
    </section>
  );
}

function FolderSection({
  id,
  level,
  nested = true,
}: {
  id: string;
  level: number;
  nested?: boolean;
}) {
  const document = useDocument();

  const folder = document.folders[id];
  if (!folder) {
    return null;
  }

  const node = findFolderNode(document.tree, id);

  return (
    <section id={folder.anchor} data-yd-section className="scroll-mt-(--header-offset)">
      <div
        className={cn(
          "max-w-(--measure)",
          level === 1 ? "pt-14" : "pt-16",
          level === 2 && "border-t-4 border-double border-rule",
        )}
      >
        <p className="ed-kicker mb-3">
          {folder.breadcrumbs.length > 0
            ? folder.breadcrumbs.map((crumb) => crumb.name).join(" · ")
            : "Section"}
        </p>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <Heading
            level={level}
            className={cn(
              "font-semibold tracking-tight text-balance",
              level <= 2 ? "text-4xl" : "text-3xl",
            )}
          >
            <a href={`#${folder.anchor}`} className="hover:text-primary">
              {folder.name}
            </a>
          </Heading>

          <CopyPage markdownUrl={folder.markdownUrl} label={copyActionLabel(level)} />
        </div>

        {folder.descriptionHtml ? (
          <Markdown html={folder.descriptionHtml} className="ed-prose mt-5" />
        ) : null}
      </div>

      {nested && node ? <TreeContent nodes={node.children} level={level + 1} /> : null}
    </section>
  );
}

/** A folder's contents, set like a table of contents. */
function ChildLinks({ nodes }: { nodes: TreeNode[] }) {
  const document = useDocument();

  return (
    <nav aria-label="In this section" className="mt-10 max-w-(--measure)">
      <p className="ed-kicker mb-3 border-b border-rule pb-2">In this section</p>

      <ol className="divide-y divide-border">
        {nodes.map((node) => {
          const folder = node.type === "folder" ? document.folders[node.id] : null;
          const request = node.type === "request" ? document.requests[node.id] : null;
          const item = folder ?? request;

          if (!item) {
            return null;
          }

          return (
            <li key={node.id}>
              <a href={item.href} className="group flex items-baseline gap-3 py-3">
                {request ? <MethodBadge request={request} /> : null}
                <span className="text-lg font-semibold group-hover:text-primary">{item.name}</span>
                {item.summary ? (
                  <span className="hidden truncate text-muted-foreground italic sm:inline">
                    {item.summary}
                  </span>
                ) : null}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function NotFound() {
  const site = useSite();

  return (
    <section className="max-w-(--measure) py-24">
      <p className="ed-kicker text-primary">Erratum · 404</p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight">This page doesn’t exist</h1>

      <p className="mt-5 text-xl text-muted-foreground italic">
        It may have been renamed or removed from the workspace.{" "}
        <a href={site.base} className="text-primary not-italic underline underline-offset-4">
          Return to the front page
        </a>
        .
      </p>
    </section>
  );
}

/**
 * Editorial's versions of the base content components. yaakdoc's `<Content>` decides what a page
 * shows (everything, a folder, a request, a 404); these overrides decide how it looks.
 */
export const contentComponents = {
  Overview,
  PageDoc: PageSection,
  PageNav,
  FolderDoc: FolderSection,
  RequestDoc: RequestSection,
  ChildLinks,
  NotFound,
};

/** The footer, as a colophon. */
function Colophon() {
  const site = useSite();
  const document = useDocument();

  return (
    <footer className="mt-20 mb-10 max-w-(--measure) border-t-2 border-rule pt-4 text-sm text-muted-foreground">
      <p className="ed-kicker mb-2 text-foreground">Colophon</p>

      {site.footerHtml ? (
        <Markdown html={site.footerHtml} className="[&_a]:underline [&_a]:underline-offset-4" />
      ) : (
        <p>{document.workspace.name}.</p>
      )}

      <p className="mt-2 italic">
        Built with yaakdoc
        {site.llms.txtUrl ? (
          <>
            {" "}
            · also in{" "}
            <a href={site.llms.txtUrl} className="not-italic underline underline-offset-4">
              llms.txt
            </a>
          </>
        ) : null}
        .
      </p>
    </footer>
  );
}

export function Layout({ page }: LayoutProps) {
  const options = useThemeOptions<EditorialOptions>();
  const site = useSite();

  return (
    <div
      className="min-h-dvh [--header-height:3rem]"
      style={
        {
          "--measure": options.measure,
          "--header-offset": "calc(var(--header-height) + 1.5rem)",
        } as React.CSSProperties
      }
    >
      <a
        href="#content"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 font-sans text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <Dateline />
      <Masthead />
      <SectionBar />

      <div className="mx-auto max-w-[96rem] px-4 sm:px-8 xl:grid xl:grid-cols-[14rem_minmax(0,1fr)] xl:gap-16">
        <Contents />

        <div className="ed-article min-w-0">
          <Content />
          <Colophon />
        </div>
      </div>

      {page.kind === "index" ? <ScrollSpy target={`#${CONTENTS_ID}`} /> : null}

      {site.searchUrl ? <SearchCommand url={site.searchUrl} /> : null}
    </div>
  );
}
