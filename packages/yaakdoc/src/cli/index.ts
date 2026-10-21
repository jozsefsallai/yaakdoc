import { relative } from "node:path";
import * as p from "@clack/prompts";
import { mergeConfig, type YaakdocConfig } from "@yaakdoc/config";
import { type ArgsDef, defineCommand, runMain } from "citty";
import { consola } from "consola";
import colors from "picocolors";
import { build } from "../node/build";
import type { Context } from "../node/context";
import { createDevServer } from "../node/dev";
import { eject } from "../node/eject";
import { init } from "../node/init";
import { preview } from "../node/preview";
import { VERSION } from "../node/version";
import { readOverrides } from "./overrides";

const sharedArgs = {
  export: {
    type: "positional",
    required: false,
    description: "Path to the Yaak export (auto-detected by default)",
  },
  config: { type: "string", alias: "c", description: "Path to the config file" },
  theme: { type: "string", alias: "t", description: "Theme name, package or local path" },
  pages: {
    type: "enum",
    options: ["single", "per-request"] as string[],
    description: "Page layout: one page or a page per request",
  },
  base: { type: "string", description: "Base path the site is served from, e.g. /docs/" },
  environment: { type: "string", alias: "e", description: "Environment used to resolve variables" },
  workspace: { type: "string", alias: "w", description: "Workspace to document (id or name)" },
  overrides: {
    type: "string",
    description: "Config values merged over the config file (a JSON file or inline JSON)",
  },
} satisfies ArgsDef;

type SharedArgs = { [K in keyof typeof sharedArgs]?: string | undefined };

function overridesFrom(args: SharedArgs & Record<string, unknown>): YaakdocConfig {
  const overrides: YaakdocConfig = {};

  if (args.export) {
    overrides.export = args.export;
  }

  if (args.theme) {
    overrides.theme = args.theme;
  }

  if (args.pages) {
    overrides.pages = args.pages as "single" | "per-request";
  }

  if (args.base) {
    overrides.base = args.base;
  }

  if (args.environment) {
    overrides.environment = args.environment;
  }

  if (args.workspace) {
    overrides.workspace = args.workspace;
  }

  // Explicit flags win over --overrides.
  return args.overrides ? mergeConfig(readOverrides(args.overrides), overrides) : overrides;
}

const rel = (path: string) => relative(process.cwd(), path) || ".";

function summary(context: Context) {
  const requests = Object.keys(context.document.requests).length;
  const folders = Object.keys(context.document.folders).length;

  const lines = [
    `${colors.dim("Export")}       ${context.exportPath ? rel(context.exportPath) : "(in memory)"} ${colors.dim(`(Yaak ${context.source.yaakVersion})`)}`,
    `${colors.dim("Workspace")}    ${context.document.workspace.name} ${colors.dim(`· ${requests} requests, ${folders} folders`)}`,
    `${colors.dim("Environment")}  ${context.document.environment?.name ?? colors.dim("none")}`,
    `${colors.dim("Theme")}        ${context.theme.name} ${colors.dim(context.theme.packageName ?? rel(context.theme.root))}`,
    `${colors.dim("Config")}       ${context.configFile ? rel(context.configFile) : colors.dim("none (defaults)")}`,
  ];

  return lines.map((line) => `  ${line}`).join("\n");
}

const banner = () => `\n  ${colors.bold(colors.magenta("yaakdoc"))} ${colors.dim(`v${VERSION}`)}\n`;

