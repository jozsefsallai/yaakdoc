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
import { CopyPage, KeyValueTable } from "./parts";

/** A section label with a rule running to the right edge. */
export const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h4 className="bp-label mt-10 mb-3 flex items-center gap-3 after:h-px after:flex-1 after:bg-border">
    {children}
  </h4>
);

const codeBox =
  "overflow-hidden border border-dashed border-border-strong bg-muted/60 [&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[0.8125rem] [&_pre]:leading-6";

function Body({ request }: { request: PreparedRequest }) {
  if (request.kind === "http") {
    const { body } = request;
    if (body.type === "none") {
      return null;
    }

    return (
      <>
        <SubHeading>
          Body
          {body.contentType ? (
            <span className="font-normal tracking-normal normal-case">{body.contentType}</span>
          ) : null}
        </SubHeading>

        {body.type === "form-urlencoded" || body.type === "multipart" ? (
          <KeyValueTable
            columns={["Field", "Value"]}
            items={body.fields.map((field) => ({
              ...field,
              value: formFieldValue(field),
            }))}
          />
        ) : body.type === "binary" ? (
          <p className="text-sm text-muted-foreground">
            Binary file {body.filePath ? <code className="font-mono">{body.filePath}</code> : null}
          </p>
        ) : request.bodyHtml ? (
          <div className={codeBox}>
            <Html html={request.bodyHtml} />

            {request.variablesHtml ? (
              <div className="border-t border-dashed border-border-strong">
                <p className="bp-label px-4 pt-3">Variables</p>
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
      <SubHeading>Message</SubHeading>

      <div className={codeBox}>
        <Html html={request.bodyHtml} />
      </div>
    </>
  );
}

/** A detail frame ("Detail A · Request") with tabbed panels. */
function DetailFrame({
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
  /** Text in the frame's title cell. */
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
      className={cn("bp-corners border border-border bg-background p-1", className)}
    >
      <div className="flex items-stretch border border-border-strong bg-muted/60">
        <span className="bp-label flex shrink-0 items-center border-r border-border-strong px-3 text-foreground">
          {title}
        </span>

        <TabList
          group={group}
          tabs={tabs}
          label={label}
          {...(sync === false ? { sync } : {})}
          className="flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]"
          tabClassName="h-9 shrink-0 border-r border-border px-3 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-[inset_0_-2px_0_var(--primary)]"
        />

        <CopyCode target={visibleTabPanelSelector(group)} />
      </div>

      <div className="border border-t-0 border-dashed border-border-strong">{children}</div>
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
    <DetailFrame
      kind="code-examples"
      group={group}
      label="Example request"
      title="Detail A"
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
    </DetailFrame>
  );
}

const STATUS_METHOD: Record<string, string> = {
  "2xx": "get",
  "3xx": "post",
  "4xx": "put",
  "5xx": "delete",
};

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
    <DetailFrame
      kind="response-examples"
      group={group}
      label="Example response"
      title="Detail B"
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
              className="flex items-center gap-2 border-b border-dashed border-border px-4 py-2 font-mono text-xs text-(--method)"
            >
              <span aria-hidden="true" className="size-2 border border-(--method) bg-(--method)" />
              {response.status} {response.statusText}
            </p>
          ) : null}

          <ResponseHeaders
            headers={response.headers}
            className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 border-b border-dashed border-border px-4 py-3 font-mono text-xs [&>div]:contents [&_dt]:text-muted-foreground [&_dd]:break-all"
          />

          {response.empty ? (
            <p className="p-4 text-xs text-muted-foreground italic">No response body</p>
          ) : (
            <Html html={response.html} />
          )}
        </div>
      ))}
    </DetailFrame>
  );
}

/**
 * The request drawn as a schematic: a framed box with the method and URL under a dimension line,
 * and a legend for the path parameters, which the URL marks with numbered callouts.
 */
function Schematic({ request }: { request: PreparedRequest }) {
  const method = methodLabel(request);
  const parameters = request.kind === "grpc" ? [] : request.pathParameters;

  return (
    <figure className="bp-corners mt-5 bg-background/70 p-4" data-method={method.toLowerCase()}>
      <div className="bp-dimension mb-2">
        <span>
          {request.kind === "http"
            ? "Endpoint"
            : request.kind === "grpc"
              ? "gRPC call"
              : "Connection"}
        </span>
      </div>

      <div className="flex min-w-0 items-stretch border border-border-strong bg-background">
        <span className="flex shrink-0 items-center border-r border-border-strong px-3 font-mono text-xs font-medium tracking-wider text-(--method)">
          {method}
        </span>

        <EnvironmentVariants variants={request.variants}>
          {(variant) => (
            <>
              <RequestUrl
                url={variant.url}
                className="min-w-0 flex-1 self-center overflow-x-auto px-3 pt-3 pb-2 font-mono text-[0.8125rem] whitespace-nowrap [scrollbar-width:thin]"
              />

              <span className="flex shrink-0 items-center border-l border-border px-1">
                <CopyText text={variant.resolvedUrl} label="Copy URL" />
              </span>
            </>
          )}
        </EnvironmentVariants>
      </div>

      {parameters.length > 0 ? (
        <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs">
          {parameters.map((parameter, index) => (
            <span key={parameter.name} className="flex items-center gap-1.5">
              <span className="inline-flex size-4 items-center justify-center rounded-full border border-redline text-[0.625rem] text-redline">
                {index + 1}
              </span>
              <span className="text-foreground">{parameter.name}</span>
              {parameter.value ? (
                <span className="text-muted-foreground">= {parameter.value}</span>
              ) : null}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
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
      className="scroll-mt-(--header-offset) border-t border-dashed border-border-strong py-12 first:border-t-0 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] xl:gap-10"
    >
      <div className="min-w-0">
        {request.breadcrumbs.length > 0 ? (
          <p className="bp-label mb-2">
            {request.breadcrumbs.map((crumb) => crumb.name).join(" / ")}
          </p>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <Heading level={level} className="text-xl font-semibold tracking-tight text-balance">
            <a href={`#${request.anchor}`} className="hover:underline hover:underline-offset-4">
              {request.name}
            </a>
          </Heading>

          <CopyPage markdownUrl={request.markdownUrl} label={copyActionLabel(level)} />
        </div>

        <Schematic request={request} />

        {request.kind === "grpc" && (request.service || request.method) ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">{grpcMethodPath(request)}</p>
        ) : null}

        {request.descriptionHtml ? (
          <Markdown html={request.descriptionHtml} className="bp-prose mt-6" />
        ) : null}

        <SubHeading>Authentication</SubHeading>

        <AuthInfo
          auth={request.auth}
          className="text-sm text-muted-foreground [&_code]:border [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground"
        />

        {request.kind !== "grpc" && request.pathParameters.length > 0 ? (
          <>
            <SubHeading>Path parameters</SubHeading>
            <KeyValueTable items={request.pathParameters} />
          </>
        ) : null}

        {request.kind !== "grpc" && request.queryParameters.length > 0 ? (
          <>
            <SubHeading>Query parameters</SubHeading>
            <KeyValueTable items={request.queryParameters} />
          </>
        ) : null}

        {headers.length > 0 ? (
          <>
            <SubHeading>{request.kind === "grpc" ? "Metadata" : "Headers"}</SubHeading>
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
