import { escapeRegExp } from "./util";

/**
 * Minimal glob → RegExp for slug paths: `**` matches across segments, `*` within a segment,
 * `?` a single character. A pattern without wildcards also matches everything below it.
 */
export function globToRegExp(pattern: string): RegExp {
  const trimmed = pattern.replace(/^\/+|\/+$/g, "");

  let source = "";

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]!;

    if (char === "*") {
      if (trimmed[i + 1] === "*") {
        source += ".*";
        i++;

        if (trimmed[i + 1] === "/") {
          i++;
        }
      } else {
        source += "[^/]*";
      }
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += escapeRegExp(char);
    }
  }

  const hasWildcard = /[*?]/.test(trimmed);
  return new RegExp(`^${source}${hasWildcard ? "" : "(?:/.*)?"}$`);
}
