import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildUrl,
  createVariableMap,
  flattenTree,
  normalize,
  resolveRequest,
  selectEnvironment,
  YaakExportError,
} from "../src/index";

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));

describe("normalize (current schema)", () => {
  const doc = normalize(fixture("current.json"));
  const ws = doc.workspaces[0]!;

  it("reads metadata", () => {
    expect(doc.yaakVersion).toBe("2025.6.0");
    expect(ws.name).toBe("Acme Store API");
  });

  it("builds a sorted tree with nested folders", () => {
    const top = ws.tree.map((node) =>
      node.type === "folder" ? ws.folders[node.id]!.name : ws.requests[node.id]!.name,
    );

    expect(top).toEqual([
      "Authentication",
      "Products",
      "Orders",
      "GraphQL",
      "Realtime",
      "Health check",
    ]);

    const products = ws.tree[1]!;

    expect(products.type === "folder" && products.children.at(-1)).toMatchObject({
      type: "folder",
      id: "fl_images",
    });
  });

  it("produces hierarchical slugs and flat anchors", () => {
    expect(ws.requests.rq_upload_image).toMatchObject({
      slug: "products/images/upload-an-image",
      anchor: "products-images-upload-an-image",
    });

    expect(ws.requests.rq_upload_image!.breadcrumbs.map((b) => b.name)).toEqual([
      "Products",
      "Images",
    ]);
  });

  it("inherits auth and respects `none`", () => {
    expect(ws.requests.rq_list_products!.auth).toMatchObject({
      type: "bearer",
      inheritedFrom: { model: "workspace" },
    });

    expect(ws.requests.rq_login!.auth).toBeNull();

    expect(ws.requests.rq_list_orders!.auth).toMatchObject({
      type: "apikey",
      inheritedFrom: { model: "folder", id: "fl_orders" },
    });

    expect(ws.requests.rq_create_order!.auth).toMatchObject({ type: "basic" });

    expect(ws.requests.rq_create_order!.auth!.inheritedFrom).toBeUndefined();
  });

  it("merges headers from workspace and folders, dropping disabled ones", () => {
    const req = ws.requests.rq_xml!;
    if (req.kind !== "http") {
      throw new Error("expected http");
    }

    expect(req.headers.map((h) => `${h.name}: ${h.value}`)).toEqual([
      "User-Agent: acme-docs/1.0",
      "Acme-Version: ${[ orders_version ]}",
      "Accept: application/xml",
    ]);
  });

  it("splits path and query parameters", () => {
    const req = ws.requests.rq_get_product!;
    if (req.kind !== "http") {
      throw new Error("expected http");
    }

    expect(req.pathParameters).toEqual([{ name: "id", value: "prod_123", enabled: true }]);
    expect(req.queryParameters).toEqual([]);
  });

  it("normalizes bodies", () => {
    const kinds = Object.values(ws.requests).map((r) => (r.kind === "http" ? r.body.type : r.kind));

    expect(new Set(kinds)).toEqual(
      new Set(["json", "form-urlencoded", "none", "multipart", "graphql", "grpc", "websocket"]),
    );
  });

  it("classifies environments", () => {
    expect(ws.baseEnvironment?.name).toBe("Global Variables");
    expect(ws.environments.map((env) => env.name)).toEqual(["Production", "Staging", "Local"]);
    expect(ws.folderEnvironments.fl_orders?.[0]?.variables[0]?.name).toBe("orders_version");
  });

  it("resolves variables without leaking secrets", () => {
    const staging = selectEnvironment(ws, "staging");
    const req = ws.requests.rq_list_products!;
    if (req.kind !== "http") {
      throw new Error("expected http");
    }

    const resolved = resolveRequest(req, {
      variables: createVariableMap(ws, staging),
      hide: ["token"],
    });

    expect(resolved.url).toBe(
      "https://staging.api.acme.dev/v1/stores/store_test/products?page=1&limit=20&sort=-created_at",
    );

    expect(resolved.auth).toEqual({ type: "bearer", prefix: "Bearer", token: "{{api_token}}" });
  });

  it("applies folder environments and keeps function values as placeholders", () => {
    const req = ws.requests.rq_create_product!;
    if (req.kind !== "http") {
      throw new Error("expected http");
    }

    const resolved = resolveRequest(req, { variables: createVariableMap(ws, null) });
    expect(resolved.headers).toContainEqual({ name: "Idempotency-Key", value: "{{uuid.v4}}" });

    const orders = ws.requests.rq_list_orders!;
    const vars = createVariableMap(ws, null, ["fl_orders"]);
    expect(resolveRequest(orders, { variables: vars }).kind).toBe("http");
    expect(vars.get("orders_version")).toBe("2025-01");
  });

  it("defaults to the first public environment", () => {
    expect(selectEnvironment(ws)?.name).toBe("Production");
    expect(() => selectEnvironment(ws, "nope")).toThrow(/Available: "Production"/);
  });

  it("flattens the tree in document order", () => {
    expect(flattenTree(ws.tree).slice(0, 3)).toEqual([
      "rq_login",
      "rq_refresh",
      "rq_list_products",
    ]);
  });
});

describe("normalize (legacy schema)", () => {
  const doc = normalize(fixture("legacy-v2.json"));
  const ws = doc.workspaces[0]!;

  it("migrates `requests` and workspace variables", () => {
    expect(Object.keys(ws.requests)).toEqual(["rq_ping"]);
    expect(ws.requests.rq_ping).toMatchObject({ kind: "http", method: "GET" });
    expect(ws.baseEnvironment?.variables).toEqual([
      { name: "host", value: "https://old.example.com", enabled: true },
    ]);
    expect(ws.environments.map((env) => env.name)).toEqual(["Dev"]);
  });

  it("resolves with the sub environment overriding base variables", () => {
    const req = ws.requests.rq_ping!;
    if (req.kind !== "http") {
      throw new Error("expected http");
    }

    const url = buildUrl(req, (input) =>
      input.replace("${[ host ]}", createVariableMap(ws, ws.environments[0]!).get("host")!),
    );

    expect(url).toBe("https://dev.example.com/ping");
  });
});

describe("errors", () => {
  it("rejects non-Yaak JSON", () => {
    expect(() => normalize({ hello: "world" })).toThrow(YaakExportError);
  });

  it("reports schema errors", () => {
    expect(() => normalize({ yaakSchema: 4, resources: { workspaces: [{ name: 1 }] } })).toThrow(
      /Invalid Yaak export/,
    );
  });
});

describe("normalize (exports with null ids)", () => {
  it("accepts key-values with a null id (as written by Yaak 2026.9)", () => {
    const doc = normalize({
      yaakVersion: "2026.9.0",
      yaakSchema: 4,
      resources: {
        workspaces: [
          {
            id: "wk_1",
            name: "API",
            headers: [{ enabled: true, name: "X-A", value: "1", id: null }],
          },
        ],
        httpRequests: [
          {
            id: "rq_1",
            workspaceId: "wk_1",
            folderId: null,
            name: "Ping",
            url: "https://example.com",
            headers: [{ enabled: true, name: "Accept", value: "application/json", id: null }],
            urlParameters: [{ enabled: true, name: "q", value: "1", id: null }],
          },
        ],
      },
    });

    const request = doc.workspaces[0]!.requests.rq_1!;
    expect(request.kind === "http" && request.headers.map((h) => h.name)).toEqual([
      "X-A",
      "Accept",
    ]);
  });
});
