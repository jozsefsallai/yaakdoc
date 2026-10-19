import { readFileSync } from "node:fs";
import { normalize, prepareDocument, selectEnvironment } from "@yaakdoc/core";
import { builtinSnippets, generateExamples } from "@yaakdoc/snippets";
import { describe, expect, it } from "vitest";
import { indexToMarkdown, llmsFullTxt, llmsTxt, requestToMarkdown } from "../src/index";

const ws = normalize(
  JSON.parse(
    readFileSync(new URL("../../core/test/fixtures/current.json", import.meta.url), "utf8"),
  ),
).workspaces[0]!;

const doc = await prepareDocument({
  workspace: ws,
  environment: selectEnvironment(ws),
  pages: "single",
  base: "/",
  variables: { resolve: true, hide: ["token", "password"] },
  renderMarkdown: (md) => md,
  highlight: (code) => code,
  examples: (req) => generateExamples(req, [builtinSnippets.curl!]),
});

const options = {
  title: "Acme Store API",
  description: "Manage your Acme store.",
  siteUrl: "https://docs.acme.dev",
};

describe("llms.txt", () => {
  const text = llmsTxt(doc, { ...options, fullTextUrl: "/llms-full.txt" });

  it("follows the llmstxt.org structure", () => {
    const lines = text.split("\n");

    expect(lines[0]).toBe("# Acme Store API");
    expect(lines[2]).toBe("> Manage your Acme store.");
    expect(text).toMatch(/^## Products$/m);
    expect(text).toMatch(/^## Optional$/m);
    expect(text).toContain(
      "- [Get a product](https://docs.acme.dev/products/get-a-product.md): Retrieve a single product by its id.",
    );
    expect(text).toContain("- [Full documentation](https://docs.acme.dev/llms-full.txt)");
  });

  it("matches snapshot", () => {
    expect(text).toMatchSnapshot();
  });
});

describe("request markdown", () => {
  it("documents a request with examples", () => {
    const md = requestToMarkdown(doc.requests.rq_upload_image!, options);

    expect(md).toMatchSnapshot();
    expect(md).toContain("POST https://api.acme.dev/v1/products/prod_123/images");
    expect(md).toContain("| `file` | `@./shoe.png` |");
  });

  it("never contains secret values", () => {
    const full = llmsFullTxt(doc, options);

    expect(full).not.toContain("eyJ0eXAi");
    expect(full).toContain("{{api_token}}");
    expect(indexToMarkdown(doc, options)).toContain("| `api_token` | `<redacted>` |");
  });
});
