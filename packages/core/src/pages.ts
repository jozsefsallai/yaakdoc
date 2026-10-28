import { slugify } from "./slug";
import type { PageDoc } from "./types";

/** Normalizes a page reference (`./guides/auth.md`, `/guides/auth`) to a page id (`guides/auth`). */
export function pageId(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\.?\/+/, "")
    .replace(/\.(md|markdown)$/i, "")
    .replace(/\/+$/, "");
}

/** URL slug of a page id: segments slugified, a trailing `index` dropped (`index` → `""`). */
export function pageSlug(id: string): string {
  const segments = pageId(id).split("/").filter(Boolean);

  if (segments.at(-1)?.toLowerCase() === "index") {
    segments.pop();
  }

  return segments.map(slugify).join("/");
}

const humanize = (segment: string) => {
  const words = segment
    .replace(/^\d+[-_.]\s*/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : segment;
};

/** Readable title from a file or directory name (`getting-started` → `Getting started`). */
export function titleFromPath(path: string): string {
  const segments = pageId(path).split("/").filter(Boolean);
  const last = segments.at(-1)?.toLowerCase() === "index" ? segments.at(-2) : segments.at(-1);

  return last ? humanize(last) : "Home";
}

const H1_RE = /^[ \t]*#[ \t]+(.+?)[ \t#]*$/m;

const string = (value: unknown) =>
  typeof value === "string" ? value : typeof value === "number" ? String(value) : null;

export type PageSource = {
  /** Path relative to the pages directory (with or without extension). */
  path: string;
  /** Parsed front matter. */
  data?: Record<string, unknown>;
  /** Markdown body without front matter. */
  body: string;
  file?: string | null;
};

/**
 * Creates a page from its source. The title comes from the front matter, then the first `# H1`
 * (removed from the body, since themes render the title), then the file name.
 */
export function createPageDoc({ path, data = {}, body, file = null }: PageSource): PageDoc {
  const id = pageId(path);

  let title = string(data.title)?.trim() || null;
  let content = body;

  if (!title) {
    const match = content.match(H1_RE);

    // Only a heading before any other content counts as the page title.
    if (match && content.slice(0, match.index).trim() === "") {
      title = match[1]!.trim();
      content = content.slice((match.index ?? 0) + match[0].length);
    }
  }

  const order = Number(data.order);

  return {
    id,
    slug: pageSlug(id),
    title: title ?? titleFromPath(id),
    sidebarTitle: string(data.sidebarTitle)?.trim() || null,
    description: string(data.description)?.trim() ?? "",
    icon: string(data.icon) || null,
    order: data.order !== undefined && data.order !== null && Number.isFinite(order) ? order : null,
    hidden: data.hidden === true,
    body: content.replace(/^\s*\n/, "").trimEnd(),
    file,
  };
}

/** URL and Markdown twin of a page with the given slug. */
export function pageLinks(base: string, slug: string): { href: string; markdownUrl: string } {
  return {
    href: slug ? `${base}${slug}/` : base,
    markdownUrl: `${base}${slug || "index"}.md`,
  };
}
