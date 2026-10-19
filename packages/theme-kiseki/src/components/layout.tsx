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
  NavTree,
  TreeContent,
  useDocument,
  usePage,
  useSite,
  useThemeOptions,
} from "@yaakdoc/react";
import { NavFilter, ScrollSpy } from "@yaakdoc/react/islands";
import { cn } from "@/lib/utils";
import type { KisekiOptions } from "../../theme";
import { EnvironmentDot, EnvironmentMenu, MobileNavToggle, ThemeToggle } from "./islands";
import { CopyPage, KeyValueTable, RunInYaak } from "./parts";
import { RequestSection } from "./request";

const SIDEBAR_ID = "kiseki-sidebar";

function Brand({ className }: { className?: string }) {
  return (
    <Logo
      className={cn(
        "flex min-w-0 items-center gap-2.5 text-[0.9375rem] font-semibold tracking-tight [&_[data-yd=site-title]]:truncate",
        "[&_img]:h-6 [&_img]:w-auto [&_img[data-yd-logo=dark]]:hidden dark:[&_img[data-yd-logo=dark]]:block dark:[&_img[data-yd-logo=light]]:hidden",
        className,
      )}
    />
  );
}

function Sidebar() {
  const options = useThemeOptions<KisekiOptions>();
  return (
    <aside
      id={SIDEBAR_ID}
      aria-label="Navigation"
      className="kiseki-sidebar fixed inset-y-0 left-0 z-40 flex w-(--sidebar-width) max-w-[85vw] flex-col border-r bg-sidebar"
    >
      <div className="flex h-14 shrink-0 items-center px-4">
        <Brand />
      </div>

      <div className="px-3 pb-3">
        <NavFilter
          target={`#${SIDEBAR_ID} [data-yd=nav]`}
          placeholder="Filter requests"
          className="h-8 w-full rounded-md border bg-background px-2.5 text-[0.8125rem] shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-8 [scrollbar-width:thin]">
        <NavTree className="kiseki-nav" openDepth={options.navOpenDepth} />
      </div>
    </aside>
  );
}

function TopBar() {
  const site = useSite();
  const document = useDocument();
  const options = useThemeOptions<KisekiOptions>();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:px-6">
      <MobileNavToggle target={`#${SIDEBAR_ID}`} />

      <Brand className="lg:hidden" />

      <div className="ml-auto flex items-center gap-1">
        <RunInYaak className="mr-2 hidden sm:block" />

        {options.showEnvironment && document.environments.length > 1 ? (
          <EnvironmentMenu
            environments={document.environments}
            defaultId={document.environments[0]!.id}
          />
        ) : options.showEnvironment && document.environment ? (
          <span
            className="mr-2 hidden items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground sm:inline-flex"
            title="Environment used for examples"
          >
            <EnvironmentDot color={document.environment.color} />
            {document.environment.name}
          </span>
        ) : null}

        {site.links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="hidden rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:block"
            {...(/^https?:/.test(link.href) ? { target: "_blank", rel: "noopener" } : {})}
          >
            {link.label}
          </a>
        ))}

        {site.colorModeToggle ? <ThemeToggle /> : null}
      </div>
    </header>
  );
}

