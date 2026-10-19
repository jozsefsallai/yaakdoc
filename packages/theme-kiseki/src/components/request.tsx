import { formFieldValue, grpcMethodPath, methodLabel, type PreparedRequest } from "@yaakdoc/core";
import {
  AuthInfo,
  copyActionLabel,
  EnvironmentVariants,
  Heading,
  Html,
  Markdown,
  RequestUrl,
  statusClass,
  useThemeOptions,
} from "@yaakdoc/react";
import {
  TabList,
  type TabListProps,
  tabGroupIds,
  tabPanelProps,
  visibleTabPanelSelector,
} from "@yaakdoc/react/islands";
import { cn } from "@/lib/utils";
import type { KisekiOptions } from "../../theme";
import { CopyCode, CopyText } from "./islands";
import { CopyPage, KeyValueTable } from "./parts";

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h4 className="mt-8 mb-3 text-sm font-semibold text-foreground">{children}</h4>
);

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
            <code className="ml-2 font-mono text-xs font-normal text-muted-foreground">
              {body.contentType}
            </code>
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
          <div className="overflow-hidden rounded-lg border bg-muted/40 [&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[0.8125rem] [&_pre]:leading-6">
            <Html html={request.bodyHtml} />

            {body.type === "graphql" && body.variables ? (
              <div className="border-t">
                <p className="px-4 pt-3 text-xs font-medium text-muted-foreground">Variables</p>

                <pre>
                  <code>{body.variables}</code>
                </pre>
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

      <div className="overflow-hidden rounded-lg border bg-muted/40 [&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[0.8125rem] [&_pre]:leading-6">
        <Html html={request.bodyHtml} />
      </div>
    </>
  );
}

/** Dark code panel with tabbed examples (static panels; only the tabs and copy button hydrate). */
/** Dark, tabbed panel shared by the code examples and example responses. */
function TabbedPanel({
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
  title?: string;
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
      className={cn(
        "overflow-hidden rounded-xl border border-code-panel-border bg-code-panel text-code-panel-foreground [color-scheme:dark]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-code-panel-border pr-1.5 pl-3">
        {title ? (
          <span className="mr-2 shrink-0 text-xs font-medium text-code-panel-foreground/55">
            {title}
          </span>
        ) : null}

        <TabList
          group={group}
          tabs={tabs}
          label={label}
          {...(sync === false ? { sync } : {})}
          className="-mb-px flex min-w-0 flex-1 gap-3 overflow-x-auto [scrollbar-width:none]"
          tabClassName="h-10 shrink-0 border-b-2 border-transparent text-xs font-medium text-code-panel-foreground/55 transition-colors hover:text-code-panel-foreground data-[state=active]:border-primary data-[state=active]:text-code-panel-foreground"
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
    <TabbedPanel
      kind="code-examples"
      group={group}
      label="Example request"
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
    </TabbedPanel>
  );
}

const STATUS_DOT: Record<string, string> = {
  "2xx": "before:bg-(--method-get)",
  "3xx": "before:bg-(--method-post)",
  "4xx": "before:bg-(--method-put)",
  "5xx": "before:bg-(--method-delete)",
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
    <TabbedPanel
      kind="response-examples"
      group={group}
      label="Example response"
      title="Response"
      sync={false}
      tabs={request.responses.map((response, index) => {
        const dot = STATUS_DOT[statusClass(response.status) ?? ""];

        return {
          id: String(index),
          label: response.label,
          ...(dot
            ? {
                className: cn(
                  "font-mono before:mr-1.5 before:inline-block before:size-1.5 before:rounded-full before:align-middle",
                  dot,
                ),
              }
            : { className: "font-mono" }),
        };
      })}
      {...(className ? { className } : {})}
    >
      {request.responses.map((response, index) => (
        <div
          key={String(index)}
          {...tabPanelProps(group, String(index), { selected: index === 0 })}
          data-status={response.status ?? undefined}
          className="max-h-[28rem] overflow-auto"
        >
          {response.empty ? (
            <p className="p-4 text-xs text-code-panel-foreground/55 italic">No response body</p>
          ) : (
            <Html html={response.html} />
          )}
        </div>
      ))}
    </TabbedPanel>
  );
}

export function RequestSection({
  request,
  level = 3,
}: {
  request: PreparedRequest;
  level?: number;
}) {
  const options = useThemeOptions<KisekiOptions>();

  const headers = request.kind === "grpc" ? request.metadata : request.headers;
  const side = options.codePanel === "right";

  return (
    <section
      id={request.anchor}
      data-yd-section
      data-yd="request"
      className={cn(
        "scroll-mt-16 border-t py-12 first:border-t-0",
        side && "xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] xl:gap-10",
      )}
    >
      <div className="min-w-0">
        {request.breadcrumbs.length > 0 ? (
          <p className="mb-2 text-xs text-muted-foreground">
            {request.breadcrumbs.map((crumb) => crumb.name).join(" / ")}
          </p>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <Heading level={level} className="text-xl font-semibold tracking-tight text-balance">
            <a
              href={`#${request.anchor}`}
              className="hover:underline hover:decoration-border hover:underline-offset-4"
            >
              {request.name}
            </a>
          </Heading>

          <CopyPage markdownUrl={request.markdownUrl} label={copyActionLabel(level)} />
        </div>

        {/* Request line: method segment | URL | copy */}
        <div
          data-method={methodLabel(request).toLowerCase()}
          className="mt-4 flex min-w-0 items-stretch overflow-hidden rounded-lg border bg-muted/40"
        >
          <span className="flex shrink-0 items-center border-r bg-[color-mix(in_oklch,var(--method)_9%,transparent)] px-3 font-mono text-xs font-semibold tracking-wide text-(--method)">
            {methodLabel(request)}
          </span>

          <EnvironmentVariants variants={request.variants}>
            {(variant) => (
              <>
                <RequestUrl
                  url={variant.url}
                  className="min-w-0 flex-1 self-center overflow-x-auto px-3 py-2 font-mono text-[0.8125rem] whitespace-nowrap [scrollbar-width:thin]"
                />

                <span className="flex shrink-0 items-center pr-1">
                  <CopyText text={variant.resolvedUrl} label="Copy URL" />
                </span>
              </>
            )}
          </EnvironmentVariants>
        </div>

        {request.kind === "grpc" && (request.service || request.method) ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">{grpcMethodPath(request)}</p>
        ) : null}

        {request.descriptionHtml ? (
          <Markdown html={request.descriptionHtml} className="kiseki-prose mt-6" />
        ) : null}

        <SubHeading>Authentication</SubHeading>

        <AuthInfo
          auth={request.auth}
          className="text-sm text-muted-foreground [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.8em] [&_code]:text-foreground [&_strong]:font-medium [&_strong]:text-foreground"
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

        {!side ? (
          <>
            <CodePanel request={request} className="mt-8" />
            <ResponsePanel request={request} className="mt-4" />
          </>
        ) : null}
      </div>

      {side ? (
        <div className="mt-8 min-w-0 xl:mt-0">
          <div className="flex flex-col gap-4 xl:sticky xl:top-20">
            <CodePanel request={request} />
            <ResponsePanel request={request} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
