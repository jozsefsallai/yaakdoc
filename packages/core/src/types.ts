/**
 * The normalized, documentation-oriented model of a Yaak export.
 *
 * Everything here is plain, JSON-serializable data (no classes, no Maps) so it can be passed across
 * process/bundle boundaries and into React server components without transformation.
 */

export type KeyValue = {
  name: string;
  value: string;
  enabled: boolean;
};

export type InheritedFrom = { model: "workspace" | "folder"; id: string; name: string };

export type Header = KeyValue & {
  /** Set when the header is inherited from the workspace or a parent folder. */
  inheritedFrom?: InheritedFrom;
};

export type Auth = {
  /** Yaak authentication type, e.g. `basic`, `bearer`, `apikey`, `oauth2`, `jwt`, ... */
  type: string;
  fields: Record<string, unknown>;
  inheritedFrom?: InheritedFrom;
};

export type MultipartField = KeyValue & { file?: string; contentType?: string };

export type HttpBody =
  | { type: "none" }
  | { type: "json"; contentType: string; text: string }
  | { type: "text"; contentType: string | null; text: string }
  | { type: "form-urlencoded"; contentType: string; fields: KeyValue[] }
  | { type: "multipart"; contentType: string; fields: MultipartField[] }
  | { type: "graphql"; contentType: string; query: string; variables: string | null }
  | { type: "binary"; contentType: string | null; filePath: string | null };

export type Breadcrumb = { id: string; name: string; slug: string };

type RequestBase = {
  id: string;
  name: string;
  /** Hierarchical, unique slug, e.g. `users/get-user`. */
  slug: string;
  /** Flat, unique, anchor-safe id, e.g. `users-get-user`. */
  anchor: string;
  description: string;
  folderId: string | null;
  /** Ancestor folders, outermost first. */
  breadcrumbs: Breadcrumb[];
  url: string;
  /** Effective authentication (inherited from folders/workspace if not set on the request). */
  auth: Auth | null;
  sortPriority: number;
};

export type HttpRequestDoc = RequestBase & {
  kind: "http";
  method: string;
  /** Effective headers: workspace → folders → request. Only enabled headers are included. */
  headers: Header[];
  queryParameters: KeyValue[];
  pathParameters: KeyValue[];
  body: HttpBody;
};

export type GrpcRequestDoc = RequestBase & {
  kind: "grpc";
  service: string | null;
  method: string | null;
  message: string;
  metadata: Header[];
};

export type WebsocketRequestDoc = RequestBase & {
  kind: "websocket";
  headers: Header[];
  queryParameters: KeyValue[];
  pathParameters: KeyValue[];
  message: string;
};

export type RequestDoc = HttpRequestDoc | GrpcRequestDoc | WebsocketRequestDoc;
export type RequestKind = RequestDoc["kind"];

export type FolderDoc = {
  id: string;
  name: string;
  slug: string;
  anchor: string;
  description: string;
  folderId: string | null;
  breadcrumbs: Breadcrumb[];
  headers: Header[];
  auth: Auth | null;
  sortPriority: number;
};

export type TreeNode =
  | { type: "folder"; id: string; children: TreeNode[] }
  | { type: "request"; id: string };

export type EnvironmentDoc = {
  id: string;
  name: string;
  color: string | null;
  /** `false` for private environments (not shared/synced in Yaak). */
  public: boolean;
  scope:
    | { model: "workspace" }
    | { model: "environment"; parentId: string | null }
    | { model: "folder"; folderId: string };
  variables: KeyValue[];
  sortPriority: number;
};

export type WorkspaceDoc = {
  id: string;
  name: string;
  description: string;
  headers: Header[];
  auth: Auth | null;
  tree: TreeNode[];
  folders: Record<string, FolderDoc>;
  requests: Record<string, RequestDoc>;
  /** Base (workspace-level) environment, if present. */
  baseEnvironment: EnvironmentDoc | null;
  /** Selectable sub environments, sorted. */
  environments: EnvironmentDoc[];
  /** Folder-scoped environments keyed by folder id. */
  folderEnvironments: Record<string, EnvironmentDoc[]>;
};

export type YaakDocument = {
  yaakVersion: string;
  yaakSchema: number;
  exportedAt: string | null;
  workspaces: WorkspaceDoc[];
};

/* -------------------------------------------------------------------------------------------------
 * Prepared document – what themes render. Produced by the yaakdoc engine from a YaakDocument plus
 * the user's configuration (selected workspace/environment, snippets, markdown rendering, routes).
 * -----------------------------------------------------------------------------------------------*/

export type CodeExample = {
  id: string;
  label: string;
  language: string;
  code: string;
  /** Syntax-highlighted HTML (Shiki, dual light/dark themes via CSS variables). */
  html: string;
};

export type ResponseExample = {
  /** HTTP status code, or `null` when not specified. */
  status: number | null;
  /** Reason phrase, e.g. `Not Found` (empty when unknown). */
  statusText: string;
  /** Display label, e.g. `200 OK` or `Response`. */
  label: string;
  language: string;
  code: string;
  /** Syntax-highlighted HTML. */
  html: string;
  /** `true` when the example has no body (e.g. `204 No Content`). */
  empty: boolean;
};

export type EnvironmentRef = { id: string; name: string; color: string | null };

/** Request data that depends on the selected environment. */
export type EnvironmentVariant = {
  /** `null` when no environment is selected. */
  environmentId: string | null;
  /** URL with its base (domain) resolved; path variables and `:path` parameters kept, no query. */
  url: string;
  /** Full runnable URL: path parameters substituted and query parameters added. */
  resolvedUrl: string;
  examples: CodeExample[];
};

export type PreparedLinks = {
  /** URL of the page/anchor documenting this item. */
  href: string;
  /** URL of the Markdown twin of this item. */
  markdownUrl: string;
};

export type PreparedRequest = RequestDoc &
  PreparedLinks & {
    /** URL with variables resolved (secrets left as placeholders) and query parameters merged. */
    resolvedUrl: string;
    descriptionHtml: string;
    /** First sentence/line of the description as plain text. */
    summary: string;
    examples: CodeExample[];
    /**
     * One variant per selectable environment (default first). `resolvedUrl` and `examples` above
     * are the default environment's values.
     */
    variants: EnvironmentVariant[];
    /** Example responses from ```response / ```response:<status> blocks in the description. */
    responses: ResponseExample[];
    /** Highlighted HTML of the request body / message, when present. */
    bodyHtml: string | null;
  };

export type PreparedFolder = FolderDoc &
  PreparedLinks & {
    descriptionHtml: string;
    summary: string;
  };

export type PreparedDocument = {
  yaakVersion: string;
  exportedAt: string | null;
  workspace: {
    id: string;
    name: string;
    description: string;
    descriptionHtml: string;
    headers: Header[];
    auth: Auth | null;
  };
  tree: TreeNode[];
  folders: Record<string, PreparedFolder>;
  requests: Record<string, PreparedRequest>;
  /** Selected environment (sub environment) used to resolve variables, if any. */
  environment: EnvironmentRef | null;
  /** Environments readers can switch between (default first). Empty or one entry: no switcher. */
  environments: EnvironmentRef[];
  /** Variables available for display, after hiding secrets (default environment). */
  variables: KeyValue[];
  /** Displayed variables per selectable environment (default first). */
  variableSets: Array<{ environmentId: string | null; variables: KeyValue[] }>;
};
