import { createSecretMatcher, formatTemplate, resolveTemplate, tokenizeTemplate } from "./template";
import type {
  Auth,
  EnvironmentDoc,
  GrpcRequestDoc,
  HttpBody,
  HttpRequestDoc,
  KeyValue,
  RequestDoc,
  WebsocketRequestDoc,
  WorkspaceDoc,
} from "./types";
import { escapeRegExp } from "./util";

/**
 * Picks the sub environment used to resolve variables. Matches by id or (case-insensitive) name.
 * Without a preference, the first public environment is used. Private environments are only
 * selected when requested explicitly.
 */
export function selectEnvironment(
  workspace: WorkspaceDoc,
  preference?: string | null,
): EnvironmentDoc | null {
  if (preference) {
    const wanted = preference.toLowerCase();

    const match = workspace.environments.find(
      (env) => env.id === preference || env.name.toLowerCase() === wanted,
    );

    if (!match) {
      const available = workspace.environments.map((env) => `"${env.name}"`).join(", ");

      throw new Error(
        `Environment "${preference}" not found in workspace "${workspace.name}".${available ? ` Available: ${available}.` : ""}`,
      );
    }

    return match;
  }

  return workspace.environments.find((env) => env.public) ?? null;
}

/**
 * Builds the variable scope for a request, following Yaak's precedence:
 * base environment < selected sub environment < folder environments (outermost first).
 */
export function createVariableMap(
  workspace: WorkspaceDoc,
  environment: EnvironmentDoc | null,
  folderIds: readonly string[] = [],
): Map<string, string> {
  const map = new Map<string, string>();

  const add = (vars: KeyValue[] | undefined) => {
    for (const variable of vars ?? []) {
      map.set(variable.name, variable.value);
    }
  };

  add(workspace.baseEnvironment?.variables);
  add(environment?.variables);

  for (const folderId of folderIds) {
    for (const env of workspace.folderEnvironments[folderId] ?? []) {
      add(env.variables);
    }
  }

  return map;
}

export type ResolveOptions = {
  variables: ReadonlyMap<string, string>;
  /** Variable name patterns that must never be inlined. */
  hide?: readonly string[];
  /** Whether to inline variable values at all. When `false`, every variable is a placeholder. */
  resolve?: boolean;
  placeholder?: (name: string) => string;
};

export type ResolvedAuth =
  | { type: "basic"; username: string; password: string }
  | { type: "bearer"; prefix: string; token: string }
  | { type: "apikey"; location: "header" | "query"; key: string; value: string }
  | { type: "other"; name: string; header: { name: string; value: string } | null };

type ResolvedBase = {
  name: string;
  url: string;
  auth: ResolvedAuth | null;
};

export type ResolvedHttpRequest = ResolvedBase & {
  kind: "http";
  method: string;
  /** Headers, without auth headers (see {@link applyAuth}). */
  headers: Array<{ name: string; value: string }>;
  body: HttpBody;
};

export type ResolvedWebsocketRequest = ResolvedBase & {
  kind: "websocket";
  headers: Array<{ name: string; value: string }>;
  message: string;
};

export type ResolvedGrpcRequest = ResolvedBase & {
  kind: "grpc";
  service: string | null;
  method: string | null;
  metadata: Array<{ name: string; value: string }>;
  message: string;
};

export type ResolvedRequest = ResolvedHttpRequest | ResolvedWebsocketRequest | ResolvedGrpcRequest;

export function createResolver(options: ResolveOptions): (input: string) => string {
  const isHidden = createSecretMatcher(options.hide ?? []);
  const variables = options.resolve === false ? new Map<string, string>() : options.variables;

  return (input) =>
    resolveTemplate(input, {
      variables,
      isHidden,
      ...(options.placeholder ? { placeholder: options.placeholder } : {}),
    });
}

