import { globToRegExp } from "./glob";
import {
  createResolver,
  createVariableMap,
  type ResolvedRequest,
  resolveBaseUrl,
  resolveRequest,
} from "./request";
import { extractResponses, statusText } from "./responses";
import { createSecretMatcher, formatTemplate, tokenizeTemplate } from "./template";
import { walkTree } from "./tree";
import type {
  CodeExample,
  EnvironmentDoc,
  Header,
  HttpBody,
  KeyValue,
  PreparedDocument,
  PreparedFolder,
  PreparedRequest,
  RequestDoc,
  TreeNode,
  WorkspaceDoc,
} from "./types";
import { languageForContentType, prettyJson } from "./util";

export type PagesMode = "single" | "per-request";

export type PrepareOptions = {
  workspace: WorkspaceDoc;
  /** Default environment used to resolve variables. */
  environment: EnvironmentDoc | null;
  /** Additional environments readers can switch to (adds an environment switcher). */
  environments?: EnvironmentDoc[];
  pages: PagesMode;
  /** Normalized base path (leading and trailing slash), e.g. `/` or `/docs/`. */
  base: string;
  variables: { resolve: boolean; hide: readonly string[] };
  filter?: { include?: readonly string[]; exclude?: readonly string[] };
  /** Markdown → HTML (sanitized). */
  renderMarkdown: (markdown: string) => string | Promise<string>;
  /** Code → highlighted HTML. */
  highlight: (code: string, language: string) => string | Promise<string>;
  /** Generates code examples for a resolved request. */
  examples: (request: ResolvedRequest) => Array<Omit<CodeExample, "html">>;
  /** Export metadata passed through to the prepared document. */
  meta?: { yaakVersion?: string; exportedAt?: string | null };
};

export const REDACTED = "<redacted>";

/** Turns a normalized workspace into the data structure themes render. */
export async function prepareDocument(options: PrepareOptions): Promise<PreparedDocument> {
  const { workspace, environment, base } = options;

  const isSecret = createSecretMatcher(options.variables.hide);

  const display = (name: string, value: string) =>
    isSecret(name) && value !== "" && !value.includes("${[") ? REDACTED : formatTemplate(value);

  const displayAll = <T extends KeyValue>(items: T[]): T[] =>
    items.map((item) => ({ ...item, value: display(item.name, item.value) }));

  const tree = filterTree(workspace, options.filter);

  const selectable = [
    environment,
    ...(options.environments ?? []).filter((env) => env.id !== environment?.id),
  ];

  const folders: Record<string, PreparedFolder> = {};
  const requests: Record<string, PreparedRequest> = {};

  const links = (slug: string, anchor: string) => ({
    href: options.pages === "single" ? `${base}#${anchor}` : `${base}${slug}/`,
    markdownUrl: `${base}${slug}.md`,
  });

  for (const { node } of walkTree(tree)) {
    if (node.type === "folder") {
      const folder = workspace.folders[node.id]!;
      const description = formatTemplate(folder.description);

      folders[folder.id] = {
        ...folder,
        headers: displayAll(folder.headers),
        description,
        descriptionHtml: description ? await options.renderMarkdown(description) : "",
        summary: summarize(description),
        ...links(folder.slug, folder.anchor),
      };

      continue;
    }

    const request = workspace.requests[node.id]!;

    const variants = await Promise.all(
      selectable.map(async (env) => {
        const resolveOptions = {
          variables: createVariableMap(
            workspace,
            env,
            request.breadcrumbs.map((crumb) => crumb.id),
          ),
          hide: options.variables.hide,
          resolve: options.variables.resolve,
        };

        const resolved = resolveRequest(request, resolveOptions);

        // Only the base (domain) resolved; path variables, `:path` parameters kept, no query string.
        const url = resolveBaseUrl(request.url, resolveOptions);

        const examples = await Promise.all(
          options.examples(resolved).map(async (example) => ({
            ...example,
            html: await options.highlight(example.code, example.language),
          })),
        );

        return { environmentId: env?.id ?? null, url, resolvedUrl: resolved.url, examples };
      }),
    );

    const { resolvedUrl, examples } = variants[0]!;
    const { description, responses } = extractResponses(formatTemplate(request.description));

    const bodySource = bodySourceOf(request);

    requests[request.id] = {
      ...displayRequest(request, displayAll),
      description,
      resolvedUrl,
      descriptionHtml: description ? await options.renderMarkdown(description) : "",
      summary: summarize(description),
      examples,
      variants,
      responses: await Promise.all(
        responses.map(async (response) => {
          const text = response.status ? statusText(response.status) : "";

          return {
            ...response,
            statusText: text,
            label: response.status ? `${response.status}${text ? ` ${text}` : ""}` : "Response",
            html: await options.highlight(response.code, response.language),
            empty: response.code.trim() === "",
          };
        }),
      ),
      bodyHtml: bodySource ? await options.highlight(bodySource.code, bodySource.language) : null,
      variablesHtml: await graphqlVariablesHtml(request, options.highlight),
      ...links(request.slug, request.anchor),
    } as PreparedRequest;
  }

  const workspaceDescription = formatTemplate(workspace.description);

  return {
    yaakVersion: options.meta?.yaakVersion ?? "",
    exportedAt: options.meta?.exportedAt ?? null,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      description: workspaceDescription,
      descriptionHtml: workspaceDescription
        ? await options.renderMarkdown(workspaceDescription)
        : "",
      headers: displayAll(workspace.headers),
      auth: workspace.auth,
    },
    tree,
    folders,
    requests,
    environment: environment ? toRef(environment) : null,
    environments:
      selectable.length > 1 ? selectable.flatMap((env) => (env ? [toRef(env)] : [])) : [],
    variables: displayVariables(workspace, environment, isSecret, options.variables.resolve),
    variableSets: selectable.map((env) => ({
      environmentId: env?.id ?? null,
      variables: displayVariables(workspace, env, isSecret, options.variables.resolve),
    })),
  };
}

