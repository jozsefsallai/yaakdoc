import { formFieldValue, grpcMethodPath, type PreparedRequest } from "@yaakdoc/core";
import { CopyButton } from "../islands/copy";
import { overridable } from "../overrides";
import { AuthInfo, Html, KeyValueTable, Markdown, MethodBadge, RequestUrl } from "./basic";
import { CodeExamples, ResponseExamples } from "./code";
import { EnvironmentVariants } from "./environment";
import { clampHeadingLevel, Heading, type HeadingLevel } from "./heading";
import { copyActionLabel, PageActions } from "./llm";

export const RequestBody = overridable(
  "RequestBody",
  function RequestBody({ request, className }: { request: PreparedRequest; className?: string }) {
    if (request.kind !== "http") {
      if (!request.bodyHtml) {
        return null;
      }

      return (
        <Html html={request.bodyHtml} data-yd="body" data-kind="message" className={className} />
      );
    }

    const { body } = request;

    switch (body.type) {
      case "none":
        return null;
      case "form-urlencoded":
      case "multipart":
        return (
          <div data-yd="body" data-kind={body.type} className={className}>
            <KeyValueTable
              items={body.fields.map((field) => ({
                ...field,
                value: formFieldValue(field),
              }))}
              columns={["Field", "Value"]}
            />
          </div>
        );
      case "binary":
        return (
          <p data-yd="body" data-kind="binary" className={className}>
            Binary file
            {body.filePath ? (
              <>
                {" "}
                (<code>{body.filePath}</code>)
              </>
            ) : null}
          </p>
        );
      default:
        return request.bodyHtml ? (
          <div data-yd="body" data-kind={body.type} className={className}>
            {request.variablesHtml ? <span data-yd="body-label">Query</span> : null}

            <Html html={request.bodyHtml} />

            {request.variablesHtml ? (
              <>
                <span data-yd="body-label">Variables</span>

                <Html html={request.variablesHtml ?? ""} data-yd="body-variables" />
              </>
            ) : null}
          </div>
        ) : null;
    }
  },
);

const bodyContentType = (request: PreparedRequest) =>
  request.kind === "http" && request.body.type !== "none" ? request.body.contentType : null;

export type RequestDocProps = {
  request: PreparedRequest;
  /** Heading level of the request title. */
  level?: HeadingLevel;
  className?: string;
  /** Render code examples inline (default) or not at all (themes may render them elsewhere). */
  examples?: boolean;
};

/**
 * Complete documentation section for a request: title, method, URL, description, auth, parameters,
 * headers, body and code examples. Each sub-part is overridable on its own.
 */
export const RequestDoc = overridable(
  "RequestDoc",
  function RequestDoc({ request, level = 2, className, examples = true }: RequestDocProps) {
    const sub = clampHeadingLevel(level + 1);
    const headers = request.kind === "grpc" ? request.metadata : request.headers;
    const contentType = bodyContentType(request);

    return (
      <section
        id={request.anchor}
        data-yd="request"
        data-yd-section
        data-kind={request.kind}
        className={className}
      >
        <header data-yd="request-header">
          <Heading level={level}>
            <a href={`#${request.anchor}`} data-yd="anchor">
              {request.name}
            </a>
          </Heading>

          <PageActions markdownUrl={request.markdownUrl} label={copyActionLabel(level)} />
        </header>

        <div data-yd="request-line">
          <MethodBadge request={request} />

          <EnvironmentVariants variants={request.variants}>
            {(variant) => (
              <>
                <RequestUrl url={variant.url} />
                <CopyButton text={variant.resolvedUrl} label="Copy URL" />
              </>
            )}
          </EnvironmentVariants>
        </div>

        {request.kind === "grpc" && (request.service || request.method) ? (
          <p data-yd="grpc-method">
            <code>{grpcMethodPath(request)}</code>
          </p>
        ) : null}

        <Markdown html={request.descriptionHtml} />

        <Heading level={sub}>Authentication</Heading>

        <AuthInfo auth={request.auth} />

        {request.kind !== "grpc" && request.pathParameters.length > 0 ? (
          <>
            <Heading level={sub}>Path parameters</Heading>
            <KeyValueTable items={request.pathParameters} />
          </>
        ) : null}

        {request.kind !== "grpc" && request.queryParameters.length > 0 ? (
          <>
            <Heading level={sub}>Query parameters</Heading>
            <KeyValueTable items={request.queryParameters} />
          </>
        ) : null}

        {headers.length > 0 ? (
          <>
            <Heading level={sub}>{request.kind === "grpc" ? "Metadata" : "Headers"}</Heading>
            <KeyValueTable items={headers} />
          </>
        ) : null}

        {request.bodyHtml || (request.kind === "http" && request.body.type !== "none") ? (
          <>
            <Heading level={sub}>
              {request.kind === "http" ? "Body" : "Message"}
              {contentType ? (
                <>
                  {" "}
                  <code data-yd="content-type">{contentType}</code>
                </>
              ) : null}
            </Heading>

            <RequestBody request={request} />
          </>
        ) : null}

        {examples ? <CodeExamples request={request} /> : null}

        {examples ? <ResponseExamples request={request} /> : null}
      </section>
    );
  },
);
