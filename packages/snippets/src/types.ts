import type { RequestKind, ResolvedRequest } from "@yaakdoc/core";

export type Snippet = {
  /** Unique id, referenced from `snippets` in the yaakdoc config. */
  id: string;
  /** Human readable label, e.g. "cURL". */
  label: string;
  /** Shiki language id used for syntax highlighting. */
  language: string;
  /** Request kinds this snippet can generate code for. */
  supports: readonly RequestKind[];
  generate(request: ResolvedRequest): string;
};

export type GeneratedExample = { id: string; label: string; language: string; code: string };