const dev = defineCommand({
  meta: { name: "dev", description: "Start the docs dev server (default command)" },
  args: {
    ...sharedArgs,
    port: { type: "string", alias: "p", description: "Port (default: 4000)" },
    host: { type: "string", description: "Host to listen on (use --host 0.0.0.0 to expose)" },
    open: { type: "boolean", alias: "o", description: "Open the browser" },
    watch: {
      type: "boolean",
      default: true,
      negativeDescription: "Don't reload when the export or config changes",
    },
  },
  async run({ args }) {
    const server = await createDevServer({
      ...(args.config ? { configFile: args.config } : {}),
      overrides: overridesFrom(args),
      ...(args.port ? { port: Number(args.port) } : {}),
      ...(args.host ? { host: args.host === "true" ? true : args.host } : {}),
      ...(args.open ? { open: true } : {}),
      watch: args.watch,
    });

    const context = server.getContext();

    console.log(banner());
    console.log(summary(context));
    console.log(`\n  ${colors.green("➜")}  ${colors.bold("Local")}   ${colors.cyan(server.url)}`);

    if (context.config.llms.enabled) {
      console.log(
        `  ${colors.green("➜")}  ${colors.bold("LLMs")}    ${colors.cyan(`${server.url}llms.txt`)}`,
      );
    }

    console.log(
      `\n  ${colors.dim(args.watch ? "Watching for changes. Press Ctrl+C to stop." : "Press Ctrl+C to stop.")}\n`,
    );

    const shutdown = async () => {
      await server.close();
      process.exit(0);
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  },
});

const buildCommand = defineCommand({
  meta: { name: "build", description: "Build a static site" },
  args: {
    ...sharedArgs,
    outDir: { type: "string", alias: "o", description: "Output directory (default: dist)" },
  },
  async run({ args }) {
    console.log(banner());

    const started = performance.now();

    const overrides = overridesFrom(args);

    if (args.outDir) {
      overrides.outDir = args.outDir;
    }

    const result = await build({ ...(args.config ? { configFile: args.config } : {}), overrides });

    console.log(summary(result.context));

    const pages = result.files.filter((file) => file.endsWith(".html")).length;
    const markdown = result.files.filter(
      (file) => file.endsWith(".md") || file.endsWith(".txt"),
    ).length;

    console.log(
      `\n  ${colors.green("✔")} Built ${pages} page${pages === 1 ? "" : "s"} and ${markdown} Markdown/llms files into ${colors.cyan(rel(result.outDir))} ${colors.dim(`in ${Math.round(performance.now() - started)}ms`)}\n`,
    );
  },
});

const previewCommand = defineCommand({
  meta: { name: "preview", description: "Serve the built site locally" },
  args: {
    config: sharedArgs.config,
    outDir: { type: "string", description: "Directory to serve (default: dist)" },
    port: { type: "string", alias: "p", description: "Port (default: 4000)" },
    host: { type: "string", description: "Host to listen on" },
    open: { type: "boolean", alias: "o", description: "Open the browser" },
  },
  async run({ args }) {
    const server = await preview({
      ...(args.config ? { configFile: args.config } : {}),
      ...(args.outDir ? { outDir: args.outDir } : {}),
      ...(args.port ? { port: Number(args.port) } : {}),
      ...(args.host ? { host: args.host } : {}),
      ...(args.open ? { open: true } : {}),
    });

    console.log(banner());
    console.log(`  ${colors.green("➜")}  ${colors.bold("Preview")} ${colors.cyan(server.url)}\n`);
  },
});

const initCommand = defineCommand({
  meta: { name: "init", description: "Create a yaakdoc.config.json" },
  args: {
    yes: { type: "boolean", alias: "y", description: "Use defaults without prompting" },
    force: { type: "boolean", description: "Overwrite an existing config" },
  },
  async run({ args }) {
    const config: YaakdocConfig = {};

    if (!args.yes && process.stdin.isTTY) {
      p.intro(colors.bold(colors.magenta(" yaakdoc init ")));

      const answers = await p.group(
        {
          title: () =>
            p.text({ message: "Site title", placeholder: "Defaults to the workspace name" }),
          primary: () =>
            p.text({ message: "Primary brand color", placeholder: "#7c3aed", defaultValue: "" }),
          pages: () =>
            p.select({
              message: "Page layout",
              options: [
                {
                  value: "single",
                  label: "Single page",
                  hint: "everything on one page, like Insomnia Documenter",
                },
                { value: "per-request", label: "Page per request", hint: "better for large APIs" },
              ],
            }),
          llms: () =>
            p.confirm({
              message: "Generate llms.txt and Markdown pages for LLMs?",
              initialValue: true,
            }),
        },
        { onCancel: () => process.exit(1) },
      );

      if (answers.title) {
        config.branding = { ...config.branding, title: answers.title };
      }

      if (answers.primary) {
        config.branding = { ...config.branding, colors: { primary: answers.primary } };
      }

      config.pages = answers.pages as "single" | "per-request";

      if (!answers.llms) {
        config.llms = { enabled: false };
      }
    }

    const { file } = await init({ config, force: Boolean(args.force) });

    if (!args.yes && process.stdin.isTTY) {
      p.outro(`Created ${colors.cyan(rel(file))}. Run ${colors.bold("npx yaakdoc")} to start.`);
    } else {
      consola.success(`Created ${rel(file)}`);
    }
  },
});

const ejectCommand = defineCommand({
  meta: { name: "eject", description: "Copy the theme into your project to customize it" },
  args: {
    config: sharedArgs.config,
    out: { type: "string", description: "Destination directory (default: ./theme)" },
    force: { type: "boolean", description: "Overwrite a non-empty destination" },
  },
  async run({ args }) {
    const result = await eject({
      ...(args.config ? { configFile: args.config } : {}),
      ...(args.out ? { out: args.out } : {}),
      force: Boolean(args.force),
    });

    consola.success(
      `Ejected theme ${colors.bold(result.theme)} into ${colors.cyan(rel(result.out))} (${result.files.length} files)`,
    );

    if (result.config?.updated) {
      consola.info(
        `${result.config.created ? "Created" : "Updated"} ${rel(result.config.file)} → "theme": "./${rel(result.out)}"`,
      );
    } else if (result.config) {
      consola.warn(
        `Set \`theme: "./${rel(result.out)}"\` in ${rel(result.config.file)} to use the ejected theme.`,
      );
    }

    if (result.dependencies.length > 0) {
      consola.info(
        `The theme's dependencies are provided by yaakdoc. To pin your own versions, install:\n  npm i -D ${result.dependencies.join(" ")}`,
      );
    }
  },
});

const subCommands = {
  dev,
  build: buildCommand,
  preview: previewCommand,
  init: initCommand,
  eject: ejectCommand,
};

const main = defineCommand({
  meta: {
    name: "yaakdoc",
    version: VERSION,
    description: "API documentation sites from Yaak exports",
  },
  default: "dev",
  subCommands,
});

/** `yaakdoc ./api.json --port 3000` → `yaakdoc dev ./api.json --port 3000` */
export function normalizeArgs(argv: string[]): string[] {
  const first = argv.find((arg) => !arg.startsWith("-"));

  const isGlobalFlag =
    argv.length > 0 && argv.every((arg) => ["-h", "--help", "-v", "--version"].includes(arg));

  if (isGlobalFlag) {
    return argv;
  }

  if (first && first in subCommands) {
    return argv;
  }

  return argv.length === 0 ? argv : ["dev", ...argv];
}

export async function run(argv = process.argv.slice(2)) {
  process.on("unhandledRejection", (error) => {
    consola.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });

  try {
    await runMain(main, { rawArgs: normalizeArgs(argv) });
  } catch (error) {
    consola.error((error as Error).message);
    process.exit(1);
  }
}
