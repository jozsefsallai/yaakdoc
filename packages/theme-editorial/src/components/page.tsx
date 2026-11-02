import { flattenNavigation } from "@yaakdoc/core";
import {
  Markdown,
  type PageDocProps,
  useDocument,
  usePageDoc,
  usePageNeighbors,
} from "@yaakdoc/react";
import type { LucideIcon } from "lucide-react";
import * as Lucide from "lucide-react";
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
    <Icon aria-hidden="true" strokeWidth={1.75} className={cn("size-3.5 shrink-0", className)} />
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

/** An article's header: kicker, headline, standfirst. */
export function ArticleHeader({
  kicker,
  title,
  standfirst,
  markdownUrl,
}: {
  kicker: string | null;
  title: string;
  standfirst: string | null;
  markdownUrl: string | null;
}) {
  return (
    <header className="mb-10">
      {kicker ? <p className="ed-kicker mb-4 text-primary">{kicker}</p> : null}

      <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
        {title}
      </h1>

      {standfirst ? (
        <p className="mt-5 text-xl leading-relaxed text-muted-foreground italic">{standfirst}</p>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-4 border-y border-border py-2">
        <span className="ed-kicker" aria-hidden="true">
          ✻
        </span>
        <CopyPage markdownUrl={markdownUrl} />
      </div>
    </header>
  );
}

export function PageSection({ id }: PageDocProps) {
  const page = usePageDoc(id);
  const group = useGroupTitle(id);

  return (
    <article className="ed-article max-w-(--measure) pt-14 pb-4">
      <ArticleHeader
        kicker={group}
        title={page.title}
        standfirst={page.description || null}
        markdownUrl={page.markdownUrl}
      />

      <Markdown html={page.html} className="ed-prose" />

      <PageNav id={id} />
    </article>
  );
}

export function PageNav({ id }: { id: string }) {
  const { previous, next } = usePageNeighbors(id);

  if (!previous && !next) {
    return null;
  }

  return (
    <nav aria-label="Pages" className="mt-20 border-t-2 border-rule pt-4">
      <p className="ed-kicker mb-4">Continue reading</p>

      <div className="grid gap-6 sm:grid-cols-2">
        {previous ? (
          <a href={previous.href} rel="prev" className="group">
            <span className="ed-kicker">Previously</span>
            <span className="mt-1 block text-xl font-semibold group-hover:text-primary">
              {previous.title}
            </span>
          </a>
        ) : (
          <span className="hidden sm:block" />
        )}

        {next ? (
          <a href={next.href} rel="next" className="group sm:text-right">
            <span className="ed-kicker">Next</span>
            <span className="mt-1 block text-xl font-semibold group-hover:text-primary">
              {next.title} →
            </span>
          </a>
        ) : null}
      </div>
    </nav>
  );
}
