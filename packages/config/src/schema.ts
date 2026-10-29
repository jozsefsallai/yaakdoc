import { normalizeBase } from "@yaakdoc/core";
import { z } from "zod";

const color = z
  .string()
  .meta({ description: "Any CSS color, e.g. `#7c3aed`, `oklch(0.6 0.2 290)` or `rebeccapurple`." });

const modeColors = z
  .object({
    primary: color.optional(),
    accent: color.optional(),
    background: color.optional(),
    foreground: color.optional(),
  })
  .meta({ description: "Color overrides that apply to a single color mode." });

export const logoSchema = z.union([
  z.string().meta({ description: "Path or URL of the logo (used in both color modes)." }),
  z.object({
    light: z.string().optional().meta({ description: "Logo used in light mode." }),
    dark: z.string().optional().meta({ description: "Logo used in dark mode." }),
    alt: z.string().optional(),
    href: z
      .string()
      .optional()
      .meta({ description: "Where clicking the logo leads. Defaults to the docs home." }),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
]);

export const brandingSchema = z
  .object({
    title: z
      .string()
      .optional()
      .meta({ description: "Site title. Defaults to the workspace name." }),
    description: z.string().optional().meta({
      description:
        "Short site description (meta tags, llms.txt). Defaults to the workspace description's first paragraph.",
    }),
    url: z.url().optional().meta({
      description:
        "Public URL of the deployed docs. Enables absolute links, canonical URLs and sitemap.xml.",
    }),
    logo: logoSchema.optional(),
    favicon: z.string().optional().meta({ description: "Path or URL of the favicon." }),
    colors: z
      .object({
        primary: color.optional(),
        accent: color.optional(),
        light: modeColors.optional(),
        dark: modeColors.optional(),
      })
      .optional(),
    fonts: z
      .object({
        sans: z
          .string()
          .optional()
          .meta({ description: 'CSS font-family for text, e.g. `"Inter", sans-serif`.' }),
        mono: z.string().optional().meta({ description: "CSS font-family for code." }),
        stylesheet: z.string().optional().meta({
          description: "Stylesheet URL that loads the fonts, e.g. a Google Fonts CSS URL.",
        }),
      })
      .optional(),
    links: z
      .array(
        z.object({
          label: z.string(),
          href: z.string(),
          icon: z.string().optional().meta({
            description: "Icon hint for themes, e.g. `github`, `discord`, `x`, `website`.",
          }),
        }),
      )
      .default([])
      .meta({ description: "Links shown in the header." }),
    footer: z.string().optional().meta({ description: "Footer text (Markdown)." }),
    defaultColorMode: z.enum(["system", "light", "dark"]).default("system"),
    colorModeToggle: z
      .boolean()
      .default(true)
      .meta({ description: "Show the light/dark mode toggle." }),
    customCss: z
      .string()
      .optional()
      .meta({ description: "Path to a CSS file loaded after the theme's styles." }),
  })
  .prefault({});

export const headTagSchema = z.object({
  tag: z.enum(["script", "link", "meta", "style"]),
  attrs: z.record(z.string(), z.union([z.string(), z.boolean()])).default({}),
  content: z.string().optional(),
});

const icon = z.string().meta({ description: "Icon hint for themes (e.g. a Lucide icon name)." });

const pagePath = z.string().meta({
  description:
    "Path of a page, relative to `pagesDir`, without the extension (e.g. `guides/auth`).",
});

const apiEntry = z
  .object({ api: z.literal(true) })
  .meta({ description: "Where the Yaak folders and requests (the API reference) appear." });

export const navigationGroupSchema = z
  .object({
    group: z.string().meta({ description: "Title of the group." }),
    icon: icon.optional(),
    expanded: z
      .boolean()
      .optional()
      .meta({ description: "Whether a nested group starts expanded (default: true)." }),
    get pages(): z.ZodOptional<z.ZodArray<typeof navigationItemSchema>> {
      return z.array(navigationItemSchema).optional();
    },
    api: z
      .literal(true)
      .optional()
      .meta({ description: "Add the Yaak folders and requests after the group's pages." }),
  })
  .meta({ id: "NavigationGroup", description: "A titled group of pages (groups can be nested)." });

export const navigationItemSchema: z.ZodUnion<
  [typeof pagePath, typeof navigationGroupSchema, typeof apiEntry]
> = z.union([pagePath, navigationGroupSchema, apiEntry]);

export const navigationTabSchema = z
  .object({
    tab: z.string().meta({ description: "Title of the tab." }),
    icon: icon.optional(),
    pages: z.array(navigationItemSchema).optional(),
    groups: z.array(navigationGroupSchema).optional(),
    api: z
      .literal(true)
      .optional()
      .meta({ description: "Add the Yaak folders and requests after the tab's pages and groups." }),
  })
  .meta({ description: "A top-level section with its own sidebar navigation." });

export const navigationSchema = z
  .object({
    tabs: z.array(navigationTabSchema).optional(),
    groups: z.array(navigationGroupSchema).optional(),
    pages: z.array(navigationItemSchema).optional(),
  })
  .refine((nav) => !nav.tabs || (!nav.groups && !nav.pages), {
    message: "Use either `tabs`, or `groups`/`pages` at the top level of the navigation.",
  })
  .meta({
    description:
      'Navigation of the pages and the API reference, with optional tabs and groups. Place the Yaak folders and requests with `{ "api": true }` (or `api: true` on a tab or group); otherwise they\'re added at the end. Generated from the pages directory when omitted.',
  });

export const configSchema = z
  .object({
    $schema: z.string().optional(),
    export: z.string().optional().meta({
      description: "Path to the Yaak export. Defaults to yaakdoc.json, then yaak.json.",
    }),
    theme: z.string().default("kiseki").meta({
      description:
        "Theme to use: a short name (`kiseki` → @yaakdoc/theme-kiseki or yaakdoc-theme-kiseki), an npm package name, or a local path (e.g. an ejected theme).",
    }),
    themeOptions: z
      .record(z.string(), z.unknown())
      .default({})
      .meta({ description: "Theme-specific options, validated by the theme." }),
    workspace: z
      .string()
      .optional()
      .meta({ description: "Workspace id or name to document, when the export contains several." }),
    environment: z
      .union([z.string(), z.literal(false)])
      .optional()
      .meta({
        description:
          "Environment (id or name) used to resolve variables in examples. Defaults to the first shared environment; `false` disables sub environments.",
      }),
    environments: z
      .union([z.literal("public"), z.array(z.string())])
      .optional()
      .meta({
        description:
          'Environments readers can switch between: `"public"` (all shared environments) or a list of ids/names. Adds an environment switcher; `environment` is the default selection.',
      }),
    pagesDir: z.string().optional().meta({
      description:
        "Directory of Markdown pages (`.md`, with optional front matter). Subdirectories become groups in the generated navigation.",
    }),
    navigation: navigationSchema.optional(),
    apiPath: z
      .string()
      .optional()
      .transform((path) => path?.replace(/^\/+|\/+$/g, ""))
      .meta({
        description:
          'Where the API reference (overview, folders and requests) is served, relative to `base`. Defaults to the site root, or `"reference"` when the pages directory has an `index.md`.',
      }),
    search: z
      .boolean()
      .default(true)
      .meta({ description: "Generate a search index and show the search dialog." }),
    pages: z.enum(["single", "per-request"]).default("single").meta({
      description: "`single`: one page with anchors. `per-request`: a page per request and folder.",
    }),
    base: z
      .string()
      .default("/")
      .transform(normalizeBase)
      .meta({ description: "Base path the site is served from, e.g. `/docs/`." }),
    outDir: z
      .string()
      .default("dist")
      .meta({ description: "Output directory for `yaakdoc build`." }),
    server: z
      .object({
        port: z.number().int().min(0).max(65535).default(4000),
        host: z.union([z.boolean(), z.string()]).default(false),
        open: z.boolean().default(false),
      })
      .prefault({}),
    branding: brandingSchema,
    snippets: z
      .array(z.string())
      .default(["curl", "javascript", "python", "go", "grpcurl", "wscat"])
      .meta({
        description:
          "Code example generators: built-in ids (curl, javascript, python, go, grpcurl, wscat) or module paths. Each snippet only applies to the request kinds it supports.",
      }),
    llms: z
      .object({
        enabled: z
          .boolean()
          .default(true)
          .meta({ description: "Generate llms.txt and Markdown versions of pages." }),
        full: z
          .boolean()
          .default(true)
          .meta({ description: "Also generate llms-full.txt with the complete docs." }),
        copyButton: z.boolean().default(true).meta({ description: 'Show "Copy page" actions.' }),
        openIn: z
          .array(z.enum(["chatgpt", "claude", "perplexity"]))
          .default(["chatgpt", "claude"])
          .meta({ description: '"Open in ..." assistant links.' }),
      })
      .prefault({}),
    variables: z
      .object({
        resolve: z
          .boolean()
          .default(true)
          .meta({ description: "Inline variable values in examples." }),
        hide: z
          .array(z.string())
          .default([
            "token",
            "secret",
            "password",
            "passwd",
            "apikey",
            "api_key",
            "private",
            "credential",
            "auth",
          ])
          .meta({
            description:
              "Variable name patterns that are never inlined (case- and separator-insensitive substring match).",
          }),
        show: z
          .boolean()
          .default(true)
          .meta({ description: "Show the environment variables table." }),
      })
      .prefault({}),
    filter: z
      .object({
        include: z.array(z.string()).default([]),
        exclude: z.array(z.string()).default([]),
      })
      .prefault({})
      .meta({ description: "Glob patterns over request/folder slugs (e.g. `internal/**`)." }),
    runInYaak: z
      .union([
        z.boolean(),
        z.object({
          name: z.string().optional().meta({
            description: "Name shown in Yaak when importing. Defaults to the site title.",
          }),
          url: z.string().optional().meta({
            description:
              "URL of an export/spec hosted elsewhere. When omitted, yaakdoc publishes a sanitized export at `<base>/yaak.json`.",
          }),
        }),
      ])
      .default(false)
      .meta({
        description:
          'Show a "Run in Yaak" button that imports the API into Yaak. Publishes a sanitized copy of the export (only documented requests, no private environments, secrets blanked).',
      }),
    head: z.array(headTagSchema).default([]).meta({
      description: "Extra tags injected into <head> (analytics, verification meta tags...).",
    }),
  })
  .meta({ title: "yaakdoc configuration" });

/** Configuration as written by users – every field is optional. */
export type YaakdocConfig = z.input<typeof configSchema>;
/** Configuration with defaults applied. */
export type ResolvedConfig = z.output<typeof configSchema>;
export type Branding = ResolvedConfig["branding"];
export type HeadTag = z.output<typeof headTagSchema>;
export type Logo = z.output<typeof logoSchema>;
export type NavigationConfig = z.output<typeof navigationSchema>;
