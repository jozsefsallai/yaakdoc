import type { ResolvedRequest } from "@yaakdoc/core";
import { curl } from "./generators/curl";
import { go } from "./generators/go";
import { grpcurl } from "./generators/grpcurl";
import { javascript } from "./generators/javascript";
import { python } from "./generators/python";
import { wscat } from "./generators/wscat";
import type { GeneratedExample, Snippet } from "./types";

export { defineSnippet } from "./define";
export { toPython } from "./generators/python";
export type { GeneratedExample, Snippet } from "./types";
export { curl, go, grpcurl, javascript, python, wscat };

export const builtinSnippets: Readonly<Record<string, Snippet>> = Object.freeze({
  curl,
  javascript,
  python,
  go,
  grpcurl,
  wscat,
});

/** Generates code examples for a request with every applicable snippet. */
export function generateExamples(
  request: ResolvedRequest,
  snippets: readonly Snippet[],
): GeneratedExample[] {
  return snippets
    .filter((snippet) => snippet.supports.includes(request.kind))
    .map((snippet) => ({
      id: snippet.id,
      label: snippet.label,
      language: snippet.language,
      code: snippet.generate(request),
    }))
    .filter((example) => example.code.trim() !== "");
}
