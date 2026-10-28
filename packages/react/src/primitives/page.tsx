import { usePageDoc, usePageNeighbors } from "../context";
import { overridable } from "../overrides";
import { Markdown } from "./basic";
import { Heading } from "./heading";
import { PageActions } from "./llm";

export type PageDocProps = { id: string; className?: string };

/**
 * A custom Markdown page: title, description, actions and the body. Parts of the body that use
 * variables come once per environment, wrapped in `[data-yd-env]` (shown by the environment
 * switcher).
 */
export const PageDoc = overridable("PageDoc", function PageDoc({ id, className }: PageDocProps) {
  const page = usePageDoc(id);

  return (
    <article data-yd="page" className={className}>
      <header data-yd="page-header">
        <Heading level={1}>{page.title}</Heading>
        {page.description ? <p data-yd="page-description">{page.description}</p> : null}
        <PageActions markdownUrl={page.markdownUrl} />
      </header>

      <Markdown html={page.html} />

      <PageNav id={id} />
    </article>
  );
});

/** Links to the previous and next pages in the navigation. */
export const PageNav = overridable(
  "PageNav",
  function PageNav({ id, className }: { id: string; className?: string }) {
    const { previous, next } = usePageNeighbors(id);

    if (!previous && !next) {
      return null;
    }

    return (
      <nav data-yd="page-nav" aria-label="Pages" className={className}>
        {previous ? (
          <a href={previous.href} rel="prev" data-yd="page-nav-previous">
            {previous.title}
          </a>
        ) : null}

        {next ? (
          <a href={next.href} rel="next" data-yd="page-nav-next">
            {next.title}
          </a>
        ) : null}
      </nav>
    );
  },
);
