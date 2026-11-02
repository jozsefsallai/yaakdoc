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
import type { BlueprintOptions } from "../../theme";
import {
  EnvironmentDot,
  EnvironmentMenu,
  MobileNavToggle,
  SearchButton,
  SearchCommand,
  ThemeToggle,
} from "./islands";
import { PageNav, PageSection, useSheet } from "./page";
import { CopyPage, KeyValueTable, MethodBadge, RunInYaak } from "./parts";
import { RequestSection, SubHeading } from "./request";

const SIDEBAR_ID = "blueprint-sidebar";

function Brand({ className }: { className?: string }) {
  return (
    <Logo
      className={cn(
        "flex min-w-0 items-center gap-2.5 text-[0.9375rem] font-semibold tracking-tight [&_[data-yd=site-title]]:truncate",
        "[&_img]:h-(--yd-logo-height,1.5rem) [&_img]:max-h-10 [&_img]:w-auto [&_img[data-yd-logo=dark]]:hidden dark:[&_img[data-yd-logo=dark]]:block dark:[&_img[data-yd-logo=light]]:hidden",
        className,
      )}
    />
  );
}

/** A cell of the title block: a small label over a value. */
function Cell({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("flex flex-col justify-center border-l border-border-strong px-4", className)}
    >
      <span className="bp-label">{label}</span>
      <span className="text-sm font-medium whitespace-nowrap">{children}</span>
    </div>
  );
}

function Sidebar() {
  const options = useThemeOptions<BlueprintOptions>();
  const site = useSite();

  return (
    <aside
      id={SIDEBAR_ID}
      aria-label="Navigation"
      className="bp-sidebar fixed inset-y-0 left-0 z-40 flex w-(--sidebar-width) max-w-[85vw] flex-col border-r-2 border-border-strong bg-sidebar"
    >
      <div className="flex h-14 shrink-0 items-center border-b-2 border-border-strong px-4">
        <Brand />
      </div>

      <div className="px-3 pt-3 pb-2">
        {site.searchUrl ? (
          <SearchButton />
        ) : (
          <NavFilter
            target={`#${SIDEBAR_ID} [data-yd=navigation]`}
            placeholder="Filter"
            className="h-8 w-full border bg-background px-2.5 text-[0.8125rem] outline-none placeholder:text-muted-foreground focus-visible:border-primary [&::-webkit-search-cancel-button]:hidden"
          />
        )}
      </div>

      <p className="bp-label px-5 pt-2 pb-2">Sheet index</p>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-8 [scrollbar-width:thin]">
        <Navigation className="bp-nav" openDepth={options.navOpenDepth} />
      </div>
    </aside>
  );
}

/** The header, drawn as a drawing's title block: tabs, environment, sheet number and mode. */
function TitleBlock() {
  const site = useSite();
  const document = useDocument();
  const sheet = useSheet();

  return (
    <header className="sticky top-0 z-20 border-b-2 border-border-strong bg-background">
      <div className="flex h-14 items-stretch">
        <div className="flex items-center gap-2 px-4 lg:hidden">
          <MobileNavToggle target={`#${SIDEBAR_ID}`} />
          <Brand />
        </div>

        {/* Wide screens: tabs in the header row. */}
        <NavTabs className="bp-tabs hidden min-w-0 lg:block" />

        <div className="ml-auto flex shrink-0 items-stretch">
          <RunInYaak className="hidden items-center px-4 sm:flex" />

          {site.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hidden items-center border-l border-border px-4 font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase hover:bg-accent hover:text-foreground xl:flex"
              {...(/^https?:/.test(link.href) ? { target: "_blank", rel: "noopener" } : {})}
            >
              {link.label}
            </a>
          ))}

          {document.environments.length > 1 ? (
            <div className="hidden border-l border-border-strong sm:block">
              <EnvironmentMenu
                environments={document.environments}
                defaultId={document.environments[0]!.id}
              />
            </div>
          ) : document.environment ? (
            <Cell label="Environment" className="hidden sm:flex">
              <span className="flex items-center gap-1.5">
                <EnvironmentDot color={document.environment.color} />
                {document.environment.name}
              </span>
            </Cell>
          ) : null}

          {sheet ? (
            <Cell label="Sheet" className="hidden md:flex">
              <span className="font-mono">
                {String(sheet.number).padStart(2, "0")} / {String(sheet.total).padStart(2, "0")}
              </span>
            </Cell>
          ) : null}

          <div className="flex items-center gap-1 border-l border-border-strong px-2">
            {site.searchUrl ? (
              <span className="lg:hidden">
                <SearchButton variant="icon" />
              </span>
            ) : null}

            {site.colorModeToggle ? <ThemeToggle /> : null}
          </div>
        </div>
      </div>

      {/* Small screens: the header row is full, so tabs get a row of their own. */}
      <NavTabs className="bp-tabs h-10 border-t border-border lg:hidden" />
    </header>
  );
}

