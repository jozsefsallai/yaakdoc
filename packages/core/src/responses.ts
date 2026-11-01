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
 *
 * Response headers can head the block, like in a raw HTTP message: `Name: value` lines, then a
 * blank line, then the body.
 *
 *     ```response:429
 *     Retry-After: 30
 *
 *     { "error": "Too many requests" }
 *     ```
 */

import { tryParseJson } from "./util";

export type ResponseHeader = { name: string; value: string };

export type ResponseExampleSource = {
  /** HTTP status code, or `null` when the block has none (or an invalid one). */
  status: number | null;
  language: string;
  /** The body, without the headers. */
  code: string;
  headers: ResponseHeader[];
  /** The status as written, when it isn't a valid HTTP status code (100–599). */
  invalidStatus?: string;
  /** `true` when the body should be JSON (detected or `json`) but doesn't parse. */
  invalidJson?: boolean;
};

const OPEN_RE =
  /^ {0,3}(`{3,}|~{3,})[ \t]*response(?::[ \t]*([^\s`~]+))?(?:[ \t]+([\w+-]+))?[ \t]*$/i;

/** A header line: an RFC 9110 token, a colon and a value. */
const HEADER_RE = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+):[ \t]*(\S.*?)[ \t]*$/;

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

    const { headers, code } = splitHeaders(body);
    const status = open[2];
    const valid = status === undefined || isStatusCode(status);
    const explicit = open[3]?.toLowerCase();
    const language = explicit ?? detectLanguage(code);

    responses.push({
      status: status && valid ? Number(status) : null,
      language,
      code,
      headers,
      ...(valid ? {} : { invalidStatus: status }),
      ...(isInvalidJson(code, explicit, language) ? { invalidJson: true } : {}),
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

/** Splits leading `Name: value` lines off the body when a blank line follows them. */
function splitHeaders(lines: string[]): { headers: ResponseHeader[]; code: string } {
  const blank = lines.findIndex((line) => line.trim() === "");
  const head = blank > 0 ? lines.slice(0, blank).map((line) => HEADER_RE.exec(line)) : [];

  if (head.length === 0 || head.some((match) => !match)) {
    return { headers: [], code: lines.join("\n") };
  }

  return {
    headers: head.map((match) => ({ name: match![1]!, value: match![2]! })),
    code: lines
      .slice(blank + 1)
      .join("\n")
      .replace(/^(?:[ \t]*\n)+/, ""),
  };
}

/** A real HTTP status code: three digits from 100 to 599. */
export function isStatusCode(value: string): boolean {
  return /^[1-5]\d\d$/.test(value);
}

/**
 * Whether a body meant to be JSON doesn't parse: set as `json`, or detected (it starts like JSON
 * but isn't, so it was detected as `jsonc`). An explicit `jsonc` allows comments.
 */
function isInvalidJson(code: string, explicit: string | undefined, detected: string): boolean {
  const trimmed = code.trim();
  const meantJson = explicit ? explicit === "json" : detected === "jsonc";
  return meantJson && trimmed !== "" && !tryParseJson(trimmed).ok;
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
