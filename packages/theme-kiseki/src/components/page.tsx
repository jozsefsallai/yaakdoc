import { flattenNavigation } from "@yaakdoc/core";
import {
  Markdown,
  type PageDocProps,
  useDocument,
  usePageDoc,
  usePageNeighbors,
} from "@yaakdoc/react";
import * as Lucide from "lucide-react";
import { ChevronLeftIcon, ChevronRightIcon, type LucideIcon } from "lucide-react";
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
    <Icon aria-hidden="true" className={cn("size-4 shrink-0 opacity-80", className)} />
  ) : null;
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

  return (
    <article className="max-w-3xl pt-12 pb-4">
      <header>
        {group ? <p className="mb-2 text-sm font-medium text-primary">{group}</p> : null}

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

      <Markdown html={page.html} className="kiseki-prose mt-8" />

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
    "group flex min-w-0 flex-1 flex-col gap-0.5 rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-accent";

  return (
    <nav aria-label="Pages" className="mt-16 flex flex-wrap gap-4">
      {previous ? (
        <a href={previous.href} rel="prev" className={card}>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ChevronLeftIcon className="size-3.5" />
            Previous
          </span>

          <span className="truncate font-medium">{previous.title}</span>
        </a>
      ) : (
        <span className="hidden flex-1 sm:block" />
      )}

      {next ? (
        <a href={next.href} rel="next" className={cn(card, "items-end text-right")}>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            Next
            <ChevronRightIcon className="size-3.5" />
          </span>

          <span className="truncate font-medium">{next.title}</span>
        </a>
      ) : (
        <span className="hidden flex-1 sm:block" />
      )}
    </nav>
  );
}