function Overview() {
  const document = useDocument();
  const site = useSite();
  const page = usePage();

  return (
    <section id="overview" className="pt-12 pb-10">
      <header className="border-b-2 border-border-strong pb-6">
        <p className="bp-label mb-3">General arrangement</p>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {site.title}
          </h1>

          <CopyPage markdownUrl={page.markdownUrl} className="pt-1.5" />
        </div>

        {site.description && !document.workspace.descriptionHtml ? (
          <p className="mt-4 max-w-[60ch] text-lg text-muted-foreground">{site.description}</p>
        ) : null}
      </header>

      {document.workspace.descriptionHtml ? (
        <>
          <SubHeading>General notes</SubHeading>
          <Markdown html={document.workspace.descriptionHtml} className="bp-prose" />
        </>
      ) : null}

      {document.workspace.auth ? (
        <>
          <SubHeading>
            <span id="authentication-overview">Authentication</span>
          </SubHeading>

          <AuthInfo
            auth={document.workspace.auth}
            className="text-sm text-muted-foreground [&_code]:border [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground"
          />
        </>
      ) : null}

      {site.showVariables && document.variables.length > 0 ? (
        <div className="max-w-3xl">
          <SubHeading>
            <span id="variables">
              Variables
              {document.environment ? ` · ${document.environment.name}` : ""}
            </span>
          </SubHeading>

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
      <div
        className={cn(
          level === 1 ? "pt-12" : "pt-14",
          level === 2 && "border-t-2 border-border-strong",
        )}
      >
        <p className="bp-label mb-2">
          Section
          {folder.breadcrumbs.length > 0
            ? ` · ${folder.breadcrumbs.map((crumb) => crumb.name).join(" / ")}`
            : ""}
        </p>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <Heading
            level={level}
            className={cn("font-semibold tracking-tight", level <= 2 ? "text-2xl" : "text-xl")}
          >
            <a href={`#${folder.anchor}`} className="hover:underline hover:underline-offset-4">
              {folder.name}
            </a>
          </Heading>

          <CopyPage markdownUrl={folder.markdownUrl} label={copyActionLabel(level)} />
        </div>

        {folder.descriptionHtml ? (
          <Markdown html={folder.descriptionHtml} className="bp-prose mt-4" />
        ) : null}
      </div>

      {nested && node ? <TreeContent nodes={node.children} level={level + 1} /> : null}
    </section>
  );
}

/** A folder's contents as a numbered list of drawings. */
function ChildLinks({ nodes }: { nodes: TreeNode[] }) {
  const document = useDocument();
  const head =
    "border border-border-strong bg-muted/70 px-3 py-1.5 text-left font-mono text-[0.6875rem] font-medium tracking-[0.12em] uppercase";

  return (
    <div className="mt-8 overflow-x-auto">
      <table className="w-full border-collapse border border-border-strong text-sm">
        <thead>
          <tr>
            <th className={cn(head, "w-12 text-center")}>No.</th>
            <th className={head}>Title</th>
            <th className={cn(head, "hidden sm:table-cell")}>Description</th>
          </tr>
        </thead>

        <tbody>
          {nodes.map((node, index) => {
            const folder = node.type === "folder" ? document.folders[node.id] : null;
            const request = node.type === "request" ? document.requests[node.id] : null;
            const item = folder ?? request;

            if (!item) {
              return null;
            }

            return (
              <tr key={node.id} className="hover:bg-accent">
                <td className="border px-3 py-2 text-center font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </td>

                <td className="border px-3 py-2">
                  <a
                    href={item.href}
                    className="flex items-center gap-2 font-medium hover:underline"
                  >
                    {request ? <MethodBadge request={request} /> : null}
                    {item.name}
                  </a>
                </td>

                <td className="hidden border px-3 py-2 text-muted-foreground sm:table-cell">
                  {item.summary ?? ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NotFound() {
  const site = useSite();

  return (
    <section className="py-24">
      <p
        aria-hidden="true"
        className="font-mono text-8xl font-medium text-transparent [-webkit-text-stroke:1.5px_var(--border-strong)]"
      >
        404
      </p>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Sheet not found</h1>

      <p className="mt-4 text-muted-foreground">
        It may have been renamed or removed from the workspace.{" "}
        <a href={site.base} className="font-medium text-primary underline underline-offset-4">
          Go to the overview
        </a>
      </p>
    </section>
  );
}

/**
 * Blueprint's versions of the base content components. yaakdoc's `<Content>` decides what a page
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

/** The footer, as the bottom strip of a drawing's border. */
function SiteFooter() {
  const site = useSite();
  const document = useDocument();

  return (
    <footer className="mt-16 mb-8 flex flex-wrap items-stretch border-2 border-border-strong bg-background text-sm text-muted-foreground">
      <div className="min-w-0 flex-1 px-4 py-3">
        {site.footerHtml ? (
          <Markdown html={site.footerHtml} className="[&_a]:underline [&_a]:underline-offset-4" />
        ) : (
          <p>
            {document.workspace.name}
            {document.exportedAt
              ? ` · exported ${new Date(document.exportedAt).toLocaleDateString("en", { dateStyle: "medium" })}`
              : ""}
          </p>
        )}
      </div>

      {site.llms.txtUrl ? (
        <a
          href={site.llms.txtUrl}
          className="flex items-center border-l border-border-strong px-4 font-mono text-xs hover:bg-accent hover:text-foreground"
        >
          llms.txt
        </a>
      ) : null}

      <p className="bp-label flex items-center border-l border-border-strong px-4">
        Drawn with yaakdoc
      </p>
    </footer>
  );
}

export function Layout({ page }: LayoutProps) {
  const options = useThemeOptions<BlueprintOptions>();
  const site = useSite();
  const { tabs } = useNavigation();

  return (
    <div
      className={cn(
        "min-h-dvh [--header-height:3.5rem]",
        // Tabs take a second header row on small screens.
        tabs.length > 1 && "max-lg:[--header-height:6rem]",
      )}
      style={
        {
          "--sidebar-width": options.sidebarWidth,
          "--header-offset": "calc(var(--header-height) + 1rem)",
        } as React.CSSProperties
      }
    >
      <a
        href="#content"
        className="sr-only z-50 bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <Sidebar />

      <div className={cn("min-h-dvh lg:pl-(--sidebar-width)", options.grid && "bp-grid")}>
        <TitleBlock />

        <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-10">
          <Content />
          <SiteFooter />
        </div>
      </div>

      {page.kind === "index" ? <ScrollSpy target={`#${SIDEBAR_ID}`} /> : null}

      {site.searchUrl ? <SearchCommand url={site.searchUrl} /> : null}
    </div>
  );
}
