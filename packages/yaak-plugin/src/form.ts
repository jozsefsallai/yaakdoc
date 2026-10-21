import type { DynamicPromptFormArg as FormInput } from "@yaakapp/api";
import { DEFAULT, DEFAULTS, NO_ENVIRONMENT, OTHER_THEME, type Settings } from "./settings";

export type FormKind = "build" | "project";

export type FormOptions = {
  kind: FormKind;
  settings: Settings;
  /** Names of the environments in the export. */
  environments: string[];
  /** Placeholder for the yaakdoc command setting. */
  yaakdocCommand: string;
};

const onOff = (value: boolean) => (value ? "on" : "off");

export function buildForm({
  kind,
  settings,
  environments,
  yaakdocCommand,
}: FormOptions): FormInput[] {
  const value = (name: string, fallback = "") => {
    const stored = settings[name];
    return stored === null || stored === undefined ? fallback : String(stored);
  };

  const text = (
    name: string,
    label: string,
    extra: { placeholder?: string; description?: string; multiLine?: boolean } = {},
  ): FormInput => ({
    type: "text",
    name,
    label,
    optional: true,
    defaultValue: value(name),
    ...extra,
  });

  // Yaak doesn't show the label of file inputs, so a Markdown line above the picker says what it's
  // for.
  const file = (
    name: string,
    label: string,
    help: string,
    { directory = false, required = false } = {},
  ): FormInput[] => [
    { type: "markdown", content: `**${label}${required ? "" : " (optional)"}**: ${help}` },
    {
      type: "file",
      name,
      label,
      title: label,
      directory,
      optional: !required,
      defaultValue: value(name),
    },
  ];

  const select = (
    name: string,
    label: string,
    defaultLabel: string,
    options: { label: string; value: string }[],
    description?: string,
  ): FormInput => ({
    type: "select",
    name,
    label,
    defaultValue: value(name, DEFAULT),
    options: [{ label: `Default (${defaultLabel})`, value: DEFAULT }, ...options],
    ...(description ? { description } : {}),
  });

  const toggle = (name: string, label: string, fallback: boolean, description?: string) =>
    select(
      name,
      label,
      onOff(fallback),
      [
        { label: "On", value: "on" },
        { label: "Off", value: "off" },
      ],
      description,
    );

  // The theme name field and its notice only show when "Other theme..." is selected.
  const otherTheme = {
    hidden: settings.themeChoice !== OTHER_THEME,
    dynamic: (_ctx: unknown, { values }: { values: Settings }) => ({
      hidden: values.themeChoice !== OTHER_THEME,
    }),
  };

  const target: FormInput[] =
    kind === "build"
      ? [
          ...file("outDir", "Output directory", "the folder the site is built into.", {
            directory: true,
            required: true,
          }),
          ...file(
            "configFile",
            "Config file",
            "an existing `yaakdoc.config.*` to build on. The fields below override it.",
          ),
        ]
      : [
          ...file(
            "projectDir",
            "Project directory",
            "where `yaakdoc.json` and `yaakdoc.config.json` are saved.",
            { directory: true, required: true },
          ),
          {
            type: "checkbox",
            name: "replaceConfig",
            label: "Replace an existing yaakdoc.config.json instead of merging into it",
            optional: true,
            defaultValue: value("replaceConfig", "false"),
          },
        ];

  return [
    ...target,

    {
      type: "markdown",
      content:
        kind === "build"
          ? "Empty fields and **Default** keep the value from the config file, or yaakdoc's default."
          : "Empty fields and **Default** keep yaakdoc's default, or the existing config's value.",
    },

    {
      type: "accordion",
      label: "General",
      inputs: [
        select(
          "themeChoice",
          "Theme",
          "the config file's, or Kiseki",
          [
            { label: "Kiseki (built in)", value: DEFAULTS.theme },
            { label: "Other theme...", value: OTHER_THEME },
          ],
          "Kiseki is built into the plugin. Other themes are built with the yaakdoc CLI.",
        ),

        {
          ...text("theme", "Theme name", {
            placeholder: "yaakdoc-theme-acme, or ./my-theme",
            description: "A short name, an npm package or a local path.",
          }),
          ...otherTheme,
        },

        {
          type: "banner",
          color: "notice",
          inputs: [
            {
              type: "markdown",
              content:
                "Themes other than Kiseki are built with the yaakdoc CLI, which needs [Node.js](https://nodejs.org) (with npm) installed.",
            },
          ],
          ...otherTheme,
        },

        select("pages", "Pages", DEFAULTS.pages, [
          { label: "Single page", value: "single" },
          { label: "Page per request", value: "per-request" },
        ]),

        text("base", "Base path", { placeholder: DEFAULTS.base }),

        select(
          "environment",
          "Environment",
          "first shared",
          [
            { label: "None (base environment only)", value: NO_ENVIRONMENT },
            ...environments.map((name) => ({ label: name, value: name })),
          ],
          "Used to resolve variables in examples.",
        ),

        select(
          "environments",
          "Environment switcher",
          "off",
          [{ label: "All shared environments", value: "public" }],
          "Lets readers switch environments.",
        ),
      ],
    },

    {
      type: "accordion",
      label: "Branding",
      inputs: [
        text("title", "Title", { placeholder: "The workspace name" }),

        text("description", "Description", { placeholder: "The workspace description" }),

        text("url", "Site URL", {
          placeholder: "https://docs.example.com",
          description: "Enables absolute links, canonical URLs and sitemap.xml.",
        }),

        ...file("logo", "Logo", "an image shown in the header."),

        ...file("favicon", "Favicon", "the icon shown in browser tabs."),

        {
          type: "h_stack",
          inputs: [
            text("primaryColor", "Primary color", { placeholder: "#7c3aed" }),
            text("accentColor", "Accent color"),
          ],
        },

        {
          type: "h_stack",
          inputs: [
            select("defaultColorMode", "Color mode", DEFAULTS.branding.defaultColorMode, [
              { label: "System", value: "system" },
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
            ]),

            toggle("colorModeToggle", "Color mode toggle", DEFAULTS.branding.colorModeToggle),
          ],
        },

        {
          type: "h_stack",
          inputs: [
            text("fontSans", "Text font", { placeholder: '"Inter", sans-serif' }),

            text("fontMono", "Code font"),
          ],
        },

        text("fontStylesheet", "Font stylesheet URL"),

        {
          type: "editor",
          name: "links",
          label: "Header links",
          description: "One link per line: Label | https://... | icon (optional)",
          language: "text",
          optional: true,
          rows: 3,
          hideGutter: true,
          placeholder: "GitHub | https://github.com/acme | github",
          defaultValue: value("links"),
        },

        text("footer", "Footer (Markdown)", { multiLine: true }),

        ...file("customCss", "Custom CSS", "a stylesheet loaded after the theme's styles."),
      ],
    },

    {
      type: "accordion",
      label: "Code examples",
      inputs: [
        text("snippets", "Snippets", {
          placeholder: DEFAULTS.snippets.join(", "),
          description: "Built-in ids or module paths, separated by commas.",
        }),
      ],
    },

    {
      type: "accordion",
      label: "LLMs",
      inputs: [
        {
          type: "h_stack",
          inputs: [
            toggle("llmsEnabled", "llms.txt and Markdown", DEFAULTS.llms.enabled),

            toggle("llmsFull", "llms-full.txt", DEFAULTS.llms.full),

            toggle("llmsCopyButton", "Copy page", DEFAULTS.llms.copyButton),
          ],
        },

        text("llmsOpenIn", "Open in", {
          placeholder: DEFAULTS.llms.openIn.join(", "),
          description: "Any of chatgpt, claude and perplexity.",
        }),
      ],
    },

    {
      type: "accordion",
      label: "Variables",
      inputs: [
        {
          type: "h_stack",
          inputs: [
            toggle(
              "variablesResolve",
              "Inline values",
              DEFAULTS.variables.resolve,
              "Inline variable values in examples.",
            ),

            toggle(
              "variablesShow",
              "Variables table",
              DEFAULTS.variables.show,
              "Show the environment variables table.",
            ),
          ],
        },

        text("variablesHide", "Hidden variables", {
          placeholder: DEFAULTS.variables.hide.join(", "),
          description:
            "Name patterns whose values are never shown. Setting this replaces the defaults.",
        }),
      ],
    },

    {
      type: "accordion",
      label: "Filter",
      inputs: [
        text("filterInclude", "Include", {
          placeholder: "orders/**",
          description: "Glob patterns over request and folder slugs, separated by commas.",
        }),

        text("filterExclude", "Exclude", { placeholder: "internal/**" }),
      ],
    },

    {
      type: "accordion",
      label: "Run in Yaak",
      inputs: [
        {
          type: "h_stack",
          inputs: [
            toggle(
              "runInYaak",
              "Run in Yaak button",
              DEFAULTS.runInYaak !== false,
              "Publishes a sanitized copy of the export with the docs.",
            ),

            text("runInYaakName", "Name in Yaak", { placeholder: "The site title" }),
          ],
        },
      ],
    },

    {
      type: "accordion",
      label: "Advanced",
      inputs: [
        {
          type: "editor",
          name: "extraConfig",
          label: "Extra config (JSON)",
          description:
            "Any other config values, e.g. themeOptions, head or a logo URL. Merged over the fields above.",
          language: "json",
          optional: true,
          rows: 5,
          placeholder: '{ "themeOptions": {} }',
          defaultValue: value("extraConfig"),
        },

        text("yaakdocCommand", "yaakdoc command", {
          placeholder: yaakdocCommand,
          description: "Used for themes other than Kiseki.",
        }),

        text("yaakCommand", "Yaak CLI command", {
          placeholder: "yaak, or npx -y @yaakapp/cli",
          description: "Used to export the workspace. Takes effect from the next run.",
        }),
      ],
    },
  ];
}
