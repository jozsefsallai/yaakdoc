import { type HttpBody, tryParseJson } from "@yaakdoc/core";

/** Quotes a string for POSIX shells using single quotes. */
export function shellQuote(value: string): string {
  if (value !== "" && /^[\w@%+=:,./-]+$/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Returns the content type implied by a body, if any. */
export function bodyContentType(body: HttpBody): string | null {
  // Multipart content types (with boundary) are set by the client.
  return body.type === "none" || body.type === "multipart" ? null : body.contentType;
}

/** Adds a Content-Type header for the body unless one is already present. */
export function withContentType(
  headers: Array<{ name: string; value: string }>,
  body: HttpBody,
): Array<{ name: string; value: string }> {
  const contentType = bodyContentType(body);
  if (!contentType || headers.some((h) => h.name.toLowerCase() === "content-type")) {
    return headers;
  }

  return [...headers, { name: "Content-Type", value: contentType }];
}

/** GraphQL bodies are sent as JSON `{ query, variables }`. */
export function graphqlPayload(body: Extract<HttpBody, { type: "graphql" }>): {
  query: string;
  variables?: unknown;
} {
  if (!body.variables) {
    return { query: body.query };
  }

  const parsed = tryParseJson(body.variables);
  return { query: body.query, variables: parsed.ok ? parsed.value : body.variables };
}

/** Body as a single string, for bodies that can be represented as one. */
export function bodyText(body: HttpBody): string | null {
  switch (body.type) {
    case "json":
    case "text":
      return body.text;
    case "graphql":
      return JSON.stringify(graphqlPayload(body), null, 2);
    case "form-urlencoded":
      return body.fields
        .map((field) => `${encodeURIComponent(field.name)}=${encodeURIComponent(field.value)}`)
        .join("&");
    default:
      return null;
  }
}

export function indent(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((line, index) => (index === 0 ? line : prefix + line))
    .join("\n");
}
