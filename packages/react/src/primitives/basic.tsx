import type { Auth, Header, KeyValue, PreparedRequest } from "@yaakdoc/core";
import { authLabel, methodLabel } from "@yaakdoc/core";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { overridable } from "../overrides";

/** Renders trusted, pre-sanitized HTML (descriptions are sanitized at build time). */
export const Html = overridable(
  "Html",
  function Html({
    html,
    as: As = "div",
    ...props
  }: { html: string; as?: "div" | "span" | "section" } & Omit<
    ComponentPropsWithoutRef<"div">,
    "children"
  >) {
    return <As data-yd="html" {...props} dangerouslySetInnerHTML={{ __html: html }} />;
  },
);

/** Rendered Markdown (a description). */
export const Markdown = overridable(
  "Markdown",
  function Markdown({ html, className }: { html: string; className?: string }) {
    if (!html) {
      return null;
    }

    return <Html html={html} className={className} data-yd="markdown" />;
  },
);

/** HTTP method (or gRPC / WS) badge. Style via `[data-method="get"]` etc. */
export const MethodBadge = overridable(
  "MethodBadge",
  function MethodBadge({ request, className }: { request: PreparedRequest; className?: string }) {
    const label = methodLabel(request);

    return (
      <span
        data-yd="method"
        data-method={label.toLowerCase()}
        data-kind={request.kind}
        className={className}
      >
        {label}
      </span>
    );
  },
);

/**
 * Request URL with `{{variables}}` and `:path` parameters wrapped in spans
 * (`[data-yd="url-variable"]`, `[data-yd="url-param"]`) for styling.
 */
export const RequestUrl = overridable(
  "RequestUrl",
  function RequestUrl({ url, className }: { url: string; className?: string }) {
    const parts = url.split(/(\{\{[^}]+\}\}|:[A-Za-z_][\w-]*(?=\/|$|\?|\.|#))/g).filter(Boolean);

    return (
      <code data-yd="url" className={className}>
        {parts.map((part, index) =>
          part.startsWith("{{") ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: static split
            <span key={index} data-yd="url-variable">
              {part}
            </span>
          ) : part.startsWith(":") && index > 0 ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: static split
            <span key={index} data-yd="url-param">
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </code>
    );
  },
);

export type KeyValueTableProps = {
  items: Array<KeyValue | Header>;
  caption?: ReactNode;
  columns?: [string, string];
  className?: string;
  /** Show an "inherited from ..." note for headers inherited from folders/workspace. */
  showInherited?: boolean;
};

/** Generic two-column table for headers and parameters. */
export const KeyValueTable = overridable(
  "KeyValueTable",
  function KeyValueTable({
    items,
    caption,
    columns = ["Name", "Value"],
    className,
    showInherited = true,
  }: KeyValueTableProps) {
    if (items.length === 0) {
      return null;
    }

    return (
      <table data-yd="kv-table" className={className}>
        {caption ? <caption>{caption}</caption> : null}

        <thead>
          <tr>
            <th scope="col">{columns[0]}</th>
            <th scope="col">{columns[1]}</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: names may repeat
            <tr key={index} data-enabled={item.enabled}>
              <td>
                <code data-yd="kv-name">{item.name}</code>

                {!item.enabled ? <span data-yd="optional">optional</span> : null}

                {showInherited && "inheritedFrom" in item && item.inheritedFrom ? (
                  <span
                    data-yd="inherited"
                    title={`Inherited from ${item.inheritedFrom.model} "${item.inheritedFrom.name}"`}
                  >
                    {item.inheritedFrom.model}
                  </span>
                ) : null}
              </td>

              <td>{item.value ? <code data-yd="kv-value">{item.value}</code> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
);

/** Describes the effective authentication of a request/folder. */
export const AuthInfo = overridable(
  "AuthInfo",
  function AuthInfo({ auth, className }: { auth: Auth | null; className?: string }) {
    if (!auth) {
      return (
        <p data-yd="auth" data-auth="none" className={className}>
          No authentication required.
        </p>
      );
    }

    const fields = auth.fields;

    return (
      <p data-yd="auth" data-auth={auth.type} className={className}>
        <strong>{authLabel(auth.type)}</strong>

        {auth.type === "apikey" ? (
          <>
            {" "}
            — send <code>{String(fields.key || "X-API-Key")}</code> in the{" "}
            {fields.location === "query" ? "query string" : "headers"}.
          </>
        ) : auth.type === "bearer" ? (
          <>
            {" "}
            — send <code>Authorization: {String(fields.prefix || "Bearer")} &lt;token&gt;</code>.
          </>
        ) : auth.type === "basic" ? (
          <>
            {" "}
            — send <code>Authorization: Basic &lt;base64(username:password)&gt;</code>.
          </>
        ) : null}

        {auth.inheritedFrom ? (
          <span data-yd="inherited">
            {" "}
            Inherited from {auth.inheritedFrom.model} "{auth.inheritedFrom.name}".
          </span>
        ) : null}
      </p>
    );
  },
);
