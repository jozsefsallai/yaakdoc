# @yaakdoc/markdown

Generates Markdown and [llms.txt](https://llmstxt.org) from a yaakdoc `PreparedDocument`.

| Function | Output |
| --- | --- |
| `requestToMarkdown(request, options)` | One request: method and URL, description, auth, parameters, headers, body, code examples. |
| `folderToMarkdown(document, folder, options)` | A folder's description and links to its contents. |
| `indexToMarkdown(document, options)` | Overview, authentication, variables and the table of contents. |
| `pageToMarkdown(page, options)` | A custom page: title, description and body, with variables resolved for the default environment. |
| `llmsTxt(document, options)` | `llms.txt`: H1 title, `>` summary, H2 sections for the custom pages (by tab and group), then one per top-level folder, link lists. |
| `llmsFullTxt(document, options)` | The whole documentation in one Markdown file. Pass `pages: false` for the API reference only. |

`options` has these fields:

- `title`
- `description`
- `siteUrl` and `base`, which make links absolute (recommended for llms.txt)
- `examples`, which set to `false` leaves out code examples

Secrets are already redacted in the prepared document, so they never appear in the output.
