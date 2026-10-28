import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Context, PluginDefinition, Workspace } from "@yaakapp/api";
import { mergeConfig, type YaakdocConfig } from "@yaakdoc/config";
import pkg from "../package.json";
import { environmentNames, type LoadedExport, loadExport } from "./export";
import { buildForm, type FormKind, SECTION } from "./form";
import { intoProject, themeCacheDir, toProjectRelative, workDir } from "./paths";
import { ProgressDialog } from "./progress";
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
import {
  fetchableThemePackages,
  findThemePackage,
  installedFrom,
  installTheme,
  isLocalTheme,
  NpmError,
  ThemeNotFoundError,
} from "./theme";

const YAAKDOC_COMMAND = `npx -y yaakdoc@${pkg.version}`;
const SCHEMA_URL = `https://unpkg.com/yaakdoc@${pkg.version}/config.schema.json`;

const text = (value: Settings[string]) => (typeof value === "string" ? value.trim() : "");

const ACTIONS: Record<FormKind, { title: string; label: string }> = {
  build: { title: "Build docs with yaakdoc", label: "Build docs with yaakdoc..." },
  project: { title: "Save as yaakdoc project", label: "Save as yaakdoc project..." },
};

/**
 * Exports the workspace and asks for the settings. Returns null when the user cancels (in the form,
 * or while exporting).
 */
async function prepare(
  ctx: Context,
  workspace: Workspace,
  kind: FormKind,
  progress: ProgressDialog,
): Promise<{ exported: LoadedExport; settings: Settings; dir: string } | null> {
  const stored = await loadSettings(ctx, workspace.id);

  const dir = workDir(workspace.id);

  await mkdir(dir, { recursive: true });

  progress.step("Exporting the workspace", "Exported the workspace");

  const exported = await loadExport(ctx, workspace, dir, {
    yaakCommand: text(stored.yaakCommand) || undefined,
    signal: progress.signal,
  });

  if (!exported) {
    return null;
  }

  progress.complete(
    exported.source === "api"
      ? "Exported the workspace with the plugin API"
      : "Exported the workspace",
  );

  if (exported.source === "api") {
    console.warn(`yaakdoc: Yaak CLI export failed, using the plugin API\n${exported.cliError}`);
  }

  const values = await progress.form({
    confirmText: kind === "build" ? "Build" : "Save",
    inputs: buildForm({
      kind,
      settings: stored,
      environments: environmentNames(exported.data),
      yaakdocCommand: YAAKDOC_COMMAND,
      ...(exported.source === "api"
        ? {
            warning:
              "Couldn't export with the Yaak CLI, so environments, gRPC and WebSocket requests are missing. Install [@yaakapp/cli](https://www.npmjs.com/package/@yaakapp/cli) to include them.",
          }
        : {}),
    }),
  });

  if (!values) {
    return null;
  }

  // The section shown is the form's state, not a setting.
  const { [SECTION]: _, ...changed } = values;
  const settings = { ...stored, ...changed };
  await saveSettings(ctx, workspace.id, settings);

  return { exported, settings, dir };
}

/** Converts and validates the settings, reporting problems in the dialog. */
async function configFrom(
  progress: ProgressDialog,
  settings: Settings,
): Promise<YaakdocConfig | null> {
  try {
    const config = settingsToConfig(settings);
    validateConfig(config);
    return config;
  } catch (error) {
    if (!(error instanceof SettingsError)) {
      throw error;
    }

    await progress.fail("Invalid settings", "Fix these settings and try again.", error.message);
    return null;
  }
}

