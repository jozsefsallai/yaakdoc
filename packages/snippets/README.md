# @yaakdoc/snippets

Code example generators for [yaakdoc](https://github.com/jozsefsallai/yaakdoc#readme).

| Id | Language | Request kinds |
| --- | --- | --- |
| `curl` | bash | HTTP |
| `javascript` | JavaScript (`fetch`, `WebSocket`) | HTTP, WebSocket |
| `python` | Python (`requests`) | HTTP |
| `go` | Go (`net/http`) | HTTP |
| `grpcurl` | bash | gRPC |
| `wscat` | bash | WebSocket |

The generators handle JSON, text, form, multipart, GraphQL and binary bodies, headers, path and query parameters, and authentication: basic, bearer, API key (header or query), plus placeholders for OAuth and JWT.

## Custom snippets

```ts
// snippets/httpie.ts
import { applyAuth } from "@yaakdoc/core";
import { defineSnippet } from "@yaakdoc/snippets";

export default defineSnippet({
  id: "httpie",
  label: "HTTPie",
  language: "bash",
  supports: ["http"],
  generate(request) {
    if (request.kind !== "http") {
      return "";
    }

    const req = applyAuth(request);

    return [`http ${req.method} '${req.url}'`, ...req.headers.map((h) => `'${h.name}:${h.value}'`)].join(" \\\n  ");
  },
});
```

```json
{ "snippets": ["curl", "./snippets/httpie.ts", "python"] }
```

The order of `snippets` is the order of the tabs. Use `generateExamples(resolvedRequest, snippets)` to generate examples programmatically.
