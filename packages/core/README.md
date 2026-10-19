# @yaakdoc/core

Parses [Yaak](https://yaak.app) exports and turns them into a documentation-friendly model. Used by [yaakdoc](https://github.com/jozsefsallai/yaakdoc#readme), but it has no dependency on yaakdoc and works on its own.

```ts
import { createVariableMap, findWorkspace, normalize, resolveRequest, selectEnvironment } from "@yaakdoc/core";
import { loadExport } from "@yaakdoc/core/node";

const doc = await loadExport("yaak.json"); // or normalize(JSON.parse(text))
const workspace = findWorkspace(doc);
const env = selectEnvironment(workspace, "Production");

for (const request of Object.values(workspace.requests)) {
  const resolved = resolveRequest(request, {
    variables: createVariableMap(workspace, env, request.breadcrumbs.map((b) => b.id)),
    hide: ["token", "secret"],
  });

  console.log(request.kind, resolved.url);
}
```

## What normalization does

- **Schema versions.** It accepts every Yaak export version: `requests` (v1), workspace variables (≤ v2), `environmentId` (≤ v3), `base` (v4) and `parentModel`/`parentId` (current).
- **Tree.** Folders and requests are nested and sorted (`sortPriority`, then name). Each item gets a unique hierarchical `slug` (`products/get-a-product`) and an anchor.
- **Inheritance.** Effective headers (workspace → folders → request) and authentication are computed. In Yaak, `null` means "inherit" and `"none"` disables auth.
- **Parameters.** Path parameters (`:id`) are split from query parameters.
- **Bodies.** They're normalized to `json`, `text`, `form-urlencoded`, `multipart`, `graphql` or `binary`.
- **Request kinds.** HTTP, gRPC and WebSocket requests are all supported.
- **Environments.** It produces the base environment, sub environments (public and private), and folder environments.

## Templates and secrets

- **`resolveTemplate`** resolves `${[ variable ]}` recursively. A variable that is unknown, hidden, cyclic or defined with a template function (e.g. `secure(...)`) becomes a `{{placeholder}}` instead, so secrets are never inlined.
- **`formatTemplate`** converts templates to `{{placeholders}}` without resolving anything.
- **`createSecretMatcher`** matches variable names case-insensitively, ignoring separators: `api_key` also hides `apiKey` and `X-API-KEY`.

## Sharing exports

`sanitizeExport(raw, { workspaceId, folderIds, requestIds, environmentIds, hide })` returns a copy of an export that is safe to publish (used for "Run in Yaak"):

- It keeps only the given workspace, folders, requests and environments.
- It blanks secret-looking values, but keeps variable references such as `${[ api_token ]}`.
- It removes `secure(...)` values and the workspace encryption key challenge.
- In auth settings, it keeps only non-secret fields.

## Preparing documents

`prepareDocument()` builds the `PreparedDocument` that themes render: links, display values (with secrets redacted), summaries and the include/exclude filters. You inject the renderers (Markdown, syntax highlighting) and the code example generator, which keeps this package light and environment-agnostic.
