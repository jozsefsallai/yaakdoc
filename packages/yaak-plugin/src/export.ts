import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Context, Folder, HttpRequest, Workspace } from "@yaakapp/api";
import type { RawYaakExportInput } from "@yaakdoc/core";
import { findYaakDataDir } from "./paths";
import { runCommand } from "./run";

/** The commands tried, in order, when no Yaak CLI command is configured. */
export const DEFAULT_YAAK_COMMANDS = ["yaak", "npx -y @yaakapp/cli"];

export type LoadedExport = {
  /** Path of the written export. */
  file: string;
  data: RawYaakExportInput;
  /** `api` means environments, gRPC and WebSocket requests are missing. */
  source: "cli" | "api";
  /** Why the Yaak CLI export failed, when it did. */
  cliError?: string;
};

/**
 * Builds an export from what the plugin API can see: the workspace, its folders and its HTTP
 * requests. The API has no access to environments or gRPC/WebSocket requests.
 */
export function apiExport(
  workspace: Workspace,
  folders: Folder[],
  httpRequests: HttpRequest[],
): RawYaakExportInput {
  return {
    yaakVersion: "plugin-api",
    yaakSchema: 4,
    timestamp: new Date().toISOString(),
    resources: {
      workspaces: [workspace],
      folders: folders.filter((folder) => folder.workspaceId === workspace.id),
      httpRequests: httpRequests.filter((request) => request.workspaceId === workspace.id),
    },
  };
}

async function cliExport(
  command: string,
  workspaceId: string,
  file: string,
  dir: string,
): Promise<{ data?: RawYaakExportInput; error?: string }> {
  const dataDir = findYaakDataDir(__dirname);

  // Private environments are left out, as in Yaak's own export.
  const args = ["export", ...(dataDir ? ["--data-dir", dataDir] : []), file, workspaceId];
  const result = await runCommand(command, args, dir);

  if (!result.ok) {
    return { error: `${command}: ${result.output.trim() || "failed"}` };
  }

  try {
    const data = JSON.parse(await readFile(file, "utf8")) as RawYaakExportInput;
    const workspaces = (data.resources as { workspaces?: { id: string }[] }).workspaces ?? [];

    if (!workspaces.some((workspace) => workspace.id === workspaceId)) {
      return { error: `${command}: the export doesn't contain this workspace` };
    }

    return { data };
  } catch (error) {
    return { error: `${command}: ${(error as Error).message}` };
  }
}

/** Exports the workspace with the Yaak CLI, falling back to the plugin API. */
export async function loadExport(
  ctx: Context,
  workspace: Workspace,
  dir: string,
  yaakCommand?: string,
): Promise<LoadedExport> {
  const file = join(dir, "yaakdoc.json");
  const errors: string[] = [];

  for (const command of yaakCommand ? [yaakCommand] : DEFAULT_YAAK_COMMANDS) {
    const { data, error } = await cliExport(command, workspace.id, file, dir);

    if (data) {
      return { file, data, source: "cli" };
    }

    errors.push(error ?? command);
  }

  const scoped = ctx.workspace.withContext({ id: workspace.id, name: workspace.name });

  const [folders, httpRequests] = await Promise.all([
    scoped.folder.list(),
    scoped.httpRequest.list(),
  ]);

  const data = apiExport(workspace, folders, httpRequests);

  await writeFile(file, JSON.stringify(data, null, 2));

  return { file, data, source: "api", cliError: errors.join("\n") };
}

/** Names of the shared sub environments, the ones `environment` can select. */
export function environmentNames(data: RawYaakExportInput): string[] {
  const environments =
    (
      data.resources as {
        environments?: { name: string; public?: boolean; parentModel?: string }[];
      }
    ).environments ?? [];

  return environments
    .filter(
      (environment) => environment.public !== false && environment.parentModel === "environment",
    )
    .map((environment) => environment.name)
    .filter((name, index, names) => names.indexOf(name) === index);
}