function Overview() {
  const document = useDocument();
  const site = useSite();
  const page = usePage();

  return (
    <section id="overview" className="pt-12 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {site.title}
        </h1>

        <CopyPage markdownUrl={page.markdownUrl} className="pt-1.5" />
      </div>

      {site.description && !document.workspace.descriptionHtml ? (
        <p className="mt-4 max-w-[60ch] text-lg text-muted-foreground">{site.description}</p>
      ) : null}

      {document.workspace.descriptionHtml ? (
        <Markdown html={document.workspace.descriptionHtml} className="kiseki-prose mt-6" />
      ) : null}

      {document.workspace.auth ? (
        <div className="mt-10">
          <h2 id="authentication-overview" className="mb-3 text-lg font-semibold tracking-tight">
            Authentication
          </h2>

          <AuthInfo
            auth={document.workspace.auth}
            className="text-sm text-muted-foreground [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-foreground [&_strong]:font-medium [&_strong]:text-foreground"
          />
        </div>
      ) : null}

      {site.showVariables && document.variables.length > 0 ? (
        <div className="mt-10 max-w-3xl">
          <h2 id="variables" className="mb-3 text-lg font-semibold tracking-tight">
            Variables
            {document.environment ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {document.environment.name}
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
    <section id={folder.anchor} data-yd-section className="scroll-mt-16">
      <div
        className={cn(
          level === 1 ? "pt-12" : "pt-14",
          level === 2 && "border-t-2 border-foreground/80",
        )}
      >
        {folder.breadcrumbs.length > 0 ? (
          <p className="mb-1 text-xs text-muted-foreground">
            {folder.breadcrumbs.map((crumb) => crumb.name).join(" / ")}
          </p>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <Heading
            level={level}
            className={cn("font-semibold tracking-tight", level <= 2 ? "text-2xl" : "text-xl")}
          >
            <a
              href={`#${folder.anchor}`}
              className="hover:underline hover:decoration-border hover:underline-offset-4"
            >
              {folder.name}
            </a>
          </Heading>

          <CopyPage markdownUrl={folder.markdownUrl} label={copyActionLabel(level)} />
        </div>

        {folder.descriptionHtml ? (
          <Markdown html={folder.descriptionHtml} className="kiseki-prose mt-4" />
        ) : null}
      </div>

      {nested && node ? <TreeContent nodes={node.children} level={level + 1} /> : null}
    </section>
  );
}

function ChildLinks({ nodes }: { nodes: TreeNode[] }) {
  const document = useDocument();

  return (
    <ul className="mt-8 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2">
      {nodes.map((node) => {
        const item =
          node.type === "folder" ? document.folders[node.id] : document.requests[node.id];

        if (!item) {
          return null;
        }

        return (
          <li key={node.id} className="bg-background">
            <a href={item.href} className="block h-full p-4 transition-colors hover:bg-accent">
              <span className="font-medium">{item.name}</span>

              {item.summary ? (
                <span className="mt-1 block text-sm text-muted-foreground">{item.summary}</span>
              ) : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function NotFound() {
  const site = useSite();

  return (
    <section className="py-24">
      <p className="font-mono text-sm text-muted-foreground">404</p>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">This page doesn’t exist</h1>

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
 * Kiseki's versions of the base content components. yaakdoc's `<Content>` decides what a page shows
 * (everything, a folder, a request, a 404); these overrides decide how it looks.
 */
export const contentComponents = {
  Overview,
  FolderDoc: FolderSection,
  RequestDoc: RequestSection,
  ChildLinks,
  NotFound,
};

function SiteFooter() {
  const site = useSite();
  const document = useDocument();

  return (
    <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t py-8 text-sm text-muted-foreground">
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

      <p className="flex items-center gap-4">
        {site.llms.txtUrl ? (
          <a href={site.llms.txtUrl} className="hover:text-foreground">
            llms.txt
          </a>
        ) : null}

        <span>Built with yaakdoc</span>
      </p>
    </footer>
  );
}

export function Layout({ page }: LayoutProps) {
  const options = useThemeOptions<KisekiOptions>();

  return (
    <div
      className="min-h-dvh"
      style={{ "--sidebar-width": options.sidebarWidth } as React.CSSProperties}
    >
      <a
        href="#content"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <Sidebar />

      <div className="lg:pl-(--sidebar-width)">
        <TopBar />

        <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-10">
          <Content />
          <SiteFooter />
        </div>
      </div>

      {page.kind === "index" ? <ScrollSpy target={`#${SIDEBAR_ID}`} /> : null}
    </div>
  );
}
