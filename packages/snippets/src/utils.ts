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

type GraphqlBody = Extract<HttpBody, { type: "graphql" }>;

/** GraphQL bodies are sent as JSON `{ query, variables, operationName }`. */
export function graphqlPayload(
  body: GraphqlBody,
  query = graphqlQuery(body),
): { query: string; variables?: unknown; operationName?: string } {
  const variables = graphqlVariables(body);

  return {
    query,
    ...(variables !== undefined ? { variables } : {}),
    ...(body.operationName ? { operationName: body.operationName } : {}),
  };
}

/** Variables as a value (parsed JSON), the raw text when it isn't JSON, or `undefined`. */
export function graphqlVariables(body: GraphqlBody): unknown {
  if (!body.variables?.trim()) {
    return undefined;
  }

  const parsed = tryParseJson(body.variables);
  return parsed.ok ? parsed.value : body.variables;
}

/** The query with common indentation and surrounding blank lines removed. */
export function graphqlQuery(body: GraphqlBody): string {
  const lines = body.query.replace(/\r\n?/g, "\n").split("\n");

  while (lines.length > 0 && lines[0]!.trim() === "") {
    lines.shift();
  }

  while (lines.length > 0 && lines.at(-1)!.trim() === "") {
    lines.pop();
  }

  const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^\s*/)![0].length);
  const common = indents.length > 0 ? Math.min(...indents) : 0;

  return lines.map((line) => line.slice(common).trimEnd()).join("\n");
}

/**
 * Collapses a GraphQL document onto one readable line (for JSON bodies in shell commands):
 * comments are removed and whitespace outside strings is collapsed, e.g.
 * `mutation x($id: ID!) { node(id: $id) { id } }`.
 */
export function minifyGraphql(query: string): string {
  let out = "";
  let inString = false;

  for (let i = 0; i < query.length; i++) {
    const char = query[i]!;

    if (inString) {
      out += char;

      if (char === "\\") {
        out += query[++i] ?? "";
      } else if (char === '"') {
        inString = false;
      }
    } else if (char === "#") {
      while (i + 1 < query.length && query[i + 1] !== "\n") {
        i++;
      }
    } else if (/\s/.test(char)) {
      if (!out.endsWith(" ")) {
        out += " ";
      }
    } else {
      if (char === '"') {
        inString = true;
      }

      out += char;
    }
  }

  return out.replace(/\( /g, "(").replace(/ \)/g, ")").trim();
}

/** Body as a single string, for bodies that can be represented as one. */
export function bodyText(body: HttpBody): string | null {
  switch (body.type) {
    case "json":
    case "text":
      return body.text;
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

/** Prefixes every non-empty line. */
export function indentLines(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((line) => (line ? prefix + line : line))
    .join("\n");
}
