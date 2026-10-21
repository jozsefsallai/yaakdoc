import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Context, PluginDefinition, Workspace } from "@yaakapp/api";
import { mergeConfig, type YaakdocConfig } from "@yaakdoc/config";
import pkg from "../package.json";
import { environmentNames, type LoadedExport, loadExport } from "./export";
import { buildForm, type FormKind } from "./form";
import { intoProject, toProjectRelative, workDir } from "./paths";
import { runCommand } from "./run";
import { loadEngine } from "./runtime";
import {
  isChecked,
  loadSettings,
  type Settings,
  SettingsError,
  saveSettings,
  settingsToConfig,
  validateConfig,
} from "./settings";

const YAAKDOC_COMMAND = `npx -y yaakdoc@${pkg.version}`;
const SCHEMA_URL = `https://unpkg.com/yaakdoc@${pkg.version}/config.schema.json`;

const text = (value: Settings[string]) => (typeof value === "string" ? value.trim() : "");

async function showLog(ctx: Context, title: string, message: string, log: string) {
  await ctx.prompt.form({
    id: `yaakdoc-log-${Date.now()}`,
    title,
    size: "lg",
    confirmText: "Close",
    inputs: [
      { type: "markdown", content: message },

      {
        type: "editor",
        name: "log",
        label: "Output",
        language: "text",
        readOnly: true,
        optional: true,
        rows: 20,
        defaultValue: log.split("\n").slice(-200).join("\n"),
      },
    ],
  });
}

/** Exports the workspace and asks for the settings. Returns null when the user cancels. */
async function prepare(
  ctx: Context,
  workspace: Workspace,
  kind: FormKind,
): Promise<{ exported: LoadedExport; settings: Settings; dir: string } | null> {
  const stored = await loadSettings(ctx, workspace.id);

  const dir = workDir(workspace.id);

  await mkdir(dir, { recursive: true });

  await ctx.toast.show({ message: "Exporting workspace...", color: "info", timeout: 3000 });

  const exported = await loadExport(ctx, workspace, dir, text(stored.yaakCommand) || undefined);

  if (exported.source === "api") {
    console.warn(`yaakdoc: Yaak CLI export failed, using the plugin API\n${exported.cliError}`);

    await ctx.toast.show({
      message:
        "Couldn't export with the Yaak CLI, so environments, gRPC and WebSocket requests are missing. Install @yaakapp/cli to include them.",
      color: "warning",
      icon: "alert_triangle",
      timeout: 10000,
    });
  }

  const values = await ctx.prompt.form({
    id: `yaakdoc-${kind}`,
    title: kind === "build" ? "Build docs with yaakdoc" : "Save as yaakdoc project",
    description: `${workspace.name}`,
    size: "lg",
    confirmText: kind === "build" ? "Build" : "Save",
    inputs: buildForm({
      kind,
      settings: stored,
      environments: environmentNames(exported.data),
      yaakdocCommand: YAAKDOC_COMMAND,
    }),
  });

  if (!values) {
    return null;
  }

  const settings = { ...stored, ...values };
  await saveSettings(ctx, workspace.id, settings);

  return { exported, settings, dir };
}

/** Converts and validates the settings, reporting problems in a toast. */
async function configFrom(ctx: Context, settings: Settings): Promise<YaakdocConfig | null> {
  try {
    const config = settingsToConfig(settings);
    validateConfig(config);
    return config;
  } catch (error) {
    if (!(error instanceof SettingsError)) {
      throw error;
    }

    await showLog(ctx, "Invalid settings", "Fix these settings and try again.", error.message);
    return null;
  }
}

