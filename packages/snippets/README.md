# @yaakdoc/snippets

Code example generators for [yaakdoc](https://yaakdoc.dev): `curl`, `javascript`, `python`, `go`, `grpcurl` and `wscat`.

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
{
  "snippets": ["curl", "./snippets/httpie.ts", "python"]
}
```

See [Code examples](https://yaakdoc.dev/docs/reference/snippets) for the built-in generators and what they support.
