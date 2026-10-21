import type { Folder, HttpRequest, Workspace } from "@yaakapp/api";
import { normalize, sanitizeExport } from "@yaakdoc/core";
import { describe, expect, it } from "vitest";
import fixture from "../../core/test/fixtures/current.json";
import { apiExport, environmentNames } from "../src/export";

const resources = fixture.resources;
const workspace = resources.workspaces[0] as unknown as Workspace;
const other = { ...resources.httpRequests[0], id: "rq_other", workspaceId: "wk_other" };

describe("apiExport", () => {
  const data = apiExport(
    workspace,
    resources.folders as unknown as Folder[],
    [...resources.httpRequests, other] as unknown as HttpRequest[],
  );

  it("builds an export yaakdoc can read, with only this workspace", () => {
    const { workspaces } = normalize(data);
    const requests = Object.keys(workspaces[0]?.requests ?? {});

    expect(workspaces.map((doc) => doc.name)).toEqual([workspace.name]);
    expect(requests.length).toBeGreaterThan(0);
    expect(requests).not.toContain("rq_other");
  });

  it("keeps secrets out of the shared export", () => {
    const secret = { ...resources.httpRequests[0], id: "rq_secret" } as Record<string, unknown>;
    secret.headers = [{ name: "X-Key", value: '${[ secure("s3cr3t-value") ]}', enabled: true }];

    const withSecret = apiExport(workspace, [], [secret] as unknown as HttpRequest[]);
    const shared = sanitizeExport(withSecret, {
      workspaceId: workspace.id,
      folderIds: new Set(),
      requestIds: new Set(["rq_secret"]),
      environmentIds: new Set(),
      hide: [],
    });

    expect(JSON.stringify(shared)).not.toContain("s3cr3t-value");
  });
});

describe("environmentNames", () => {
  it("lists shared sub environments only", () => {
    expect(environmentNames(fixture)).toEqual(["Production", "Staging"]);
  });
});