async function buildDocs(ctx: Context, workspace: Workspace) {
  const prepared = await prepare(ctx, workspace, "build");

  if (!prepared) {
    return;
  }

  const { exported, settings, dir } = prepared;
  const config = await configFrom(ctx, settings);

  if (!config) {
    return;
  }

  const outDir = text(settings.outDir);
  const configFile = text(settings.configFile) || undefined;
  const build: BuildRequest = {
    exported,
    dir,
    cwd: configFile ? dirname(configFile) : dir,
    ...(configFile ? { configFile } : {}),
    overrides: { ...config, outDir },
    command: text(settings.yaakdocCommand),
  };

  await ctx.toast.show({ message: "Building docs...", color: "info", timeout: 5000 });

  const engine = loadEngine();

  try {
    const summary = await buildBuiltIn(build);
    await built(ctx, summary, outDir);
  } catch (error) {
    if (!(error instanceof engine.ExternalThemeError)) {
      await showLog(ctx, "yaakdoc build failed", "The build failed:", (error as Error).message);
      return;
    }

    await buildWithCli(ctx, build, error.theme);
  }
}

type BuildRequest = {
  exported: LoadedExport;
  /** The work directory. */
  dir: string;
  /** Where relative paths resolve: the config file's directory, or the work directory. */
  cwd: string;
  configFile?: string;
  overrides: YaakdocConfig;
  /** The configured yaakdoc command, if any. */
  command: string;
};

/** Builds with the engine bundled into the plugin. Only Kiseki is built in. */
function buildBuiltIn(build: BuildRequest, overrides: YaakdocConfig = {}) {
  return loadEngine().buildSite({
    exportData: build.exported.data,
    cwd: build.cwd,
    ...(build.configFile ? { configFile: build.configFile } : {}),
    overrides: mergeConfig(build.overrides, overrides),
  });
}

async function built(
  ctx: Context,
  summary: { pages: number; textFiles: number } | null,
  outDir: string,
) {
  const files = summary
    ? `Built ${summary.pages} page${summary.pages === 1 ? "" : "s"} and ${summary.textFiles} Markdown/llms files`
    : "Built the docs";

  await ctx.toast.show({
    message: `${files} into ${outDir}`,
    color: "success",
    icon: "check_circle",
  });

  await ctx.window.openExternalUrl(pathToFileURL(outDir).href);
}

/** Builds a theme that isn't built in with the yaakdoc CLI, which needs Node.js and npm. */
async function buildWithCli(ctx: Context, build: BuildRequest, theme: string) {
  const outDir = build.overrides.outDir!;

  // Without a custom command, the CLI runs through npx: check for it before trying.
  if (!build.command && !(await runCommand("npx", ["--version"], build.dir)).ok) {
    const fallback = await ctx.prompt.form({
      id: `yaakdoc-needs-node-${Date.now()}`,
      title: "This theme needs Node.js",
      confirmText: "Use default theme instead",
      cancelText: "Cancel",
      inputs: [
        {
          type: "markdown",
          content: [
            `The theme **${theme}** isn't built into the plugin, so it's built with the yaakdoc CLI. That needs [Node.js](https://nodejs.org) (with npm), which wasn't found.`,
            "",
            "Install Node.js and try again, or build with the default theme (Kiseki).",
          ].join("\n"),
        },
      ],
    });

    if (!fallback) {
      return;
    }

    try {
      await built(ctx, await buildBuiltIn(build, { theme: "kiseki" }), outDir);
    } catch (error) {
      await showLog(ctx, "yaakdoc build failed", "The build failed:", (error as Error).message);
    }

    return;
  }

  const overrides = join(build.dir, "overrides.json");
  await writeFile(overrides, JSON.stringify(build.overrides, null, 2));

  const command = build.command || YAAKDOC_COMMAND;

  const args = [
    "build",
    build.exported.file,
    "--overrides",
    overrides,
    ...(build.configFile ? ["--config", build.configFile] : []),
  ];

  const result = await runCommand(command, args, build.cwd);

  if (!result.ok) {
    await showLog(
      ctx,
      "yaakdoc build failed",
      `The build with \`${command}\` failed. Its output is below.`,
      result.output,
    );

    return;
  }

  const counts = result.output.match(/Built (\d+) pages? and (\d+) Markdown/);
  await built(
    ctx,
    counts ? { pages: Number(counts[1]), textFiles: Number(counts[2]) } : null,
    outDir,
  );
}

