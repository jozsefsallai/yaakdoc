import { z } from "zod";
import {
  type RawEnvironment,
  type RawFolder,
  type RawGrpcRequest,
  type RawHttpRequest,
  type RawKeyValue,
  type RawWebsocketRequest,
  type RawWorkspace,
  type RawYaakExport,
  rawMultipartFieldSchema,
  rawYaakExportSchema,
} from "./schema";
import { createUniqueSlugger, slugify } from "./slug";
import type {
  Auth,
  Breadcrumb,
  EnvironmentDoc,
  FolderDoc,
  Header,
  HttpBody,
  InheritedFrom,
  KeyValue,
  RequestDoc,
  TreeNode,
  WorkspaceDoc,
  YaakDocument,
} from "./types";
import { escapeRegExp, grpcMethodPath, tryParseJson } from "./util";

export class YaakExportError extends Error {
  override name = "YaakExportError";
}

/** Returns `true` if the value looks like a Yaak export (has `yaakSchema` and `resources`). */
export function isYaakExport(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "yaakSchema" in value &&
    "resources" in value &&
    typeof (value as { resources: unknown }).resources === "object"
  );
}

/** Validates a raw Yaak export (any schema version) and applies defaults. */
export function parseYaakExport(input: unknown): RawYaakExport {
  if (!isYaakExport(input)) {
    throw new YaakExportError(
      "This file is not a Yaak export (expected `yaakSchema` and `resources` keys).",
    );
  }

  const result = rawYaakExportSchema.safeParse(input);
  if (!result.success) {
    throw new YaakExportError(`Invalid Yaak export:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
}

/** Parses and normalizes a raw Yaak export into a {@link YaakDocument}. */
export function normalize(input: unknown): YaakDocument {
  const raw = parseYaakExport(input);
  const { resources } = raw;

  const workspaces = resources.workspaces.map((workspace) =>
    normalizeWorkspace(workspace, {
      environments: resources.environments.filter((env) => env.workspaceId === workspace.id),
      folders: resources.folders.filter((folder) => folder.workspaceId === workspace.id),
      httpRequests: resources.httpRequests.filter((req) => req.workspaceId === workspace.id),
      grpcRequests: resources.grpcRequests.filter((req) => req.workspaceId === workspace.id),
      websocketRequests: resources.websocketRequests.filter(
        (req) => req.workspaceId === workspace.id,
      ),
    }),
  );

  return {
    yaakVersion: raw.yaakVersion,
    yaakSchema: raw.yaakSchema,
    exportedAt: raw.timestamp ?? null,
    workspaces,
  };
}

type WorkspaceResources = {
  environments: RawEnvironment[];
  folders: RawFolder[];
  httpRequests: RawHttpRequest[];
  grpcRequests: RawGrpcRequest[];
  websocketRequests: RawWebsocketRequest[];
};

type AnyRawRequest =
  | ({ kind: "http" } & RawHttpRequest)
  | ({ kind: "grpc" } & RawGrpcRequest)
  | ({ kind: "websocket" } & RawWebsocketRequest);

const byOrder = <T extends { sortPriority: number; name: string }>(a: T, b: T) =>
  a.sortPriority - b.sortPriority || a.name.localeCompare(b.name);

function normalizeWorkspace(workspace: RawWorkspace, resources: WorkspaceResources): WorkspaceDoc {
  const workspaceSource: InheritedFrom = {
    model: "workspace",
    id: workspace.id,
    name: workspace.name,
  };

  const workspaceHeaders = toHeaders(workspace.headers, workspaceSource);
  const workspaceAuth = toAuth(workspace, workspaceSource);

  const rawFolders = new Map(resources.folders.map((folder) => [folder.id, folder]));
  const allRequests: AnyRawRequest[] = [
    ...resources.httpRequests.map((req) => ({ ...req, kind: "http" as const })),
    ...resources.grpcRequests.map((req) => ({ ...req, kind: "grpc" as const })),
    ...resources.websocketRequests.map((req) => ({ ...req, kind: "websocket" as const })),
  ];

  // Orphans (pointing to missing folders) are attached to the workspace root.
  const parentOf = (folderId: string | null) =>
    folderId && rawFolders.has(folderId) ? folderId : null;

  const childFolders = groupBy(resources.folders, (folder) => parentOf(folder.folderId));
  const childRequests = groupBy(allRequests, (req) => parentOf(req.folderId));

  const folders: Record<string, FolderDoc> = {};
  const requests: Record<string, RequestDoc> = {};
  const anchors = createUniqueSlugger();
  const slugs = createUniqueSlugger();

  type Context = { breadcrumbs: Breadcrumb[]; headers: Header[]; auth: Auth | null };

  const walk = (parentId: string | null, context: Context, visited: Set<string>): TreeNode[] => {
    const nodes: Array<{ node: TreeNode; sortPriority: number; name: string }> = [];

    for (const folder of childFolders.get(parentId) ?? []) {
      if (visited.has(folder.id)) {
        continue; // guard against cyclic folder references
      }

      const source: InheritedFrom = { model: "folder", id: folder.id, name: folder.name };
      const slug = slugs(childSlug(context.breadcrumbs, folder.name));

      const folderHeaders = toHeaders(folder.headers, source);
      const folderAuth = resolveAuth(
        toAuth(folder, source),
        folder.authenticationType,
        context.auth,
      );

      folders[folder.id] = {
        id: folder.id,
        name: folder.name,
        slug,
        anchor: anchors(slug.replaceAll("/", "-")),
        description: folder.description,
        folderId: parentOf(folder.folderId),
        breadcrumbs: context.breadcrumbs,
        headers: folderHeaders,
        auth: folderAuth,
        sortPriority: folder.sortPriority,
      };

      const children = walk(
        folder.id,
        {
          breadcrumbs: [...context.breadcrumbs, { id: folder.id, name: folder.name, slug }],
          headers: mergeHeaders(context.headers, folderHeaders),
          auth: folderAuth,
        },
        new Set([...visited, folder.id]),
      );

      nodes.push({
        node: { type: "folder", id: folder.id, children },
        sortPriority: folder.sortPriority,
        name: folder.name,
      });
    }

    for (const req of childRequests.get(parentId) ?? []) {
      const name = req.name || defaultRequestName(req);
      const slug = slugs(childSlug(context.breadcrumbs, name));
      const doc = normalizeRequest(req, {
        name,
        slug,
        anchor: anchors(slug.replaceAll("/", "-")),
        context,
      });

      requests[req.id] = doc;
      nodes.push({ node: { type: "request", id: req.id }, sortPriority: req.sortPriority, name });
    }

    return nodes.sort(byOrder).map((entry) => entry.node);
  };

  const tree = walk(
    null,
    { breadcrumbs: [], headers: workspaceHeaders, auth: workspaceAuth },
    new Set(),
  );

  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    headers: workspaceHeaders,
    auth: workspaceAuth,
    tree,
    folders,
    requests,
    ...normalizeEnvironments(workspace, resources.environments),
  };
}

function normalizeRequest(
  req: AnyRawRequest,
  meta: {
    name: string;
    slug: string;
    anchor: string;
    context: { breadcrumbs: Breadcrumb[]; headers: Header[]; auth: Auth | null };
  },
): RequestDoc {
  const base = {
    id: req.id,
    name: meta.name,
    slug: meta.slug,
    anchor: meta.anchor,
    description: req.description,
    folderId: meta.context.breadcrumbs.at(-1)?.id ?? null,
    breadcrumbs: meta.context.breadcrumbs,
    url: req.url,
    auth: resolveAuth(toAuth(req), req.authenticationType, meta.context.auth),
    sortPriority: req.sortPriority,
  };

  switch (req.kind) {
    case "http": {
      const params = splitUrlParameters(req.url, req.urlParameters);

      return {
        ...base,
        kind: "http",
        method: req.method,
        headers: mergeHeaders(meta.context.headers, toHeaders(req.headers)),
        ...params,
        body: toHttpBody(req.bodyType, req.body),
      };
    }
    case "websocket": {
      const params = splitUrlParameters(req.url, req.urlParameters);

      return {
        ...base,
        kind: "websocket",
        headers: mergeHeaders(meta.context.headers, toHeaders(req.headers)),
        ...params,
        message: req.message,
      };
    }
    case "grpc":
      return {
        ...base,
        kind: "grpc",
        service: req.service,
        method: req.method,
        message: req.message,
        metadata: toHeaders(req.metadata),
      };
  }
}

/** Slug of a child item: the parent folder's (already unique) slug plus the item's own slug. */
function childSlug(breadcrumbs: Breadcrumb[], name: string): string {
  const parent = breadcrumbs.at(-1)?.slug;
  return parent ? `${parent}/${slugify(name)}` : slugify(name);
}

function defaultRequestName(req: AnyRawRequest): string {
  if (req.kind === "grpc") {
    return grpcMethodPath(req) || "gRPC request";
  }

  return req.url || "Untitled request";
}

/* ---------------------------------------------------------------------------------------------- */

const toKeyValues = (items: RawKeyValue[]): KeyValue[] =>
  items
    .filter((item) => item.name !== "" || item.value !== "")
    .map((item) => ({ name: item.name, value: item.value, enabled: item.enabled !== false }));

function toHeaders(items: RawKeyValue[], inheritedFrom?: InheritedFrom): Header[] {
  return toKeyValues(items)
    .filter((item) => item.enabled && item.name !== "")
    .map((item) => (inheritedFrom ? { ...item, inheritedFrom } : item));
}

/** Child headers override parent headers with the same (case-insensitive) name. */
function mergeHeaders(parent: Header[], child: Header[]): Header[] {
  const childNames = new Set(child.map((header) => header.name.toLowerCase()));
  return [...parent.filter((header) => !childNames.has(header.name.toLowerCase())), ...child];
}

function toAuth(
  model: { authenticationType: string | null; authentication: Record<string, unknown> },
  inheritedFrom?: InheritedFrom,
): Auth | null {
  const type = model.authenticationType;
  if (!type || type === "none" || model.authentication.disabled === true) {
    return null;
  }

  return { type, fields: model.authentication, ...(inheritedFrom ? { inheritedFrom } : {}) };
}

/**
 * In Yaak, `authenticationType: null` means "inherit from parent" and `"none"` disables auth.
 */
function resolveAuth(own: Auth | null, type: string | null, parent: Auth | null): Auth | null {
  if (type === null || type === undefined) {
    return parent;
  }

  return own;
}

/**
 * Yaak stores both path (`:id`) and query parameters in `urlParameters`. Colon-prefixed names
 * matching a `:name` segment in the URL are path parameters, everything else goes in the query.
 */
function splitUrlParameters(url: string, params: RawKeyValue[]) {
  const pathParameters: KeyValue[] = [];
  const queryParameters: KeyValue[] = [];

  for (const param of toKeyValues(params)) {
    if (param.name.startsWith(":")) {
      const name = param.name.slice(1);

      if (new RegExp(`:${escapeRegExp(name)}(?![\\w-])`).test(url)) {
        pathParameters.push({ ...param, name });
      }

      continue;
    }

    if (param.name !== "") {
      queryParameters.push(param);
    }
  }

  return { pathParameters, queryParameters };
}

function toHttpBody(bodyType: string | null, body: Record<string, unknown>): HttpBody {
  const str = (key: string) => (typeof body[key] === "string" ? (body[key] as string) : "");

  if (!bodyType || bodyType === "none") {
    return { type: "none" };
  }

  if (bodyType === "graphql") {
    let query = str("query");
    let variables: string | null = typeof body.variables === "string" ? body.variables : null;

    // Some importers store `{ query, variables }` as JSON in `text`.
    if (!query && str("text")) {
      const parsed = tryParseJson(str("text"));

      if (parsed.ok && parsed.value && typeof parsed.value === "object") {
        const graphql = parsed.value as { query?: string; variables?: unknown };
        query = graphql.query ?? "";

        if (graphql.variables !== undefined) {
          variables = JSON.stringify(graphql.variables, null, 2);
        }
      } else {
        query = str("text");
      }
    }

    return {
      type: "graphql",
      contentType: "application/json",
      query,
      variables: variables || null,
    };
  }

  if (bodyType === "application/x-www-form-urlencoded") {
    const fields = Array.isArray(body.form) ? body.form : [];

    return {
      type: "form-urlencoded",
      contentType: bodyType,
      fields: toKeyValues(fields.map((field) => rawMultipartFieldSchema.parse(field))).filter(
        (field) => field.enabled,
      ),
    };
  }

  if (bodyType === "multipart/form-data") {
    const fields = Array.isArray(body.form) ? body.form : [];

    return {
      type: "multipart",
      contentType: bodyType,
      fields: fields
        .map((field) => rawMultipartFieldSchema.parse(field))
        .filter((field) => field.enabled !== false && field.name !== "")
        .map((field) => ({
          name: field.name,
          value: field.value,
          enabled: true,
          ...(field.file ? { file: field.file } : {}),
          ...(field.contentType ? { contentType: field.contentType } : {}),
        })),
    };
  }

  if (bodyType === "binary") {
    return {
      type: "binary",
      contentType: null,
      filePath: typeof body.filePath === "string" ? body.filePath : null,
    };
  }

  if (bodyType === "application/json" || bodyType.endsWith("+json")) {
    return { type: "json", contentType: bodyType, text: str("text") };
  }

  return { type: "text", contentType: bodyType === "other" ? null : bodyType, text: str("text") };
}

/* ---------------------------------------------------------------------------------------------- */

function normalizeEnvironments(workspace: RawWorkspace, environments: RawEnvironment[]) {
  const docs: EnvironmentDoc[] = environments.map((env) => {
    const variables = toKeyValues(env.variables).filter((v) => v.enabled && v.name !== "");

    const common = {
      id: env.id,
      name: env.name,
      color: env.color ?? null,
      public: env.public !== false,
      variables,
      sortPriority: env.sortPriority,
    };

    // Schema v5+
    if (env.parentModel === "workspace") {
      return { ...common, scope: { model: "workspace" } };
    }

    if (env.parentModel === "folder" && env.parentId) {
      return { ...common, scope: { model: "folder", folderId: env.parentId } };
    }

    if (env.parentModel === "environment") {
      return { ...common, scope: { model: "environment", parentId: env.parentId ?? null } };
    }

    // Schema v4
    if (env.base !== undefined) {
      return env.base
        ? { ...common, scope: { model: "workspace" } }
        : { ...common, scope: { model: "environment", parentId: null } };
    }

    // Schema ≤ v3
    if (env.environmentId === null) {
      return { ...common, scope: { model: "workspace" } };
    }

    return { ...common, scope: { model: "environment", parentId: env.environmentId ?? null } };
  });

  let baseEnvironment = docs.find((env) => env.scope.model === "workspace") ?? null;

  // Schema ≤ v2 stored global variables on the workspace itself.
  if (workspace.variables?.length) {
    const legacy = toKeyValues(workspace.variables).filter((v) => v.enabled && v.name !== "");

    baseEnvironment = baseEnvironment
      ? { ...baseEnvironment, variables: [...legacy, ...baseEnvironment.variables] }
      : {
          id: `base_env_${workspace.id}`,
          name: "Global Variables",
          color: null,
          public: true,
          scope: { model: "workspace" },
          variables: legacy,
          sortPriority: 0,
        };
  }

  const folderEnvironments: Record<string, EnvironmentDoc[]> = {};

  for (const env of docs) {
    if (env.scope.model === "folder") {
      const list = folderEnvironments[env.scope.folderId] ?? [];
      list.push(env);
      folderEnvironments[env.scope.folderId] = list;
    }
  }

  return {
    baseEnvironment,
    environments: docs.filter((env) => env.scope.model === "environment").sort(byOrder),
    folderEnvironments,
  };
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();

  for (const item of items) {
    const k = key(item);
    const group = map.get(k);

    if (group) {
      group.push(item);
    } else {
      map.set(k, [item]);
    }
  }

  return map;
}
