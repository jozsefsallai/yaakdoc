/**
 * Example responses, written in request descriptions as fenced code blocks (the Insomnia Documenter
 * convention):
 *
 *     ```response
 *     { "ok": true }
 *     ```
 *
 *     ```response:404
 *     { "error": "Not found" }
 *     ```
 *
 * An optional language can follow the info string (```response:200 xml); otherwise it is detected.
 */

import { tryParseJson } from "./util";

export type ResponseExampleSource = {
  /** HTTP status code, or `null` when the block has none. */
  status: number | null;
  language: string;
  code: string;
};

const OPEN_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*response(?::[ \t]*(\d{3}))?(?:[ \t]+([\w+-]+))?[ \t]*$/i;

/** Splits `response` code blocks out of a Markdown description. */
export function extractResponses(markdown: string): {
  description: string;
  responses: ResponseExampleSource[];
} {
  const lines = markdown.split("\n");
  const kept: string[] = [];
  const responses: ResponseExampleSource[] = [];

  for (let i = 0; i < lines.length; i++) {
    const open = OPEN_RE.exec(lines[i]!);
    if (!open) {
      kept.push(lines[i]!);
      continue;
    }

    const fence = open[1]!;
    const close = new RegExp(`^ {0,3}${fence[0] === "`" ? "`" : "~"}{${fence.length},}[ \\t]*$`);
    const body: string[] = [];

    let j = i + 1;

    while (j < lines.length && !close.test(lines[j]!)) {
      body.push(lines[j++]!);
    }

    const code = body.join("\n");

    responses.push({
      status: open[2] ? Number(open[2]) : null,
      language: open[3]?.toLowerCase() ?? detectLanguage(code),
      code,
    });

    i = j; // skip the closing fence (or run to the end for an unclosed block)
  }

  return {
    description: kept
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    responses,
  };
}

function detectLanguage(code: string): string {
  const trimmed = code.trim();
  // Not strict JSON (comments, placeholders...): still highlight as JSON-ish.
  if (/^[{[]/.test(trimmed)) return tryParseJson(trimmed).ok ? "json" : "jsonc";

  if (/^<!doctype html|^<html/i.test(trimmed)) {
    return "html";
  }

  if (trimmed.startsWith("<")) {
    return "xml";
  }

  return "text";
}

const STATUS_TEXT: Record<number, string> = {
  100: "Continue",
  101: "Switching Protocols",
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  206: "Partial Content",
  301: "Moved Permanently",
  302: "Found",
  304: "Not Modified",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  409: "Conflict",
  410: "Gone",
  412: "Precondition Failed",
  413: "Content Too Large",
  415: "Unsupported Media Type",
  422: "Unprocessable Content",
  429: "Too Many Requests",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

/** Reason phrase for a status code, e.g. `404` → `Not Found`. */
export function statusText(status: number): string {
  return STATUS_TEXT[status] ?? "";
}