async function buildDocs(ctx: Context, workspace: Workspace, progress: ProgressDialog) {
  const prepared = await prepare(ctx, workspace, "build", progress);

  if (!prepared) {
    return;
  }

  const { exported, settings, dir } = prepared;
  const config = await configFrom(progress, settings);

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

  progress.step("Building the docs", "Built the docs");

  const engine = loadEngine();

  try {
    const summary = await buildBuiltIn(build);
    await built(progress, summary, outDir);
  } catch (error) {
    if (!(error instanceof engine.ExternalThemeError)) {
      await progress.fail("yaakdoc build failed", "The build failed:", (error as Error).message);
      return;
    }

    await buildWithCli(progress, build, error.theme);
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
  progress: ProgressDialog,
  summary: { pages: number; textFiles: number } | null,
  outDir: string,
) {
  // The built-in build runs in Yaak's plugin process and can't be stopped halfway.
  if (progress.cancelled) {
    await progress.cancel(
      `The build couldn't be stopped and has finished: ${outDir} has the new docs.`,
    );
    return;
  }

  const files = summary
    ? `Built ${summary.pages} page${summary.pages === 1 ? "" : "s"} and ${summary.textFiles} Markdown/llms files`
    : "Built the docs";

  await progress.succeed(`${files} into \`${outDir}\`.`, {
    label: "Open folder",
    url: pathToFileURL(outDir).href,
  });
}

/**
 * Makes an npm theme available to the yaakdoc CLI. It finds themes installed next to the config
 * file, but the plugin's work directory has none: themes that aren't installed there are fetched
 * from npm into a cache, and the CLI gets the path. Returns the theme setting to build with, or
 * null when the dialog reported a problem or the user cancelled.
 */
async function fetchTheme(
  progress: ProgressDialog,
  build: BuildRequest,
  theme: string,
): Promise<string | null> {
  const candidates = loadEngine().themePackageCandidates(theme);

  if (isLocalTheme(theme) || candidates.some((name) => installedFrom(name, build.cwd))) {
    return theme;
  }

  const options = { signal: progress.signal, onOutput: progress.output };

  try {
    progress.step(`Looking up the theme "${theme}" on npm`);
    const pkg = await findThemePackage(
      theme,
      fetchableThemePackages(theme, candidates),
      build.dir,
      runCommand,
      options,
    );

    if (progress.cancelled) {
      return null;
    }

    progress.complete(`Found ${pkg.name} on npm`);
    progress.step(`Installing ${pkg.name}@${pkg.version}`, `Installed ${pkg.name}@${pkg.version}`);

    const manifest = await installTheme(pkg, themeCacheDir(), runCommand, options);

    return progress.cancelled ? null : manifest;
  } catch (error) {
    if (progress.cancelled) {
      return null;
    }

    if (error instanceof ThemeNotFoundError) {
      await progress.fail(
        "Theme not found",
        [
          `No theme package named **${theme}** is published on npm. The plugin looked for ${error.candidates.map((name) => `\`${name}\``).join(" and ")}. Check the theme name, or use a local path.`,
          ...(error.candidates.length < candidates.length
            ? [
                "",
                `A package named just \`${theme}\` isn't fetched, because it might not be a theme. To use one, install it next to your config file.`,
              ]
            : []),
        ].join("\n"),
      );
    } else if (error instanceof NpmError) {
      await progress.fail("Couldn't fetch the theme", error.message, error.output);
    } else {
      throw error;
    }

    return null;
  }
}

