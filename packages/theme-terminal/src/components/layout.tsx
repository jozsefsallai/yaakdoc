import { findFolderNode, slugify, type TreeNode } from "@yaakdoc/core";
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
  usePageNeighbors,
  useSite,
  useThemeOptions,
} from "@yaakdoc/react";
import { NavFilter, ScrollSpy } from "@yaakdoc/react/islands";
import { cn } from "@/lib/utils";
import type { TerminalOptions } from "../../theme";
import {
  EnvironmentMenu,
  KeyboardShortcuts,
  MobileNavToggle,
  SearchButton,
  SearchCommand,
  ThemeToggle,
} from "./islands";
import { Command, PageNav, PageSection, useRelativePath } from "./page";
import { CopyPage, KeyValueTable, MethodBadge, RunInYaak } from "./parts";
import { RequestSection } from "./request";

const SIDEBAR_ID = "terminal-sidebar";

/** The "host" in the prompt: the site title as a slug, e.g. `acme-store-api`. */
function useHost(): string {
  const site = useSite();
  return slugify(site.title) || "docs";
}

function Brand({ className }: { className?: string }) {
  return (
    <Logo
      className={cn(
        "flex min-w-0 items-center gap-[1ch] font-bold [&_[data-yd=site-title]]:truncate",
        "[&_img]:h-(--yd-logo-height,1.25rem) [&_img]:max-h-8 [&_img]:w-auto [&_img[data-yd-logo=dark]]:hidden dark:[&_img[data-yd-logo=dark]]:block dark:[&_img[data-yd-logo=light]]:hidden",
        className,
      )}
    />
  );
}

