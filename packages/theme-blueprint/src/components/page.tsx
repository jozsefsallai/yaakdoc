import { flattenNavigation } from "@yaakdoc/core";
import {
  Markdown,
  type PageDocProps,
  useDocument,
  usePage,
  usePageDoc,
  usePageNeighbors,
} from "@yaakdoc/react";
import * as Lucide from "lucide-react";
import { ArrowLeftIcon, ArrowRightIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyPage } from "./parts";

/**
 * Lucide icon by name (`book-open`, `BookOpen`, aliases like `history` included); renders nothing
 * for unknown names. Every icon is exported with an `Icon` suffix, other exports aren't.
 */
export function NavIcon({ name, className }: { name: string; className?: string }) {
  const key = name.replace(/(?:^|[-_\s]+)([a-z0-9])/gi, (_, char: string) => char.toUpperCase());
  const Icon = (Lucide as unknown as Record<string, LucideIcon | undefined>)[`${key}Icon`];

  return Icon ? (
    <Icon aria-hidden="true" strokeWidth={1.5} className={cn("size-4 shrink-0", className)} />
  ) : null;
}

/**
 * The current page's sheet number: its position among the pages in navigation order, with the
 * whole API reference (overview, folders and requests) as one sheet. `null` when it isn't listed.
 */
export function useSheet(): { number: number; total: number } | null {
  const document = useDocument();
  const page = usePage();

  const ids: string[] = [];
  for (const { target } of flattenNavigation(document.navigation)) {
    const id = target.type === "api" ? ":api" : target.type === "page" ? target.id : null;

    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  }

  const current = page.kind === "page" ? page.id : page.kind === "not-found" ? null : ":api";
  const index = current ? ids.indexOf(current) : -1;

  return index === -1 ? null : { number: index + 1, total: ids.length };
}

/** Title of the innermost navigation group containing a page. */
function useGroupTitle(id: string): string | null {
  const { navigation } = useDocument();

  const entry = flattenNavigation(navigation).find(
    (item) => item.target.type === "page" && item.target.id === id,
  );

  return entry?.groups.at(-1) ?? entry?.tab.title ?? null;
}

export function PageSection({ id }: PageDocProps) {
  const page = usePageDoc(id);
  const group = useGroupTitle(id);
  const sheet = useSheet();

  return (
    <article className="max-w-3xl pt-12 pb-4">
      <header className="border-b-2 border-border-strong pb-6">
        <p className="bp-label mb-3 flex flex-wrap gap-x-4">
          {sheet ? (
            <span>
              Sheet {sheet.number} of {sheet.total}
            </span>
          ) : null}
          {group ? <span className="text-primary">{group}</span> : null}
        </p>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {page.title}
          </h1>

          <CopyPage markdownUrl={page.markdownUrl} className="pt-1.5" />
        </div>

        {page.description ? (
          <p className="mt-3 max-w-[60ch] text-lg text-muted-foreground">{page.description}</p>
        ) : null}
      </header>

      <Markdown html={page.html} className="bp-prose mt-8" />

      <PageNav id={id} />
    </article>
  );
}

export function PageNav({ id }: { id: string }) {
  const { previous, next } = usePageNeighbors(id);

  if (!previous && !next) {
    return null;
  }

  const card =
    "bp-corners group flex min-w-0 flex-1 flex-col gap-1 border border-dashed border-border p-4 transition-colors hover:border-solid hover:border-primary hover:bg-accent";

  return (
    <nav aria-label="Pages" className="mt-16 flex flex-wrap gap-4">
      {previous ? (
        <a href={previous.href} rel="prev" className={card}>
          <span className="bp-label flex items-center gap-1.5">
            <ArrowLeftIcon className="size-3" />
            Previous sheet
          </span>

          <span className="truncate font-medium">{previous.title}</span>
        </a>
      ) : (
        <span className="hidden flex-1 sm:block" />
      )}

      {next ? (
        <a href={next.href} rel="next" className={cn(card, "items-end text-right")}>
          <span className="bp-label flex items-center gap-1.5">
            Next sheet
            <ArrowRightIcon className="size-3" />
          </span>

          <span className="truncate font-medium">{next.title}</span>
        </a>
      ) : (
        <span className="hidden flex-1 sm:block" />
      )}
    </nav>
  );
}
