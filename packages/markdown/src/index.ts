import type {
  Auth,
  KeyValue,
  PreparedDocument,
  PreparedFolder,
  PreparedPage,
  PreparedRequest,
  TreeNode,
} from "@yaakdoc/core";
import {
  absoluteUrl,
  authLabel,
  findFolderNode,
  flattenNavigation,
  formFieldValue,
  grpcMethodPath,
  languageForContentType,
  prettyJson,
  walkTree,
} from "@yaakdoc/core";

export type MarkdownOptions = {
  /** Site title (H1 of index / llms.txt). */
  title: string;
  /** One-line site summary. */
  description?: string;
  /**
   * Absolute site URL (e.g. `https://docs.acme.dev`). When set, links are absolute, which is what
   * LLM tools expect in llms.txt. Otherwise links are root-relative.
   */
  siteUrl?: string;
  /** Base path of the site (default `/`); stripped from paths before joining with `siteUrl`. */
  base?: string;
  /** Include generated code examples (default: true). */
  examples?: boolean;
};

const url = (path: string, options: MarkdownOptions) =>
  options.siteUrl ? absoluteUrl(options.siteUrl, options.base ?? "/", path) : path;

const heading = (level: number, text: string) => `${"#".repeat(Math.min(level, 6))} ${text}`;

const escapeCell = (value: string) => value.replace(/\|/g, "\\|").replace(/\n/g, " ");

function table(rows: KeyValue[], columns: [string, string] = ["Name", "Value"]): string {
  return [
    `| ${columns[0]} | ${columns[1]} |`,
    "| --- | --- |",
    ...rows.map(
      (row) =>
        `| \`${escapeCell(row.name)}\`${row.enabled ? "" : " (optional)"} | ${row.value ? `\`${escapeCell(row.value)}\`` : ""} |`,
    ),
  ].join("\n");
}

function fence(code: string, language = ""): string {
  const longest = Math.max(2, ...[...code.matchAll(/`+/g)].map((m) => m[0].length));
  const ticks = "`".repeat(longest + 1);

  return `${ticks}${language}\n${code}\n${ticks}`;
}

export function authToMarkdown(auth: Auth | null): string {
  if (!auth) {
    return "None";
  }

  const source = auth.inheritedFrom
    ? ` (inherited from ${auth.inheritedFrom.model} "${auth.inheritedFrom.name}")`
    : "";

  const fields = auth.fields;

  const detail =
    auth.type === "apikey"
      ? ` — \`${String(fields.key ?? "X-API-Key")}\` in ${fields.location === "query" ? "query string" : "header"}`
      : auth.type === "bearer"
        ? " — `Authorization: Bearer <token>`"
        : "";

  return `${authLabel(auth.type)}${detail}${source}`;
}

