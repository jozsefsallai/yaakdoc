import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalize, sanitizeExport } from "../src/index";

const raw = JSON.parse(readFileSync(new URL("./fixtures/current.json", import.meta.url), "utf8"));
const ws = normalize(raw).workspaces[0]!;

const allFolders = new Set(Object.keys(ws.folders));
const allRequests = new Set(Object.keys(ws.requests));

const options = {
  workspaceId: ws.id,
  folderIds: allFolders,
  requestIds: allRequests,
  environmentIds: new Set(["ev_base", "ev_prod", "ev_staging", "ev_orders"]),
  hide: ["token", "secret", "password", "api_key", "apikey"],
};

describe("sanitizeExport", () => {
  it("removes secrets and private environments", () => {
    const out = sanitizeExport(raw, options);
    const text = JSON.stringify(out);

    expect(text).not.toContain("eyJ0eXAi"); // secure() value
    expect(text).not.toContain("local-secret"); // private environment
    expect(out.resources.environments.map((env) => env.name)).toEqual([
      "Global Variables",
      "Production",
      "Staging",
      "Orders",
    ]);

    const base = out.resources.environments[0]!;

    expect(base.variables.find((v) => v.name === "api_token")?.value).toBe("");
    expect(base.variables.find((v) => v.name === "base_url")?.value).toBe(
      "https://api.acme.dev/v1",
    );
  });

  it("keeps variable references and non-secret auth fields, blanks literal secrets", () => {
    const input = structuredClone(raw);
    const login = input.resources.httpRequests.find((r: { id: string }) => r.id === "rq_login");
    login.headers.push({ enabled: true, name: "X-Api-Key", value: "literal-key" });
    login.authenticationType = "bearer";
    login.authentication = { token: "literal-token", prefix: "Bearer" };

    const out = sanitizeExport(input, options);
    const outLogin = out.resources.httpRequests.find((r) => r.id === "rq_login")!;

    expect(outLogin.headers.find((h) => h.name === "X-Api-Key")?.value).toBe("");
    expect(outLogin.authentication).toEqual({ token: "", prefix: "Bearer" });

    const order = out.resources.httpRequests.find((r) => r.id === "rq_create_order")!;

    expect(order.authentication).toEqual({
      username: "merchant",
      password: "${[ merchant_password ]}",
    });

    const orders = out.resources.folders.find((f) => f.id === "fl_orders")!;

    expect(orders.authentication.value).toBe("${[ orders_api_key ]}");
  });

  it("keeps only the given workspace, folders and requests", () => {
    const out = sanitizeExport(raw, {
      ...options,
      folderIds: new Set(["fl_products"]),
      requestIds: new Set(["rq_get_product"]),
    });

    expect(out.resources.folders.map((f) => f.id)).toEqual(["fl_products"]);
    expect(out.resources.httpRequests.map((r) => r.id)).toEqual(["rq_get_product"]);
    expect(out.resources.grpcRequests).toEqual([]);
    expect(normalize(out).workspaces[0]?.requests.rq_get_product?.name).toBe("Get a product");
  });
});