/** Builds a theme that isn't built in with the yaakdoc CLI, which needs Node.js and npm. */
async function buildWithCli(progress: ProgressDialog, build: BuildRequest, theme: string) {
  const outDir = build.overrides.outDir!;

  // The CLI runs through npx unless another command is configured, and themes are fetched with npm.
  if (!(await runCommand("npm", ["--version"], build.dir)).ok) {
    const fallback = await progress.form({
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

    progress.step("Building the docs with Kiseki", "Built the docs with Kiseki", {
      replace: true,
    });

    try {
      await built(progress, await buildBuiltIn(build, { theme: "kiseki" }), outDir);
    } catch (error) {
      await progress.fail("yaakdoc build failed", "The build failed:", (error as Error).message);
    }

    return;
  }

  // The built-in build's step ends here: the theme is fetched and built in steps of their own.
  progress.complete(null);

  const themeSpec = await fetchTheme(progress, build, theme);

  if (themeSpec === null) {
    return;
  }

  const overrides = join(build.dir, "overrides.json");
  await writeFile(
    overrides,
    JSON.stringify(
      { ...build.overrides, ...(themeSpec !== theme ? { theme: themeSpec } : {}) },
      null,
      2,
    ),
  );

  const command = build.command || YAAKDOC_COMMAND;

  const args = [
    "build",
    build.exported.file,
    "--overrides",
    overrides,
    ...(build.configFile ? ["--config", build.configFile] : []),
  ];

  progress.step(`Building the docs with ${theme}`, `Built the docs with ${theme}`);

  const result = await runCommand(command, args, build.cwd, {
    signal: progress.signal,
    onOutput: progress.output,
  });

  if (progress.cancelled) {
    return;
  }

  if (!result.ok) {
    await progress.fail(
      "yaakdoc build failed",
      `The build with \`${command}\` failed. Its output is below.`,
      result.output,
    );

    return;
  }

  const counts = result.output.match(/Built (\d+) pages? and (\d+) Markdown/);
  await built(
    progress,
    counts ? { pages: Number(counts[1]), textFiles: Number(counts[2]) } : null,
    outDir,
  );
}

/**
 * Points local paths into the project. Picked branding files are copied into it when they're
 * outside; the theme, pages directory and snippets can only be made relative (they're folders or
 * modules).
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
    ...(config.pagesDir ? { pagesDir: rel(config.pagesDir) } : {}),
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

async function saveProject(ctx: Context, workspace: Workspace, progress: ProgressDialog) {
  const prepared = await prepare(ctx, workspace, "project", progress);

  if (!prepared) {
    return;
  }

  const { exported, settings } = prepared;
  const config = await configFrom(progress, settings);

  if (!config) {
    return;
  }

  const projectDir = text(settings.projectDir);
  const folder = { label: "Open folder", url: pathToFileURL(projectDir).href };

  progress.step("Saving the project", "Saved yaakdoc.json");

  await mkdir(projectDir, { recursive: true });
  await writeFile(join(projectDir, "yaakdoc.json"), `${JSON.stringify(exported.data, null, 2)}\n`);

  const configPath = join(projectDir, "yaakdoc.config.json");
  const otherConfig = (await readdir(projectDir)).find(
    (name) => name.startsWith("yaakdoc.config.") && name !== "yaakdoc.config.json",
  );

  if (otherConfig) {
    await progress.succeed(
      `Updated \`yaakdoc.json\` in \`${projectDir}\`. \`${otherConfig}\` was left as it is, so the form's settings weren't saved to it.`,
      folder,
    );

    return;
  }

  let existing: YaakdocConfig = {};

  if (existsSync(configPath) && !isChecked(settings.replaceConfig)) {
    try {
      existing = JSON.parse(await readFile(configPath, "utf8")) as YaakdocConfig;
    } catch (error) {
      await progress.fail(
        "Couldn't read yaakdoc.config.json",
        "Fix the file, or tick **Replace an existing yaakdoc.config.json**.",
        (error as Error).message,
      );
      return;
    }
  }

  const { $schema: _, ...rest } = mergeConfig(existing, await projectPaths(config, projectDir));
  await writeFile(configPath, `${JSON.stringify({ $schema: SCHEMA_URL, ...rest }, null, 2)}\n`);

  progress.complete("Saved yaakdoc.json and yaakdoc.config.json");

  await progress.succeed(
    `Saved the project to \`${projectDir}\`. Run \`npx yaakdoc\` there to preview it.`,
    folder,
  );
}

/** Actions that are running, by kind and workspace. */
const running = new Map<string, ProgressDialog>();

/**
 * Runs an action in its own dialog, and reports unexpected errors there. Choosing an action that's
 * already running for the workspace brings its dialog back instead of starting it again.
 */
const action =
  (
    kind: FormKind,
    run: (ctx: Context, workspace: Workspace, progress: ProgressDialog) => Promise<void>,
  ) =>
  async (ctx: Context, { workspace }: { workspace: Workspace }) => {
    const key = `${kind}:${workspace.id}`;
    const current = running.get(key);

    if (current) {
      current.show();
      return;
    }

    const progress = new ProgressDialog(ctx, {
      id: `yaakdoc-${kind}`,
      title: ACTIONS[kind].title,
      action: ACTIONS[kind].label,
      description: workspace.name,
    });

    running.set(key, progress);

    try {
      await run(ctx, workspace, progress);

      if (progress.cancelled) {
        await progress.cancel();
      }
    } catch (error) {
      console.error("yaakdoc:", error);

      try {
        await progress.fail(
          "yaakdoc failed",
          "Something went wrong:",
          (error as Error).stack ?? String(error),
        );
      } catch {
        await ctx.toast.show({
          message: `yaakdoc: ${(error as Error).message}`,
          color: "danger",
          icon: "alert_triangle",
          timeout: 10000,
        });
      }
    } finally {
      running.delete(key);
    }
  };

export const plugin: PluginDefinition = {
  workspaceActions: [
    { label: ACTIONS.build.label, onSelect: action("build", buildDocs) },
    { label: ACTIONS.project.label, onSelect: action("project", saveProject) },
  ],
};
