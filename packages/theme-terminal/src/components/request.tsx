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
import { CopyPage, KeyValueTable } from "./parts";

const Label = ({ children }: { children: React.ReactNode }) => (
  <h4 className="term-label">{children}</h4>
);

const codeBox = "overflow-hidden border border-dashed [&_pre]:overflow-x-auto [&_pre]:p-4";

function Body({ request }: { request: PreparedRequest }) {
  if (request.kind === "http") {
    const { body } = request;
    if (body.type === "none") {
      return null;
    }

    return (
      <>
        <Label>
          Body
          {body.contentType ? (
            <span className="ml-[1ch] font-normal tracking-normal text-muted-foreground normal-case">
              {body.contentType}
            </span>
          ) : null}
        </Label>

        {body.type === "form-urlencoded" || body.type === "multipart" ? (
          <KeyValueTable
            columns={["Field", "Value"]}
            items={body.fields.map((field) => ({
              ...field,
              value: formFieldValue(field),
            }))}
          />
        ) : body.type === "binary" ? (
          <p className="text-muted-foreground">binary file {body.filePath ?? ""}</p>
        ) : request.bodyHtml ? (
          <div className={codeBox}>
            <Html html={request.bodyHtml} />

            {request.variablesHtml ? (
              <div className="border-t border-dashed">
                <p className="px-4 pt-3 text-xs text-muted-foreground"># variables</p>
                <Html html={request.variablesHtml ?? ""} />
              </div>
            ) : null}
          </div>
        ) : null}
      </>
    );
  }

  if (!request.bodyHtml) {
    return null;
  }

  return (
    <>
      <Label>Message</Label>

      <div className={codeBox}>
        <Html html={request.bodyHtml} />
      </div>
    </>
  );
}

/** A tmux-like pane: tabs in its title row, the content below. */
function Pane({
  kind,
  group,
  label,
  title,
  tabs,
  sync,
  className,
  children,
}: {
  kind: "code-examples" | "response-examples";
  group: string;
  label: string;
  /** Text shown before the tabs. */
  title: string;
  tabs: TabListProps["tabs"];
  sync?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={label}
      data-yd={kind}
      data-yd-tab-group={group}
      className={cn("overflow-hidden border bg-background", className)}
    >
      <div className="flex h-7 items-stretch border-b text-xs">
        <span className="flex shrink-0 items-center bg-muted px-[1ch] text-muted-foreground">
          {title}
        </span>

        <TabList
          group={group}
          tabs={tabs}
          label={label}
          {...(sync === false ? { sync } : {})}
          className="flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]"
          tabClassName="shrink-0 px-[1ch] text-muted-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        />

        <CopyCode target={visibleTabPanelSelector(group)} />
      </div>

      {children}
    </section>
  );
}

/** Tabbed code examples (one set per environment). */
export function CodePanel({
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
    <Pane
      kind="code-examples"
      group={group}
      label="Example request"
      title="request"
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
              data-lang={example.language}
              className="max-h-[32rem] overflow-auto"
            >
              <Html html={example.html} />
            </div>
          ))
        }
      </EnvironmentVariants>
    </Pane>
  );
}

/** Example responses from ```response:<status> blocks, tabbed by status. */
export function ResponsePanel({
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
    <Pane
      kind="response-examples"
      group={group}
      label="Example response"
      title="response"
      sync={false}
      tabs={request.responses.map((response, index) => ({
        id: String(index),
        label: response.status ? String(response.status) : response.label,
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
              data-method={
                response.status < 300 ? "get" : response.status < 400 ? "post" : "delete"
              }
              className="px-4 pt-3 text-[0.8125rem] font-bold text-(--method)"
            >
              HTTP/1.1 {response.status} {response.statusText}
            </p>
          ) : null}

          <ResponseHeaders
            headers={response.headers}
            className="grid grid-cols-[max-content_1fr] gap-x-[1ch] px-4 pt-1 text-[0.8125rem] [&>div]:contents [&_dt]:text-muted-foreground [&_dt]:after:content-[':'] [&_dd]:break-all"
          />

          {response.empty ? (
            <p className="px-4 py-3 text-[0.8125rem] text-muted-foreground"># no body</p>
          ) : (
            <Html html={response.html} />
          )}
        </div>
      ))}
    </Pane>
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

  return (
    <section
      id={request.anchor}
      data-yd-section
      data-yd="request"
      className="scroll-mt-(--header-offset) border-t border-dashed py-10 first:border-t-0 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] xl:gap-8"
    >
      <div className="min-w-0">
        {request.breadcrumbs.length > 0 ? (
          <p className="mb-1 text-xs text-muted-foreground">
            # {request.breadcrumbs.map((crumb) => crumb.name).join(" / ")}
          </p>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <Heading level={level} className="term-h2 text-base font-bold text-balance">
            <a href={`#${request.anchor}`} className="hover:underline hover:underline-offset-4">
              {request.name}
            </a>
          </Heading>

          <CopyPage markdownUrl={request.markdownUrl} label={copyActionLabel(level)} />
        </div>

        {/* Request line: $ METHOD url [copy] */}
        <div
          data-method={methodLabel(request).toLowerCase()}
          className="mt-3 flex min-w-0 items-center gap-[1ch] bg-muted py-1.5 pl-3"
        >
          <span aria-hidden="true" className="text-primary select-none">
            $
          </span>

          <span className="shrink-0 font-bold text-(--method)">{methodLabel(request)}</span>

          <EnvironmentVariants variants={request.variants}>
            {(variant) => (
              <>
                <RequestUrl
                  url={variant.url}
                  className="min-w-0 flex-1 overflow-x-auto text-[0.8125rem] whitespace-nowrap [scrollbar-width:thin]"
                />

                <span className="flex h-6 shrink-0 items-stretch pr-1">
                  <CopyText text={variant.resolvedUrl} label="Copy URL" />
                </span>
              </>
            )}
          </EnvironmentVariants>
        </div>

        {request.kind === "grpc" && (request.service || request.method) ? (
          <p className="mt-2 text-xs text-muted-foreground">{grpcMethodPath(request)}</p>
        ) : null}

        {request.descriptionHtml ? (
          <Markdown html={request.descriptionHtml} className="term-prose mt-6" />
        ) : null}

        <Label>Authentication</Label>

        <AuthInfo
          auth={request.auth}
          className="text-[0.8125rem] text-muted-foreground [&_code]:bg-muted [&_code]:px-[0.5ch] [&_code]:text-foreground [&_strong]:font-bold [&_strong]:text-foreground"
        />

        {request.kind !== "grpc" && request.pathParameters.length > 0 ? (
          <>
            <Label>Path parameters</Label>
            <KeyValueTable items={request.pathParameters} />
          </>
        ) : null}

        {request.kind !== "grpc" && request.queryParameters.length > 0 ? (
          <>
            <Label>Query parameters</Label>
            <KeyValueTable items={request.queryParameters} />
          </>
        ) : null}

        {headers.length > 0 ? (
          <>
            <Label>{request.kind === "grpc" ? "Metadata" : "Headers"}</Label>
            <KeyValueTable items={headers} />
          </>
        ) : null}

        <Body request={request} />
      </div>

      <div className="mt-8 min-w-0 xl:mt-0">
        <div className="flex flex-col gap-4 xl:sticky xl:top-[calc(var(--header-height)+1.5rem)]">
          <CodePanel request={request} />
          <ResponsePanel request={request} />
        </div>
      </div>
    </section>
  );
}