/**
 * Points local paths into the project. Picked branding files are copied into it when they're
 * outside; the theme and snippets can only be made relative (they're folders or modules).
 */
async function projectPaths(config: YaakdocConfig, dir: string): Promise<YaakdocConfig> {
  const rel = (path: string | undefined) => (path ? toProjectRelative(path, dir) : path);

  const copied = new Map<string, string>();

  const copy = async (path: string | undefined) =>
    path ? await intoProject(path, dir, copied) : path;

  const { branding } = config;

  return {
    ...config,
    ...(config.theme ? { theme: rel(config.theme) } : {}),
    ...(config.snippets
      ? { snippets: config.snippets.map((path) => toProjectRelative(path, dir)) }
      : {}),
    ...(branding
      ? {
          branding: {
            ...branding,
            ...(typeof branding.logo === "string" ? { logo: await copy(branding.logo) } : {}),
            ...(branding.favicon ? { favicon: await copy(branding.favicon) } : {}),
            ...(branding.customCss ? { customCss: await copy(branding.customCss) } : {}),
          },
        }
      : {}),
  };
}

async function saveProject(ctx: Context, workspace: Workspace) {
  const prepared = await prepare(ctx, workspace, "project");

  if (!prepared) {
    return;
  }

  const { exported, settings } = prepared;
  const config = await configFrom(ctx, settings);

  if (!config) {
    return;
  }

  const projectDir = text(settings.projectDir);

  await mkdir(projectDir, { recursive: true });
  await writeFile(join(projectDir, "yaakdoc.json"), `${JSON.stringify(exported.data, null, 2)}\n`);

  const configPath = join(projectDir, "yaakdoc.config.json");
  const otherConfig = (await readdir(projectDir)).find(
    (name) => name.startsWith("yaakdoc.config.") && name !== "yaakdoc.config.json",
  );

  if (otherConfig) {
    await ctx.toast.show({
      message: `Updated yaakdoc.json. ${otherConfig} was left as it is, so the form's settings weren't saved to it.`,
      color: "notice",
      timeout: 10000,
    });

    await ctx.window.openExternalUrl(pathToFileURL(projectDir).href);

    return;
  }

  let existing: YaakdocConfig = {};

  if (existsSync(configPath) && !isChecked(settings.replaceConfig)) {
    try {
      existing = JSON.parse(await readFile(configPath, "utf8")) as YaakdocConfig;
    } catch (error) {
      await showLog(
        ctx,
        "Couldn't read yaakdoc.config.json",
        "Fix the file, or tick **Replace an existing yaakdoc.config.json**.",
        (error as Error).message,
      );
      return;
    }
  }

  const { $schema: _, ...rest } = mergeConfig(existing, await projectPaths(config, projectDir));
  await writeFile(configPath, `${JSON.stringify({ $schema: SCHEMA_URL, ...rest }, null, 2)}\n`);

  await ctx.toast.show({
    message: `Saved yaakdoc.json and yaakdoc.config.json to ${projectDir}. Run npx yaakdoc there to preview.`,
    color: "success",
    icon: "check_circle",
    timeout: 8000,
  });

  await ctx.window.openExternalUrl(pathToFileURL(projectDir).href);
}

/** Reports unexpected errors in Yaak instead of failing silently. */
const action =
  (run: (ctx: Context, workspace: Workspace) => Promise<void>) =>
  async (ctx: Context, args: { workspace: Workspace }) => {
    try {
      await run(ctx, args.workspace);
    } catch (error) {
      console.error("yaakdoc:", error);

      await ctx.toast.show({
        message: `yaakdoc: ${(error as Error).message}`,
        color: "danger",
        icon: "alert_triangle",
        timeout: 10000,
      });
    }
  };

export const plugin: PluginDefinition = {
  workspaceActions: [
    { label: "Build docs with yaakdoc...", onSelect: action(buildDocs) },
    { label: "Save as yaakdoc project...", onSelect: action(saveProject) },
  ],
};
