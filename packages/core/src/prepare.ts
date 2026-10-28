import { globToRegExp } from "./glob";
import { type NavigationInput, resolveNavigation } from "./navigation";
import { pageLinks } from "./pages";
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
  PageDoc,
  PageVariant,
  PreparedDocument,
  PreparedFolder,
  PreparedPage,
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
  /**
   * Path of the API reference (overview, folders and requests) relative to `base`, e.g.
   * `reference`. Defaults to `""` (the site root).
   */
  apiPath?: string;
  /** Custom Markdown pages. */
  customPages?: readonly PageDoc[];
  /** Navigation of the pages and the API reference (generated from the pages when omitted). */
  navigation?: NavigationInput;
  variables: { resolve: boolean; hide: readonly string[] };
  filter?: { include?: readonly string[]; exclude?: readonly string[] };
  /** Markdown → HTML (sanitized). */
  renderMarkdown: (markdown: string) => string | Promise<string>;
  /**
   * Renders a custom page: one variant per selectable environment (default first), or a single one
   * when the page is the same everywhere. Differing parts must be wrapped in
   * `<div data-yd-env="<id>">`, all but the first `hidden`. Defaults to rendering each variant with
   * `renderMarkdown` and wrapping it whole.
   */
  renderPage?: (variants: PageVariant[], page: PageDoc) => string | Promise<string>;
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

  const apiPath = (options.apiPath ?? "").replace(/^\/+|\/+$/g, "");
  const referenceBase = apiPath ? `${base}${apiPath}/` : base;

  const links = (slug: string, anchor: string) => ({
    href: options.pages === "single" ? `${referenceBase}#${anchor}` : `${referenceBase}${slug}/`,
    markdownUrl: `${referenceBase}${slug}.md`,
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

  const pages = await preparePages(options, selectable, {
    base,
    apiPath,
    reserved: referenceBase === base ? reservedSlugs(folders, requests) : new Map(),
  });

  const navigation = resolveNavigation(options.navigation, options.customPages ?? [], {
    href: (target) => (target.type === "api" ? referenceBase : pages[target.id]!.href),
  });

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
    pages,
    navigation,
    referenceBase,
  };
}

/** Slugs taken by the API reference when it shares the site root with the pages. */
function reservedSlugs(
  folders: Record<string, PreparedFolder>,
  requests: Record<string, PreparedRequest>,
): Map<string, string> {
  const reserved = new Map<string, string>([["", "the API overview"]]);

  for (const folder of Object.values(folders)) {
    reserved.set(folder.slug, `the folder "${folder.name}"`);
  }

  for (const request of Object.values(requests)) {
    reserved.set(request.slug, `the request "${request.name}"`);
  }

  return reserved;
}

/**
 * Prepares the custom pages: links, and the body rendered once per environment (variables
 * resolved, secrets left as placeholders). Pages that render the same everywhere get one variant.
 */
async function preparePages(
  options: PrepareOptions,
  selectable: Array<EnvironmentDoc | null>,
  { base, apiPath, reserved }: { base: string; apiPath: string; reserved: Map<string, string> },
): Promise<Record<string, PreparedPage>> {
  const render =
    options.renderPage ??
    (async (variants: PageVariant[]) => {
      if (variants.length === 1) {
        return options.renderMarkdown(variants[0]!.markdown);
      }

      const parts = await Promise.all(
        variants.map(async (variant, index) => {
          const id = (variant.environmentId ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
          const html = await options.renderMarkdown(variant.markdown);

          return `<div data-yd-env="${id}"${index > 0 ? " hidden" : ""}>${html}</div>`;
        }),
      );

      return parts.join("");
    });

  const resolvers = selectable.map((env) => ({
    environmentId: env?.id ?? null,
    resolve: createResolver({
      variables: createVariableMap(options.workspace, env),
      hide: options.variables.hide,
      resolve: options.variables.resolve,
    }),
  }));

  const pages: Record<string, PreparedPage> = {};
  const slugs = new Map<string, string>();

  for (const page of options.customPages ?? []) {
    const taken = reserved.get(page.slug) ?? slugs.get(page.slug);

    if (taken !== undefined) {
      throw new Error(
        `The page "${page.id}" has the same URL as ${taken}. Rename the page, or move the API reference with \`apiPath\`.`,
      );
    }

    if (apiPath && (page.slug === apiPath || page.slug.startsWith(`${apiPath}/`))) {
      throw new Error(
        `The page "${page.id}" is inside the API reference path "/${apiPath}/". Rename the page or change \`apiPath\`.`,
      );
    }

    slugs.set(page.slug, `the page "${page.id}"`);

    const sources: PageVariant[] = resolvers.map(({ environmentId, resolve }) => ({
      environmentId,
      markdown: resolve(page.body),
    }));

    const distinct = new Set(sources.map((source) => source.markdown));
    const html = await render(distinct.size === 1 ? sources.slice(0, 1) : sources, page);

    const resolveDefault = resolvers[0]!.resolve;
    const markdown = sources[0]!.markdown;
    const description = resolveDefault(page.description);

    pages[page.id] = {
      ...page,
      title: resolveDefault(page.title),
      description,
      summary: description || summarize(markdown),
      markdown,
      html,
      ...pageLinks(base, page.slug),
    };
  }

  return pages;
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
