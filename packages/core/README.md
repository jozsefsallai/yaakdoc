# @yaakdoc/core

Parses [Yaak](https://yaak.app) exports and turns them into a documentation-friendly model. Used by [yaakdoc](https://yaakdoc.dev), but it has no dependency on yaakdoc and works on its own.

```ts
import { createVariableMap, findWorkspace, resolveRequest, selectEnvironment } from "@yaakdoc/core";
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

It accepts every Yaak export version, computes inherited headers and auth, resolves `${[ variables ]}` without ever inlining secrets, sanitizes exports for sharing (`sanitizeExport`) and prepares the document that themes render (`prepareDocument`).

See the [package docs](https://yaakdoc.dev/docs/reference/packages#yaakdoccore) for details.