const toRef = (env: EnvironmentDoc) => ({ id: env.id, name: env.name, color: env.color });

function displayRequest(
  request: RequestDoc,
  displayAll: <T extends KeyValue>(items: T[]) => T[],
): RequestDoc {
  const url = formatTemplate(request.url);

  switch (request.kind) {
    case "http":
      return {
        ...request,
        url,
        headers: displayAll<Header>(request.headers),
        queryParameters: displayAll(request.queryParameters),
        pathParameters: displayAll(request.pathParameters),
        body: displayBody(request.body, displayAll),
      };
    case "websocket":
      return {
        ...request,
        url,
        headers: displayAll<Header>(request.headers),
        queryParameters: displayAll(request.queryParameters),
        pathParameters: displayAll(request.pathParameters),
        message: formatTemplate(request.message),
      };
    case "grpc":
      return {
        ...request,
        url,
        metadata: displayAll<Header>(request.metadata),
        message: formatTemplate(request.message),
      };
  }
}

function displayBody(
  body: HttpBody,
  displayAll: <T extends KeyValue>(items: T[]) => T[],
): HttpBody {
  switch (body.type) {
    case "json":
    case "text":
      return { ...body, text: formatTemplate(body.text) };
    case "graphql":
      return {
        ...body,
        query: formatTemplate(body.query),
        variables: body.variables && formatTemplate(body.variables),
      };
    case "form-urlencoded":
    case "multipart":
      return { ...body, fields: displayAll(body.fields) } as HttpBody;
    default:
      return body;
  }
}

/** Highlighted GraphQL variables (pretty-printed when they are valid JSON). */
async function graphqlVariablesHtml(
  request: RequestDoc,
  highlight: PrepareOptions["highlight"],
): Promise<string | null> {
  if (
    request.kind !== "http" ||
    request.body.type !== "graphql" ||
    !request.body.variables?.trim()
  ) {
    return null;
  }

  const text = formatTemplate(request.body.variables);
  return highlight(prettyJson(text) ?? text, "json");
}

function bodySourceOf(request: RequestDoc): { code: string; language: string } | null {
  if (request.kind !== "http") {
    const message = formatTemplate(request.message).trim();

    if (!message) {
      return null;
    }

    return {
      code: prettyJson(message) ?? message,
      language: prettyJson(message) ? "json" : "text",
    };
  }

  const { body } = request;

  if (body.type === "json" && body.text.trim()) {
    const text = formatTemplate(body.text);
    return { code: prettyJson(text) ?? text, language: "json" };
  }

  if (body.type === "graphql" && body.query.trim()) {
    return { code: formatTemplate(body.query), language: "graphql" };
  }

  if (body.type === "text" && body.text.trim()) {
    return { code: formatTemplate(body.text), language: languageForContentType(body.contentType) };
  }

  return null;
}

function displayVariables(
  workspace: WorkspaceDoc,
  environment: EnvironmentDoc | null,
  isSecret: (name: string) => boolean,
  resolve: boolean,
): KeyValue[] {
  const map = createVariableMap(workspace, environment);
  const r = createResolver({ variables: map, hide: [], resolve });

  return [...map.entries()].map(([name, value]) => {
    const secret = isSecret(name) || tokenizeTemplate(value).some((t) => t.type === "function");
    return { name, value: secret ? REDACTED : r(value), enabled: true };
  });
}

/** First sentence (or line) of a Markdown description, as plain text. */
export function summarize(markdown: string, max = 160): string {
  const firstParagraph =
    markdown
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .find((p) => p && !p.startsWith("```") && !p.startsWith("|") && !p.startsWith("#")) ?? "";

  const plain = firstParagraph
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const sentence = plain.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? plain;

  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}...` : sentence;
}

/** Applies include/exclude glob filters (matched against slugs) and prunes emptied folders. */
export function filterTree(
  workspace: WorkspaceDoc,
  filter: PrepareOptions["filter"] = {},
): TreeNode[] {
  const include = (filter.include ?? []).map(globToRegExp);
  const exclude = (filter.exclude ?? []).map(globToRegExp);

  if (include.length === 0 && exclude.length === 0) {
    return workspace.tree;
  }

  const matches = (patterns: RegExp[], slug: string) => patterns.some((re) => re.test(slug));
  const slugOf = (node: TreeNode) =>
    node.type === "folder" ? workspace.folders[node.id]!.slug : workspace.requests[node.id]!.slug;

  const prune = (nodes: TreeNode[], ancestorIncluded: boolean): TreeNode[] =>
    nodes.flatMap((node): TreeNode[] => {
      const slug = slugOf(node);

      if (matches(exclude, slug)) {
        return [];
      }

      const included = ancestorIncluded || include.length === 0 || matches(include, slug);

      if (node.type === "request") {
        return included ? [node] : [];
      }

      const children = prune(node.children, included);

      return children.length > 0 || (included && include.length > 0 && matches(include, slug))
        ? [{ ...node, children }]
        : [];
    });

  return prune(workspace.tree, false);
}
