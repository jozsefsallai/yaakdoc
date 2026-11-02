import { formFieldValue, grpcMethodPath, methodLabel, type PreparedRequest } from "@yaakdoc/core";
import {
  AuthInfo,
  copyActionLabel,
  EnvironmentVariants,
  Heading,
  Html,
  Markdown,
  RequestUrl,
  ResponseHeaders,
  statusClass,
} from "@yaakdoc/react";
import {
  TabList,
  type TabListProps,
  tabGroupIds,
  tabPanelProps,
  visibleTabPanelSelector,
} from "@yaakdoc/react/islands";
import { cn } from "@/lib/utils";
import { CopyCode, CopyText } from "./islands";
import { CopyPage, KeyValueTable, Notes } from "./parts";

const codeBox =
  "overflow-hidden rounded-md bg-muted [&_pre]:overflow-x-auto [&_pre]:px-5 [&_pre]:py-4 [&_pre]:font-mono [&_pre]:text-[0.8125rem] [&_pre]:leading-6";

/** A run-in head: a bold, small-caps label that starts its paragraph. */
const RunIn = ({ children }: { children: React.ReactNode }) => (
  <span className="mr-2 font-sans text-[0.75rem] font-semibold tracking-[0.12em] text-foreground uppercase">
    {children}.
  </span>
);

/** A numbered figure ("Fig. 3") with tabbed panels and a caption. */
function Figure({
  kind,
  group,
  label,
  caption,
  tabs,
  sync,
  className,
  children,
}: {
  kind: "code-examples" | "response-examples";
  group: string;
  label: string;
  caption: React.ReactNode;
  tabs: TabListProps["tabs"];
  sync?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <figure
      aria-label={label}
      data-yd={kind}
      data-yd-tab-group={group}
      className={cn("ed-figure", className)}
    >
      <div className="flex items-center gap-2 border-b border-rule">
        <TabList
          group={group}
          tabs={tabs}
          label={label}
          {...(sync === false ? { sync } : {})}
          className="-mb-px flex min-w-0 flex-1 gap-5 overflow-x-auto [scrollbar-width:none]"
          tabClassName="h-9 shrink-0 border-b-2 border-transparent font-sans text-xs font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground"
        />

        <CopyCode target={visibleTabPanelSelector(group)} />
      </div>

      <div className={cn(codeBox, "mt-3")}>{children}</div>

      <figcaption className="mt-2 font-sans text-xs text-muted-foreground">
        <span className="ed-figure-number" />
        {caption}
      </figcaption>
    </figure>
  );
}

/** Tabbed code examples (one set per environment). */
export function CodeFigure({
  request,
  className,
}: {
  request: PreparedRequest;
  className?: string;
}) {
  if (request.examples.length === 0) {
    return null;
  }

  const group = tabGroupIds.examples(request.anchor);

  return (
    <Figure
      kind="code-examples"
      group={group}
      label="Example request"
      caption={<>{request.name}: an example request.</>}
      tabs={request.examples.map((example) => ({ id: example.id, label: example.label }))}
      {...(className ? { className } : {})}
    >
      <EnvironmentVariants variants={request.variants}>
        {(variant, variantIndex) =>
          variant.examples.map((example, index) => (
            <div
              key={example.id}
              {...tabPanelProps(group, example.id, {
                selected: index === 0,
                variant: variantIndex,
              })}
              className="max-h-[32rem] overflow-auto"
            >
              <Html html={example.html} />
            </div>
          ))
        }
      </EnvironmentVariants>
    </Figure>
  );
}

const STATUS_METHOD: Record<string, string> = {
  "2xx": "get",
  "3xx": "post",
  "4xx": "put",
  "5xx": "delete",
};

/** Example responses from ```response:<status> blocks, tabbed by status. */
export function ResponseFigure({
  request,
  className,
}: {
  request: PreparedRequest;
  className?: string;
}) {
  if (request.responses.length === 0) {
    return null;
  }

  const group = tabGroupIds.responses(request.anchor);

  return (
    <Figure
      kind="response-examples"
      group={group}
      label="Example response"
      caption={<>{request.name}: example responses, by status.</>}
      sync={false}
      tabs={request.responses.map((response, index) => ({
        id: String(index),
        label: response.label,
      }))}
      {...(className ? { className } : {})}
    >
      {request.responses.map((response, index) => (
        <div
          key={String(index)}
          {...tabPanelProps(group, String(index), { selected: index === 0 })}
          data-status={response.status ?? undefined}
          className="max-h-[28rem] overflow-auto"
        >
          {response.status ? (
            <p
              data-method={STATUS_METHOD[statusClass(response.status) ?? ""] ?? "other"}
              className="px-5 pt-4 font-sans text-xs font-semibold tracking-[0.12em] text-(--method) uppercase"
            >
              {response.status} {response.statusText}
            </p>
          ) : null}

          <ResponseHeaders
            headers={response.headers}
            className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 border-b border-border px-5 py-3 font-mono text-xs [&>div]:contents [&_dt]:text-muted-foreground [&_dd]:break-all"
          />

          {response.empty ? (
            <p className="px-5 py-4 text-sm text-muted-foreground italic">No response body.</p>
          ) : (
            <Html html={response.html} />
          )}
        </div>
      ))}
    </Figure>
  );
}