/** Matches a URL (with or without scheme) whose host is complete and whose path has started. */
const PATH_STARTED_RE = /^(?:[a-z][a-z\d+.-]*:\/\/[^/?#]+|[^/?#:]+(?::\d+)?)[/?#]/i;

/**
 * Resolves only the variables that make up the base of a URL (scheme, host and base path, e.g.
 * `${[ base_url ]}`). Variables after the path has started stay `{{placeholders}}`, so
 * `${[ base_url ]}/stores/${[ store_id ]}` becomes `https://api.acme.dev/v1/stores/{{store_id}}`.
 */
export function resolveBaseUrl(url: string, options: ResolveOptions): string {
  const resolve = createResolver(options);
  let out = "";

  for (const token of tokenizeTemplate(url)) {
    if (token.type === "text") {
      out += token.value;
    } else {
      out += PATH_STARTED_RE.test(out)
        ? formatTemplate(token.raw, options.placeholder)
        : resolve(token.raw);
    }
  }

  return out;
}

/** Resolves templates in a request so it can be turned into a runnable code example. */
export function resolveRequest(
  request: HttpRequestDoc,
  options: ResolveOptions,
): ResolvedHttpRequest;
export function resolveRequest(
  request: WebsocketRequestDoc,
  options: ResolveOptions,
): ResolvedWebsocketRequest;
export function resolveRequest(
  request: GrpcRequestDoc,
  options: ResolveOptions,
): ResolvedGrpcRequest;
export function resolveRequest(request: RequestDoc, options: ResolveOptions): ResolvedRequest;
export function resolveRequest(request: RequestDoc, options: ResolveOptions): ResolvedRequest {
  const r = createResolver(options);

  const kv = (items: Array<{ name: string; value: string }>) =>
    items.map((item) => ({ name: r(item.name), value: r(item.value) }));

  const auth = resolveAuth(request.auth, r);

  switch (request.kind) {
    case "http":
      return {
        kind: "http",
        name: request.name,
        method: request.method,
        url: buildUrl(request, r),
        headers: kv(request.headers),
        body: resolveBody(request.body, r),
        auth,
      };
    case "websocket":
      return {
        kind: "websocket",
        name: request.name,
        url: buildUrl(request, r),
        headers: kv(request.headers),
        message: r(request.message),
        auth,
      };
    case "grpc":
      return {
        kind: "grpc",
        name: request.name,
        url: r(request.url),
        service: request.service,
        method: request.method,
        metadata: kv(request.metadata),
        message: r(request.message),
        auth,
      };
  }
}

/** Builds the full URL: resolved templates, path parameters substituted, query parameters merged. */
export function buildUrl(
  request: Pick<HttpRequestDoc, "url" | "pathParameters" | "queryParameters">,
  resolve: (input: string) => string = (input) => input,
): string {
  let url = resolve(request.url);

  for (const param of request.pathParameters) {
    if (!param.enabled || param.value === "") {
      continue;
    }

    url = url.replace(
      new RegExp(`:${escapeRegExp(param.name)}(?![\\w-])`, "g"),
      encodeReadable(resolve(param.value)),
    );
  }

  const query = request.queryParameters
    .filter((param) => param.enabled)
    .map(
      (param) => `${encodeReadable(resolve(param.name))}=${encodeReadable(resolve(param.value))}`,
    )
    .join("&");

  if (!query) {
    return url;
  }

  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
}

/** `encodeURIComponent`, but keeps `{{placeholders}}` readable. */
function encodeReadable(value: string): string {
  return encodeURIComponent(value).replace(/%7B%7B(.+?)%7D%7D/g, (_, name: string) => {
    return `{{${decodeURIComponent(name)}}}`;
  });
}

function resolveBody(body: HttpBody, r: (input: string) => string): HttpBody {
  switch (body.type) {
    case "none":
    case "binary":
      return body;
    case "json":
    case "text":
      return { ...body, text: r(body.text) };
    case "graphql":
      return {
        ...body,
        query: r(body.query),
        variables: body.variables ? r(body.variables) : null,
      };
    case "form-urlencoded":
      return {
        ...body,
        fields: body.fields.map((field) => ({
          ...field,
          name: r(field.name),
          value: r(field.value),
        })),
      };
    case "multipart":
      return {
        ...body,
        fields: body.fields.map((field) => ({
          ...field,
          name: r(field.name),
          value: r(field.value),
          ...(field.file ? { file: r(field.file) } : {}),
        })),
      };
  }
}

const field = (auth: Auth, key: string) =>
  typeof auth.fields[key] === "string" ? (auth.fields[key] as string) : "";

function resolveAuth(auth: Auth | null, r: (input: string) => string): ResolvedAuth | null {
  if (!auth) {
    return null;
  }

  switch (auth.type) {
    case "basic":
      return {
        type: "basic",
        username: r(field(auth, "username")),
        password: r(field(auth, "password")),
      };
    case "bearer":
      return {
        type: "bearer",
        prefix: field(auth, "prefix") || "Bearer",
        token: r(field(auth, "token")),
      };
    case "apikey":
      return {
        type: "apikey",
        location: field(auth, "location") === "query" ? "query" : "header",
        key: r(field(auth, "key")) || "X-API-Key",
        value: r(field(auth, "value")),
      };
    case "jwt":
    case "oauth2":
    case "oauth1": {
      const prefix = field(auth, "headerPrefix") || (auth.type === "oauth1" ? "OAuth" : "Bearer");
      return {
        type: "other",
        name: auth.type,
        header: { name: "Authorization", value: `${prefix} {{${auth.type}_token}}` },
      };
    }
    default:
      return { type: "other", name: auth.type, header: null };
  }
}

export const AUTH_LABELS: Record<string, string> = {
  basic: "Basic Auth",
  bearer: "Bearer Token",
  apikey: "API Key",
  jwt: "JWT",
  oauth1: "OAuth 1.0",
  oauth2: "OAuth 2.0",
  digest: "Digest Auth",
  awsv4: "AWS Signature v4",
  windows: "NTLM",
  ntlm: "NTLM",
};

export function authLabel(type: string): string {
  return AUTH_LABELS[type] ?? type;
}

/** Base64-encodes UTF-8 text in any JavaScript runtime. */
export function toBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

/**
 * Converts structured auth into headers/query parameters for generators that don't special-case it.
 */
export function applyAuth<T extends ResolvedHttpRequest | ResolvedWebsocketRequest>(request: T): T {
  const { auth } = request;
  if (!auth) {
    return request;
  }

  const withHeader = (name: string, value: string): T => ({
    ...request,
    headers: [
      ...request.headers.filter((h) => h.name.toLowerCase() !== name.toLowerCase()),
      { name, value },
    ],
  });

  switch (auth.type) {
    case "basic": {
      const credentials = `${auth.username}:${auth.password}`;
      return withHeader(
        "Authorization",
        credentials.includes("{{")
          ? "Basic {{basic_credentials}}"
          : `Basic ${toBase64(credentials)}`,
      );
    }
    case "bearer":
      return withHeader("Authorization", `${auth.prefix} ${auth.token}`.trim());
    case "apikey": {
      if (auth.location === "header") {
        return withHeader(auth.key, auth.value);
      }

      const separator = request.url.includes("?") ? "&" : "?";

      return {
        ...request,
        url: `${request.url}${separator}${encodeURIComponent(auth.key)}=${auth.value.startsWith("{{") ? auth.value : encodeURIComponent(auth.value)}`,
      };
    }
    case "other":
      return auth.header ? withHeader(auth.header.name, auth.header.value) : request;
  }
}
