import type { Snippet } from "./types";

/** Defines a code example generator. Identity function for type inference. */
export function defineSnippet(snippet: Snippet): Snippet {
  return snippet;
}