function Body({ request }: { request: PreparedRequest }) {
  if (request.kind === "http") {
    const { body } = request;
    if (body.type === "none") {
      return null;
    }

    return (
      <div className="mt-8">
        <p className="mb-3 text-[1.0625rem]">
          <RunIn>Body</RunIn>
          {body.contentType ? (
            <code className="font-mono text-sm text-muted-foreground">{body.contentType}</code>
          ) : null}
        </p>

        {body.type === "form-urlencoded" || body.type === "multipart" ? (
          <KeyValueTable
            columns={["Field", "Value"]}
            items={body.fields.map((field) => ({
              ...field,
              value: formFieldValue(field),
            }))}
          />
        ) : body.type === "binary" ? (
          <p className="text-muted-foreground italic">
            A binary file{body.filePath ? `: ${body.filePath}` : ""}.
          </p>
        ) : request.bodyHtml ? (
          <div className={codeBox}>
            <Html html={request.bodyHtml} />

            {request.variablesHtml ? (
              <div className="border-t border-border">
                <p className="ed-kicker px-5 pt-3">Variables</p>
                <Html html={request.variablesHtml ?? ""} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (!request.bodyHtml) {
    return null;
  }

  return (
    <div className="mt-8">
      <p className="mb-3">
        <RunIn>Message</RunIn>
      </p>

      <div className={codeBox}>
        <Html html={request.bodyHtml} />
      </div>
    </div>
  );
}

export function RequestSection({
  request,
  level = 3,
}: {
  request: PreparedRequest;
  level?: number;
}) {
  const headers = request.kind === "grpc" ? request.metadata : request.headers;
  const hasNotes =
    headers.length > 0 ||
    (request.kind !== "grpc" &&
      (request.pathParameters.length > 0 || request.queryParameters.length > 0));

  return (
    <section
      id={request.anchor}
      data-yd-section
      data-yd="request"
      className="scroll-mt-(--header-offset) border-t border-border py-14 first:border-t-0 2xl:grid 2xl:grid-cols-[minmax(0,var(--measure))_16rem] 2xl:gap-x-14"
    >
      <div className="max-w-(--measure) min-w-0">
        {request.breadcrumbs.length > 0 ? (
          <p className="ed-kicker mb-2 text-primary">
            {request.breadcrumbs.map((crumb) => crumb.name).join(" · ")}
          </p>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <Heading
            level={level}
            className="text-[1.75rem] leading-tight font-semibold text-balance"
          >
            <a href={`#${request.anchor}`} className="hover:text-primary">
              {request.name}
            </a>
          </Heading>

          <CopyPage markdownUrl={request.markdownUrl} label={copyActionLabel(level)} />
        </div>

        {/* Request line, set between hairlines */}
        <div
          data-method={methodLabel(request).toLowerCase()}
          className="mt-4 flex min-w-0 items-center gap-3 border-y border-border py-2"
        >
          <span className="shrink-0 font-sans text-xs font-semibold tracking-[0.12em] text-(--method)">
            {methodLabel(request)}
          </span>

          <EnvironmentVariants variants={request.variants}>
            {(variant) => (
              <>
                <RequestUrl
                  url={variant.url}
                  className="min-w-0 flex-1 overflow-x-auto font-mono text-[0.8125rem] whitespace-nowrap [scrollbar-width:thin]"
                />

                <CopyText text={variant.resolvedUrl} label="Copy URL" />
              </>
            )}
          </EnvironmentVariants>
        </div>

        {request.kind === "grpc" && (request.service || request.method) ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">{grpcMethodPath(request)}</p>
        ) : null}

        {request.descriptionHtml ? (
          <Markdown html={request.descriptionHtml} className="ed-prose mt-6" />
        ) : null}

        <div className="mt-6 text-[1.0625rem] leading-relaxed">
          <RunIn>Authentication</RunIn>
          <AuthInfo
            auth={request.auth}
            className="inline text-muted-foreground [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.8em] [&_code]:text-foreground [&_p]:inline [&_strong]:font-semibold [&_strong]:text-foreground"
          />
        </div>

        <Body request={request} />

        <CodeFigure request={request} className="mt-10" />
        <ResponseFigure request={request} className="mt-8" />
      </div>

      {hasNotes ? (
        <aside
          aria-label="Parameters"
          className="mt-10 max-w-(--measure) font-sans 2xl:col-start-2 2xl:row-start-1 2xl:mt-[4.5rem]"
        >
          {request.kind !== "grpc" ? (
            <>
              <Notes title="Path parameters" items={request.pathParameters} />
              <Notes title="Query parameters" items={request.queryParameters} />
            </>
          ) : null}

          <Notes title={request.kind === "grpc" ? "Metadata" : "Headers"} items={headers} />
        </aside>
      ) : null}
    </section>
  );
}