function Sidebar() {
  const options = useThemeOptions<TerminalOptions>();
  const site = useSite();

  return (
    <aside
      id={SIDEBAR_ID}
      aria-label="Navigation"
      className="term-sidebar fixed top-0 bottom-7 left-0 z-40 flex w-(--sidebar-width) max-w-[85vw] flex-col border-r bg-background"
    >
      <div className="flex h-12 shrink-0 items-center border-b px-4">
        <Brand />
      </div>

      <div className="px-3 py-3">
        {site.searchUrl ? (
          <SearchButton />
        ) : (
          <NavFilter
            target={`#${SIDEBAR_ID} [data-yd=navigation]`}
            placeholder="filter"
            className="h-8 w-full border border-dashed bg-background px-[1ch] text-[0.8125rem] outline-none placeholder:text-muted-foreground focus-visible:border-solid focus-visible:border-primary [&::-webkit-search-cancel-button]:hidden"
          />
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-8 [scrollbar-width:thin]">
        <Navigation className="term-nav" openDepth={options.navOpenDepth} />
      </div>
    </aside>
  );
}

/** The top bar: a shell prompt for the current page, e.g. `acme-store-api:~/products$ ▌`. */
function TopBar() {
  const site = useSite();
  const options = useThemeOptions<TerminalOptions>();
  const host = useHost();
  const path = useRelativePath();

  return (
    <header className="sticky top-0 z-20 border-b bg-background">
      <div className="flex h-12 items-center gap-[1ch] px-4 sm:px-6">
        <MobileNavToggle target={`#${SIDEBAR_ID}`} />

        <p className="min-w-0 flex-1 truncate text-[0.8125rem]" aria-hidden="true">
          <span className="font-bold text-primary">{host}</span>
          <span className="text-muted-foreground">:</span>
          <span className="text-(--method-post)">~{path ? `/${path}` : ""}</span>
          <span className="text-muted-foreground">$</span>
          {options.cursor ? <span className="term-cursor" /> : null}
        </p>

        <div className="flex shrink-0 items-center gap-[1ch]">
          <RunInYaak className="hidden sm:block" />

          {site.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hidden px-[0.5ch] text-[0.8125rem] text-muted-foreground hover:bg-accent hover:text-foreground sm:block"
              {...(/^https?:/.test(link.href) ? { target: "_blank", rel: "noopener" } : {})}
            >
              {link.label.toLowerCase()}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}

/** A tmux-like status line: session, windows (the navigation tabs), environment and mode. */
function StatusLine() {
  const site = useSite();
  const document = useDocument();
  const { tabs } = useNavigation();
  const host = useHost();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex h-7 items-stretch bg-primary text-xs text-primary-foreground">
      <span className="flex shrink-0 items-center px-[1ch] font-bold">[{host}]</span>

      {tabs.length > 1 ? (
        <NavTabs className="term-windows min-w-0 flex-1" />
      ) : (
        <span className="flex-1" />
      )}

      <div className="flex shrink-0 items-stretch">
        {document.environments.length > 1 ? (
          <EnvironmentMenu
            environments={document.environments}
            defaultId={document.environments[0]!.id}
          />
        ) : document.environment ? (
          <span className="flex items-center px-[1ch]" title="Environment used for examples">
            env:{document.environment.name}
          </span>
        ) : null}

        {site.searchUrl ? (
          <span className="hidden items-center px-[1ch] sm:flex" title="Press / to search">
            / search
          </span>
        ) : null}

        {site.colorModeToggle ? <ThemeToggle /> : null}
      </div>
    </div>
  );
}

function Overview() {
  const document = useDocument();
  const site = useSite();
  const page = usePage();

  return (
    <section id="overview" className="pt-10 pb-8">
      <Command>cat README.md</Command>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="term-h1 text-xl font-bold text-balance">{site.title}</h1>
        <CopyPage markdownUrl={page.markdownUrl} className="pt-0.5" />
      </div>

      {site.description && !document.workspace.descriptionHtml ? (
        <p className="mt-3 max-w-[80ch] text-muted-foreground">{site.description}</p>
      ) : null}

      {document.workspace.descriptionHtml ? (
        <Markdown html={document.workspace.descriptionHtml} className="term-prose mt-6" />
      ) : null}

      {document.workspace.auth ? (
        <div className="mt-8">
          <h2 id="authentication-overview" className="term-h2 mb-3 font-bold">
            Authentication
          </h2>

          <AuthInfo
            auth={document.workspace.auth}
            className="text-[0.8125rem] text-muted-foreground [&_code]:bg-muted [&_code]:px-[0.5ch] [&_code]:text-foreground [&_strong]:font-bold [&_strong]:text-foreground"
          />
        </div>
      ) : null}

      {site.showVariables && document.variables.length > 0 ? (
        <div className="mt-8 max-w-4xl">
          <h2 id="variables" className="term-h2 mb-3 font-bold">
            Variables
            {document.environment ? (
              <span className="ml-[1ch] text-xs font-normal text-muted-foreground">
                ({document.environment.name})
              </span>
            ) : null}
          </h2>

          <EnvironmentVariants variants={document.variableSets}>
            {(set) => <KeyValueTable items={set.variables} />}
          </EnvironmentVariants>
        </div>
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
      <div className={cn(level === 1 ? "pt-10" : "pt-12", level === 2 && "border-t")}>
        {folder.breadcrumbs.length > 0 ? (
          <p className="mb-1 text-xs text-muted-foreground">
            # {folder.breadcrumbs.map((crumb) => crumb.name).join(" / ")}
          </p>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <Heading
            level={level}
            className={cn("font-bold", level <= 2 ? "term-h1 text-lg" : "term-h2 text-base")}
          >
            <a href={`#${folder.anchor}`} className="hover:underline hover:underline-offset-4">
              {folder.name}
            </a>
          </Heading>

          <CopyPage markdownUrl={folder.markdownUrl} label={copyActionLabel(level)} />
        </div>

        {folder.descriptionHtml ? (
          <Markdown html={folder.descriptionHtml} className="term-prose mt-4" />
        ) : null}
      </div>

      {nested && node ? <TreeContent nodes={node.children} level={level + 1} /> : null}
    </section>
  );
}

/** A folder's contents as an `ls -l` listing. */
function ChildLinks({ nodes }: { nodes: TreeNode[] }) {
  const document = useDocument();

  return (
    <div className="mt-8 text-[0.8125rem]">
      <Command>ls -l</Command>

      <ul className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-[2ch] sm:grid-cols-[auto_auto_minmax(0,1fr)]">
        {nodes.map((node) => {
          const folder = node.type === "folder" ? document.folders[node.id] : null;
          const request = node.type === "request" ? document.requests[node.id] : null;
          const item = folder ?? request;

          if (!item) {
            return null;
          }

          return (
            <li key={node.id} className="col-span-full grid grid-cols-subgrid py-0.5">
              <span className="text-muted-foreground">{folder ? "drwxr-xr-x" : "-rw-r--r--"}</span>

              <a href={item.href} className="flex min-w-0 items-baseline gap-[1ch] hover:underline">
                {request ? <MethodBadge request={request} /> : null}
                <span className={cn("truncate", folder && "font-bold text-(--method-post)")}>
                  {item.name}
                  {folder ? "/" : ""}
                </span>
              </a>

              <span className="col-span-full truncate pl-[12ch] text-muted-foreground sm:col-span-1 sm:pl-0">
                {item.summary ?? ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NotFound() {
  const site = useSite();
  const path = useRelativePath();

  return (
    <section className="py-20 text-[0.8125rem]">
      <Command>cd ~/{path}</Command>

      <p>
        <span className="text-(--method-delete)">
          bash: cd: ~/{path}: No such file or directory
        </span>
      </p>

      <p className="mt-6 text-muted-foreground">
        It may have been renamed or removed from the workspace. Try{" "}
        <a href={site.base} className="text-primary underline underline-offset-4">
          cd ~
        </a>
        .
      </p>
    </section>
  );
}

/**
 * Terminal's versions of the base content components. yaakdoc's `<Content>` decides what a page
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

function SiteFooter() {
  const site = useSite();
  const document = useDocument();

  return (
    <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-dashed py-6 text-xs text-muted-foreground">
      {site.footerHtml ? (
        <Markdown html={site.footerHtml} className="[&_a]:underline [&_a]:underline-offset-4" />
      ) : (
        <p>
          {document.workspace.name}
          {document.exportedAt
            ? ` · exported ${new Date(document.exportedAt).toISOString().slice(0, 10)}`
            : ""}
        </p>
      )}

      <p className="flex items-center gap-[2ch]">
        {site.llms.txtUrl ? (
          <a href={site.llms.txtUrl} className="hover:text-foreground">
            llms.txt
          </a>
        ) : null}

        <span>built with yaakdoc</span>
      </p>
    </footer>
  );
}

/** Swaps the phosphor color for the `palette` option (green is the stylesheet's default). */
function PaletteStyle() {
  const { palette } = useThemeOptions<TerminalOptions>();

  return palette === "green" ? null : (
    <style>{`:root{--phosphor:var(--phosphor-${palette})}`}</style>
  );
}

/** Previous and next pages for the `[` and `]` shortcuts (custom pages and the overview). */
function useNeighborHrefs() {
  const page = usePage();
  const id = page.kind === "page" ? page.id : page.kind === "index" ? ":api" : null;
  const { previous, next } = usePageNeighbors(id ?? "");

  return id
    ? { previous: previous?.href ?? null, next: next?.href ?? null }
    : { previous: null, next: null };
}

export function Layout({ page }: LayoutProps) {
  const options = useThemeOptions<TerminalOptions>();
  const site = useSite();
  const neighbors = useNeighborHrefs();

  return (
    <div
      className="min-h-dvh pb-7 [--header-height:3rem]"
      style={
        {
          "--sidebar-width": options.sidebarWidth,
          "--header-offset": "calc(var(--header-height) + 0.5rem)",
        } as React.CSSProperties
      }
    >
      <PaletteStyle />

      <a
        href="#content"
        className="sr-only z-50 bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <Sidebar />

      <div className="lg:pl-(--sidebar-width)">
        <TopBar />

        <div className="mx-auto w-full max-w-[96rem] px-4 sm:px-6 lg:px-10">
          <Content />
          <SiteFooter />
        </div>
      </div>

      <StatusLine />

      <KeyboardShortcuts previous={neighbors.previous} next={neighbors.next} />

      {page.kind === "index" ? <ScrollSpy target={`#${SIDEBAR_ID}`} /> : null}

      {site.searchUrl ? <SearchCommand url={site.searchUrl} /> : null}
    </div>
  );
}