function bodyToMarkdown(request: PreparedRequest): string | null {
  if (request.kind === "grpc" || request.kind === "websocket") {
    return request.message.trim()
      ? fence(request.message, prettyJson(request.message) ? "json" : "text")
      : null;
  }

  const { body } = request;

  switch (body.type) {
    case "none":
      return null;
    case "json":
    case "text":
      return body.text
        ? `Content type: \`${body.contentType ?? "text/plain"}\`\n\n${fence(body.text, languageForContentType(body.contentType))}`
        : null;
    case "graphql":
      return [
        fence(body.query, "graphql"),
        body.variables ? `Variables:\n\n${fence(body.variables, "json")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    case "form-urlencoded":
      return `Content type: \`${body.contentType}\`\n\n${table(body.fields, ["Field", "Value"])}`;
    case "multipart":
      return `Content type: \`${body.contentType}\`\n\n${table(
        body.fields.map((field) => ({ ...field, value: formFieldValue(field) })),
        ["Field", "Value"],
      )}`;
    case "binary":
      return `Binary file${body.filePath ? `: \`${body.filePath}\`` : ""}`;
  }
}

function requestLine(request: PreparedRequest): string {
  if (request.kind === "http") {
    return `${request.method} ${request.resolvedUrl}`;
  }

  if (request.kind === "grpc") {
    return `gRPC ${request.resolvedUrl} ${grpcMethodPath(request)}`;
  }

  return `WebSocket ${request.resolvedUrl}`;
}

/** Markdown for a single request. `level` is the heading level of the request title. */
export function requestToMarkdown(
  request: PreparedRequest,
  options: MarkdownOptions,
  level = 1,
): string {
  const parts: string[] = [heading(level, request.name)];

  if (request.breadcrumbs.length > 0) {
    parts.push(`Section: ${request.breadcrumbs.map((b) => b.name).join(" › ")}`);
  }

  parts.push(fence(requestLine(request)));

  if (request.description.trim()) {
    parts.push(request.description.trim());
  }

  parts.push(`${heading(level + 1, "Authentication")}\n\n${authToMarkdown(request.auth)}`);

  if (request.kind !== "grpc" && request.pathParameters.length > 0) {
    parts.push(`${heading(level + 1, "Path parameters")}\n\n${table(request.pathParameters)}`);
  }

  if (request.kind !== "grpc" && request.queryParameters.length > 0) {
    parts.push(`${heading(level + 1, "Query parameters")}\n\n${table(request.queryParameters)}`);
  }

  const headers = request.kind === "grpc" ? request.metadata : request.headers;

  if (headers.length > 0) {
    parts.push(
      `${heading(level + 1, request.kind === "grpc" ? "Metadata" : "Headers")}\n\n${table(headers)}`,
    );
  }

  const body = bodyToMarkdown(request);

  if (body) {
    parts.push(`${heading(level + 1, request.kind === "http" ? "Body" : "Message")}\n\n${body}`);
  }

  if (request.responses.length > 0) {
    parts.push(heading(level + 1, "Example responses"));

    for (const response of request.responses) {
      parts.push(
        `${heading(level + 2, response.label)}\n\n${response.empty ? "No response body." : fence(response.code, response.language)}`,
      );
    }
  }

  if (options.examples !== false && request.examples.length > 0) {
    parts.push(heading(level + 1, "Examples"));

    for (const example of request.examples) {
      parts.push(
        `${heading(level + 2, example.label)}\n\n${fence(example.code, example.language)}`,
      );
    }
  }

  return `${parts.join("\n\n")}\n`;
}

function childLinks(
  document: PreparedDocument,
  nodes: TreeNode[],
  options: MarkdownOptions,
): string {
  const lines: string[] = [];

  for (const { node, depth } of walkTree(nodes)) {
    const pad = "  ".repeat(depth);

    if (node.type === "folder") {
      const folder = document.folders[node.id]!;

      lines.push(
        `${pad}- [${folder.name}](${url(folder.markdownUrl, options)})${folder.summary ? `: ${folder.summary}` : ""}`,
      );
    } else {
      const request = document.requests[node.id]!;

      lines.push(
        `${pad}- [${request.name}](${url(request.markdownUrl, options)})${request.summary ? `: ${request.summary}` : ""}`,
      );
    }
  }

  return lines.join("\n");
}

/** Markdown for a folder: description plus links to its contents. */
export function folderToMarkdown(
  document: PreparedDocument,
  folder: PreparedFolder,
  options: MarkdownOptions,
  level = 1,
): string {
  const node = findFolderNode(document.tree, folder.id);
  const parts = [heading(level, folder.name)];

  if (folder.description.trim()) {
    parts.push(folder.description.trim());
  }

  if (folder.auth) {
    parts.push(`Authentication: ${authToMarkdown(folder.auth)}`);
  }

  if (node && node.children.length > 0) {
    parts.push(
      `${heading(level + 1, "Contents")}\n\n${childLinks(document, node.children, options)}`,
    );
  }

  return `${parts.join("\n\n")}\n`;
}

/**
 * Markdown for a custom page: its title, description and body (variables resolved for the default
 * environment). `level` is the heading level of the title.
 */
export function pageToMarkdown(page: PreparedPage, _options: MarkdownOptions, level = 1): string {
  const parts = [heading(level, page.title)];

  if (page.description) {
    parts.push(`> ${page.description.replace(/\n/g, " ")}`);
  }

  if (page.markdown.trim()) {
    parts.push(page.markdown.trim());
  }

  return `${parts.join("\n\n")}\n`;
}

/** Visible pages in navigation order, grouped by their tab and top-level group. */
function pageSections(document: PreparedDocument): Array<{ title: string; pages: PreparedPage[] }> {
  const sections: Array<{ title: string; pages: PreparedPage[] }> = [];
  const seen = new Set<string>();

  for (const { target, tab, groups } of flattenNavigation(document.navigation)) {
    const page = target.type === "page" ? document.pages[target.id] : undefined;

    if (!page || page.hidden || seen.has(page.id)) {
      continue;
    }

    seen.add(page.id);

    const title = [tab.title, groups[0]].filter(Boolean).join(" › ") || "Docs";
    const last = sections.at(-1);

    if (last?.title === title) {
      last.pages.push(page);
    } else {
      sections.push({ title, pages: [page] });
    }
  }

  return sections;
}

/** Markdown for the docs home: overview, environment and table of contents. */
export function indexToMarkdown(document: PreparedDocument, options: MarkdownOptions): string {
  const parts = [heading(1, options.title)];

  if (options.description) {
    parts.push(`> ${options.description}`);
  }

  if (document.workspace.description.trim()) {
    parts.push(document.workspace.description.trim());
  }

  if (document.workspace.auth) {
    parts.push(`${heading(2, "Authentication")}\n\n${authToMarkdown(document.workspace.auth)}`);
  }

  if (document.variables.length > 0) {
    parts.push(
      `${heading(2, `Variables${document.environment ? ` (${document.environment.name})` : ""}`)}\n\n${table(document.variables)}`,
    );
  }

  parts.push(`${heading(2, "Endpoints")}\n\n${childLinks(document, document.tree, options)}`);

  return `${parts.join("\n\n")}\n`;
}

/**
 * `llms.txt` following https://llmstxt.org: H1 title, blockquote summary, then H2 sections with
 * link lists. Top-level folders become sections; root-level requests go in "Endpoints".
 */
export function llmsTxt(
  document: PreparedDocument,
  options: MarkdownOptions & { fullTextUrl?: string },
): string {
  const lines = [heading(1, options.title), ""];

  if (options.description) {
    lines.push(`> ${options.description}`, "");
  }

  const sections = pageSections(document);

  lines.push(
    sections.length > 0
      ? `This is the documentation of the API, including a reference generated from a Yaak workspace. Every page is available as Markdown by appending \`.md\` to its URL.`
      : `This is the API reference generated from a Yaak workspace. Every page is available as Markdown by appending \`.md\` to its URL.`,
    "",
  );

  for (const section of sections) {
    lines.push(heading(2, section.title), "");

    for (const page of section.pages) {
      lines.push(
        `- [${page.title}](${url(page.markdownUrl, options)})${page.summary ? `: ${page.summary}` : ""}`,
      );
    }

    lines.push("");
  }

  const rootRequests = document.tree.filter((node) => node.type === "request");

  if (rootRequests.length > 0) {
    lines.push(heading(2, "Endpoints"), "", childLinks(document, rootRequests, options), "");
  }

  for (const node of document.tree) {
    if (node.type !== "folder") {
      continue;
    }

    const folder = document.folders[node.id]!;

    lines.push(heading(2, folder.name), "");

    if (folder.summary) {
      lines.push(folder.summary, "");
    }

    lines.push(
      `- [${folder.name} overview](${url(folder.markdownUrl, options)})`,
      childLinks(document, node.children, options),
      "",
    );
  }

  if (options.fullTextUrl) {
    lines.push(
      heading(2, "Optional"),
      "",
      `- [Full documentation](${url(options.fullTextUrl, options)}): All endpoints in a single file`,
      "",
    );
  }

  return `${lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd()}\n`;
}

/**
 * `llms-full.txt`: the complete documentation as a single Markdown file. Set `pages: false` for
 * the API reference only (e.g. the Markdown twin of the single-page reference).
 */
export function llmsFullTxt(
  document: PreparedDocument,
  options: MarkdownOptions & { pages?: boolean },
): string {
  const parts = [indexToMarkdown(document, options)];

  if (options.pages !== false) {
    for (const section of pageSections(document)) {
      for (const page of section.pages) {
        parts.push(pageToMarkdown(page, options, 2));
      }
    }
  }

  for (const { node, depth } of walkTree(document.tree)) {
    const level = Math.min(depth + 2, 4);

    if (node.type === "folder") {
      const folder = document.folders[node.id]!;

      parts.push(
        [heading(level, folder.name), folder.description.trim()].filter(Boolean).join("\n\n"),
      );
    } else {
      parts.push(requestToMarkdown(document.requests[node.id]!, options, level).trimEnd());
    }
  }

  return `${parts.map((part) => part.trimEnd()).join("\n\n---\n\n")}\n`;
}
