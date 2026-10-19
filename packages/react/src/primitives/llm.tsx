import { usePageActions } from "../hooks";
import { CopyButton } from "../islands/copy";
import { LLM_PROVIDERS, OpenInLink } from "../islands/llm";
import { overridable } from "../overrides";

/**
 * "Copy page" actions: copy as Markdown, view as Markdown, open in ChatGPT/Claude. Uses a native
 * `<details>` menu, so it works without JavaScript (except copying).
 */
/** Label of a copy action for an item at heading `level`: the page itself (1) or a section. */
export const copyActionLabel = (level: number) => (level <= 1 ? "Copy page" : "Copy section");

export const PageActions = overridable(
  "PageActions",
  function PageActions({
    markdownUrl,
    label = "Copy page",
    className,
  }: {
    markdownUrl: string | null;
    /** "Copy page" for the page itself, "Copy section" for sections within a page. */
    label?: string;
    className?: string;
  }) {
    const actions = usePageActions(markdownUrl);
    if (!actions) {
      return null;
    }

    const absolute = actions.absoluteUrl ?? actions.markdownUrl;

    return (
      <div data-yd="page-actions" className={className}>
        <CopyButton url={actions.markdownUrl} label={label} copiedLabel="Copied!" />

        <details data-yd="page-actions-menu">
          <summary aria-label="More page actions">⋯</summary>

          <ul>
            <li>
              <a href={actions.markdownUrl} target="_blank" rel="noopener" data-yd="view-markdown">
                View as Markdown
              </a>
            </li>

            {actions.openIn.map((provider) => (
              <li key={provider}>
                <OpenInLink
                  provider={provider}
                  markdownUrl={absolute}
                  label={`Open in ${LLM_PROVIDERS[provider].label}`}
                />
              </li>
            ))}
          </ul>
        </details>
      </div>
    );
  },
);
