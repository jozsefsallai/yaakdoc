import { describe, expect, it } from "vitest";
import {
  createSecretMatcher,
  formatTemplate,
  resolveBaseUrl,
  resolveTemplate,
  tokenizeTemplate,
} from "../src/index";

describe("templates", () => {
  const variables = new Map([
    ["host", "https://${[ sub ]}.example.com"],
    ["sub", "api"],
    ["token", 'Bearer ${[ secure("abc") ]}'],
    ["loop", "${[ loop ]}"],
    ["apiKey", "plain-but-secret"],
    ["nested_secret", "x-${[ token ]}"],
  ]);

  const isHidden = createSecretMatcher(["api_key"]);

  it("tokenizes variables and functions", () => {
    expect(tokenizeTemplate("a ${[ b ]} ${[ fn('x') ]}").map((t) => t.type)).toEqual([
      "text",
      "variable",
      "text",
      "function",
    ]);
  });

  it("resolves recursively", () => {
    expect(resolveTemplate("${[ host ]}/v1", { variables })).toBe("https://api.example.com/v1");
  });

  it("never inlines secrets, functions, cycles or hidden names", () => {
    const r = (input: string) => resolveTemplate(input, { variables, isHidden });

    expect(r("${[ token ]}")).toBe("{{token}}");
    expect(r("${[ nested_secret ]}")).toBe("{{nested_secret}}");
    expect(r("${[ loop ]}")).toBe("{{loop}}");
    expect(r("${[ apiKey ]}")).toBe("{{apiKey}}");
    expect(r("${[ missing ]}")).toBe("{{missing}}");
    expect(r("${[ response.body.path(request='x') ]}")).toBe("{{response.body.path}}");
  });

  it("formats templates without resolving", () => {
    expect(formatTemplate("${[ base_url ]}/x/${[ uuid.v4() ]}")).toBe("{{base_url}}/x/{{uuid.v4}}");
  });
});

describe("resolveBaseUrl", () => {
  const variables = new Map([
    ["base_url", "https://api.acme.dev/v1"],
    ["host", "api.acme.dev"],
    ["version", "/v2"],
    ["store_id", "store_42"],
  ]);

  it("resolves the base but keeps path variables", () => {
    expect(resolveBaseUrl("${[ base_url ]}/stores/${[ store_id ]}/products", { variables })).toBe(
      "https://api.acme.dev/v1/stores/{{store_id}}/products",
    );

    expect(resolveBaseUrl("https://${[ host ]}/users/${[ store_id ]}", { variables })).toBe(
      "https://api.acme.dev/users/{{store_id}}",
    );

    expect(resolveBaseUrl("https://${[ host ]}${[ version ]}/x", { variables })).toBe(
      "https://api.acme.dev/v2/x",
    );

    expect(resolveBaseUrl("${[ base_url ]}/products/:id", { variables })).toBe(
      "https://api.acme.dev/v1/products/:id",
    );
  });
});

describe("resolveBaseUrl without scheme", () => {
  it("handles host:port and relative URLs", () => {
    const variables = new Map([
      ["port", "8080"],
      ["id", "7"],
    ]);

    expect(resolveBaseUrl("localhost:${[ port ]}/items/${[ id ]}", { variables })).toBe(
      "localhost:8080/items/{{id}}",
    );
  });
});
