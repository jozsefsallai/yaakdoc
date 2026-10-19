import type { CodeExample, PreparedRequest } from "@yaakdoc/core";
import { CopyButton } from "../islands/copy";
import { TabList, tabGroupIds, tabPanelProps, visibleTabPanelSelector } from "../islands/tabs";
import { overridable } from "../overrides";
import { Html } from "./basic";
import { EnvironmentVariants } from "./environment";

export type CodeBlockProps = {
  /** Pre-highlighted HTML (a Shiki `<pre>`). */
  html: string;
  /** Unique id; used by the copy button to find the code. */
  id: string;
  language?: string;
  title?: string;
  copy?: boolean;
  className?: string;
};

export const CodeBlock = overridable(
  "CodeBlock",
  function CodeBlock({ html, id, language, title, copy = true, className }: CodeBlockProps) {
    return (
      <figure data-yd="code-block" data-language={language} className={className}>
        {title || copy ? (
          <figcaption data-yd="code-block-header">
            {title ? <span data-yd="code-block-title">{title}</span> : null}
            {copy ? <CopyButton target={`#${id} pre`} label="Copy" /> : null}
          </figcaption>
        ) : null}

        <Html html={html} id={id} data-yd="code" />
      </figure>
    );
  },
);

export type CodeExamplesProps = {
  request: PreparedRequest;
  className?: string;
  title?: string;
};

/** Tabbed code examples. Panels are static HTML; only the tab list hydrates. */
export const CodeExamples = overridable(
  "CodeExamples",
  function CodeExamples({ request, className, title = "Example request" }: CodeExamplesProps) {
    const examples: CodeExample[] = request.examples;
    if (examples.length === 0) {
      return null;
    }

    const group = tabGroupIds.examples(request.anchor);

    return (
      <section
        data-yd="code-examples"
        data-yd-tab-group={group}
        className={className}
        aria-label={title}
      >
        <div data-yd="code-examples-header">
          <TabList
            group={group}
            tabs={examples.map((example) => ({ id: example.id, label: example.label }))}
          />

          <CopyButton target={visibleTabPanelSelector(group)} label="Copy" />
        </div>

        <EnvironmentVariants variants={request.variants}>
          {(variant, variantIndex) =>
            variant.examples.map((example, index) => (
              <div
                key={example.id}
                {...tabPanelProps(group, example.id, {
                  selected: index === 0,
                  variant: variantIndex,
                })}
                data-language={example.language}
              >
                <Html html={example.html} data-yd="code" />
              </div>
            ))
          }
        </EnvironmentVariants>
      </section>
    );
  },
);

export type ResponseExamplesProps = {
  request: PreparedRequest;
  className?: string;
  title?: string;
};

/**
 * Example responses (from ```response / ```response:<status> blocks in the description), tabbed by
 * status. Tabs carry `data-status-class` (`2xx`, `4xx`, ...) for styling.
 */
export const ResponseExamples = overridable(
  "ResponseExamples",
  function ResponseExamples({
    request,
    className,
    title = "Example response",
  }: ResponseExamplesProps) {
    if (request.responses.length === 0) {
      return null;
    }

    const group = tabGroupIds.responses(request.anchor);

    return (
      <section
        data-yd="response-examples"
        data-yd-tab-group={group}
        className={className}
        aria-label={title}
      >
        <div data-yd="response-examples-header">
          <TabList
            group={group}
            sync={false}
            label={title}
            tabs={request.responses.map((response, index) => ({
              id: String(index),
              label: response.label,
            }))}
          />

          <CopyButton target={visibleTabPanelSelector(group)} label="Copy" />
        </div>

        {request.responses.map((response, index) => (
          <div
            key={String(index)}
            {...tabPanelProps(group, String(index), { selected: index === 0 })}
            data-status={response.status ?? undefined}
            data-status-class={statusClass(response.status)}
          >
            {response.empty ? (
              <p data-yd="empty-response">No response body</p>
            ) : (
              <Html html={response.html} data-yd="code" />
            )}
          </div>
        ))}
      </section>
    );
  },
);

/** `2xx`, `4xx`, ... or `undefined` for responses without a status. */
export const statusClass = (status: number | null) =>
  status ? `${String(status)[0]}xx` : undefined;
