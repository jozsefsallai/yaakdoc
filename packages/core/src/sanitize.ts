import { parseYaakExport } from "./normalize";
import type { RawKeyValue, RawYaakExport } from "./schema";
import { createSecretMatcher, tokenizeTemplate } from "./template";

export type SanitizeOptions = {
  workspaceId: string;
  /** Folders and requests to keep (e.g. the ones that passed the docs filters). */
  folderIds: ReadonlySet<string>;
  requestIds: ReadonlySet<string>;
  /** Environments to keep (base, folder and selected sub environments). */
  environmentIds: ReadonlySet<string>;
  /** Variable/header/parameter name patterns treated as secrets (same as the docs). */
  hide: readonly string[];
};

/** Authentication fields that never hold secrets. Every other string must be a variable reference. */
const SAFE_AUTH_FIELDS = new Set([
  "location",
  "key",
  "prefix",
  "headerPrefix",
  "grantType",
  "algorithm",
  "scope",
  "audience",
  "clientId",
  "authorizationUrl",
  "accessTokenUrl",
  "redirectUri",
  "username",
  "usePkce",
  "pkceChallengeMethod",
  "region",
  "service",
  "realm",
  "domain",
  "workstation",
  "signatureMethod",
  "name",
]);

/** Removes `secure(...)` template functions (encrypted values) from a string. */
function stripSecure(value: string): string {
  return tokenizeTemplate(value)
    .map((token) =>
      token.type === "text"
        ? token.value
        : token.type === "function" && token.name === "secure"
          ? ""
          : token.raw,
    )
    .join("");
}

/** `true` when the value consists only of variable references (and whitespace). */
function isVariableReference(value: string): boolean {
  const tokens = tokenizeTemplate(value);

  return (
    tokens.some((token) => token.type === "variable") &&
    tokens.every(
      (token) => token.type === "variable" || (token.type === "text" && token.value.trim() === ""),
    )
  );
}

/**
 * Produces a shareable copy of a Yaak export, e.g. for a "Run in Yaak" button. It never contains
 * more than the generated docs show:
 *
 * - only the documented workspace and the given folders, requests and environments;
 * - secret-looking variables, headers, parameters and form fields are blanked (variable references
 *   like `${[ api_token ]}` are kept – their values are blanked where they are defined);
 * - `secure(...)` values and the workspace encryption key challenge are removed;
 * - authentication keeps only non-secret fields and variable references.
 */
export function sanitizeExport(input: unknown, options: SanitizeOptions): RawYaakExport {
  const raw = parseYaakExport(input);
  const isSecret = createSecretMatcher(options.hide);

  const value = (name: string, original: string) => {
    const cleaned = stripSecure(original);
    return isSecret(name) && cleaned !== "" && !isVariableReference(cleaned) ? "" : cleaned;
  };

  const keyValues = <T extends RawKeyValue>(items: T[]): T[] =>
    items.map((item) => ({ ...item, value: value(item.name, item.value) }));

  const auth = (fields: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(fields).map(([key, field]) => {
        if (typeof field !== "string") {
          return [key, field];
        }

        const cleaned = stripSecure(field);

        return [
          key,
          SAFE_AUTH_FIELDS.has(key) || cleaned === "" || isVariableReference(cleaned)
            ? cleaned
            : "",
        ];
      }),
    );

  const body = (fields: Record<string, unknown>) => {
    const out: Record<string, unknown> = { ...fields };

    if (typeof out.text === "string") {
      out.text = stripSecure(out.text);
    }

    if (Array.isArray(out.form)) {
      out.form = keyValues(out.form as RawKeyValue[]);
    }

    return out;
  };

  const { resources } = raw;

  return {
    ...raw,
    resources: {
      ...resources,
      workspaces: resources.workspaces
        .filter((ws) => ws.id === options.workspaceId)
        .map((ws) => ({
          ...ws,
          encryptionKeyChallenge: null,
          headers: keyValues(ws.headers),
          authentication: auth(ws.authentication),
          ...(ws.variables ? { variables: keyValues(ws.variables) } : {}),
        })),
      environments: resources.environments
        .filter((env) => options.environmentIds.has(env.id))
        .map((env) => ({ ...env, variables: keyValues(env.variables) })),
      folders: resources.folders
        .filter((folder) => options.folderIds.has(folder.id))
        .map((folder) => ({
          ...folder,
          headers: keyValues(folder.headers),
          authentication: auth(folder.authentication),
        })),
      httpRequests: resources.httpRequests
        .filter((req) => options.requestIds.has(req.id))
        .map((req) => ({
          ...req,
          headers: keyValues(req.headers),
          urlParameters: keyValues(req.urlParameters),
          authentication: auth(req.authentication),
          body: body(req.body),
        })),
      grpcRequests: resources.grpcRequests
        .filter((req) => options.requestIds.has(req.id))
        .map((req) => ({
          ...req,
          metadata: keyValues(req.metadata),
          authentication: auth(req.authentication),
          message: stripSecure(req.message),
        })),
      websocketRequests: resources.websocketRequests
        .filter((req) => options.requestIds.has(req.id))
        .map((req) => ({
          ...req,
          headers: keyValues(req.headers),
          urlParameters: keyValues(req.urlParameters),
          authentication: auth(req.authentication),
          message: stripSecure(req.message),
        })),
    },
  };
}
