import type { MultipartField, RequestDoc } from "./types";

/** Escapes a string for use inside a regular expression. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `JSON.parse` that reports failure instead of throwing. */
export function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/** Pretty-printed JSON, or `null` when `text` isn't valid JSON. */
export function prettyJson(text: string): string | null {
  const parsed = tryParseJson(text);
  return parsed.ok ? JSON.stringify(parsed.value, null, 2) : null;
}

/** Syntax highlighting language for a content type (`text` when unknown). */
export function languageForContentType(contentType: string | null | undefined): string {
  const type = contentType?.toLowerCase() ?? "";

  if (type.includes("json")) {
    return "json";
  }

  if (type.includes("xml")) {
    return "xml";
  }

  if (type.includes("html")) {
    return "html";
  }

  if (type.includes("yaml")) {
    return "yaml";
  }

  if (type.includes("graphql")) {
    return "graphql";
  }

  return "text";
}

/** `true` for absolute (or protocol-relative) URLs and data URIs. */
export function isUrl(value: string): boolean {
  return /^(https?:)?\/\//.test(value) || value.startsWith("data:");
}

/** Display value of a form field: `@path` for file fields, the value otherwise. */
export function formFieldValue(
  field: { value: string } & Partial<Pick<MultipartField, "file">>,
): string {
  return field.file ? `@${field.file}` : field.value;
}

/** `package.Service/Method` of a gRPC request (empty when unknown). */
export function grpcMethodPath(request: { service: string | null; method: string | null }): string {
  return [request.service, request.method].filter(Boolean).join("/");
}

/** Short method label: the HTTP method, `gRPC` or `WS`. */
export function methodLabel(
  request: Pick<RequestDoc, "kind"> & { method?: string | null },
): string {
  if (request.kind === "http") {
    return request.method ?? "GET";
  }

  return request.kind === "grpc" ? "gRPC" : "WS";
}
