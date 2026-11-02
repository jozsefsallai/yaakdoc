import { flattenNavigation } from "@yaakdoc/core";
import {
  Markdown,
  type PageDocProps,
  useDocument,
  usePage,
  usePageDoc,
  usePageNeighbors,
  useSite,
} from "@yaakdoc/react";
import { cn } from "@/lib/utils";
import { CopyPage } from "./parts";

/** Terminals have no icons: navigation icons render nothing. */
export function NavIcon(_props: { name: string; className?: string }) {
  return null;
}

/** Title of the innermost navigation group containing a page. */
function useGroupTitle(id: string): string | null {
  const { navigation } = useDocument();

  const entry = flattenNavigation(navigation).find(
    (item) => item.target.type === "page" && item.target.id === id,
  );

  return entry?.groups.at(-1) ?? entry?.tab.title ?? null;
}

/** The current page's path relative to the site root, e.g. `products/get-a-product`. */
export function useRelativePath(): string {
  const site = useSite();
  const page = usePage();
  const path = page.path.startsWith(site.base) ? page.path.slice(site.base.length) : page.path;

  return path.replace(/^\/+|\/+$/g, "");
}

/** A dimmed command line above a page's title, e.g. `$ cat guides/authentication.md`. */
export function Command({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[0.8125rem] text-muted-foreground">
      <span className="text-primary">$</span> {children}
    </p>
  );
}

export function PageSection({ id }: PageDocProps) {
  const page = usePageDoc(id);
  const group = useGroupTitle(id);
  const path = useRelativePath();

  return (
    <article className="max-w-[80ch] pt-10 pb-4">
      <header>
        <Command>cat {path ? `${path}.md` : "README.md"}</Command>

        {group ? <p className="mb-1 text-xs text-muted-foreground"># {group}</p> : null}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="term-h1 text-xl font-bold text-balance">{page.title}</h1>
          <CopyPage markdownUrl={page.markdownUrl} className="pt-0.5" />
        </div>

        {page.description ? <p className="mt-2 text-muted-foreground">{page.description}</p> : null}
      </header>

      <Markdown html={page.html} className="term-prose mt-8" />

      <PageNav id={id} />
    </article>
  );
}

export function PageNav({ id }: { id: string }) {
  const { previous, next } = usePageNeighbors(id);

  if (!previous && !next) {
    return null;
  }

  const link =
    "group flex min-w-0 flex-1 flex-col border border-dashed px-3 py-2 hover:border-solid hover:border-primary";

  return (
    <nav aria-label="Pages" className="mt-14 flex flex-wrap gap-3 text-[0.8125rem]">
      {previous ? (
        <a href={previous.href} rel="prev" className={link}>
          <span className="text-xs text-muted-foreground">
            <kbd className="text-primary">[</kbd> previous
          </span>
          <span className="truncate font-bold">{previous.title}</span>
        </a>
      ) : (
        <span className="hidden flex-1 sm:block" />
      )}

      {next ? (
        <a href={next.href} rel="next" className={cn(link, "items-end text-right")}>
          <span className="text-xs text-muted-foreground">
            next <kbd className="text-primary">]</kbd>
          </span>
          <span className="truncate font-bold">{next.title}</span>
        </a>
      ) : (
        <span className="hidden flex-1 sm:block" />
      )}
    </nav>
  );
}
