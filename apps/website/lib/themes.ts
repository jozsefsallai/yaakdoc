export interface Theme {
  package: string;
  shortName: string;
  displayName: string;
  description: string;
  version?: string;
  author?: string;
  keywords: string[];
  /** ISO date of the latest publish. */
  updatedAt?: string;
  /** Downloads in the last month. */
  downloads?: number;
  preview?: {
    light: string;
    dark?: string;
  };
  demo?: string;
  docs?: string;
  npm: string;
  repository?: string;
  official: boolean;
}

const KEYWORD = "yaakdoc-theme";
const REGISTRY = "https://registry.npmjs.org";
const REVALIDATE = 3600;

/** Themes known to the website. Merged over what npm returns, and used when npm is unreachable. */
const localThemes: Theme[] = [
  {
    package: "@yaakdoc/theme-kiseki",
    shortName: "kiseki",
    displayName: "Kiseki",
    description:
      "The default theme. Tailwind CSS v4 and shadcn/ui, light and dark mode, a sticky code panel, search and tabs.",
    keywords: [],
    preview: {
      light: "/screenshots/kiseki-light.webp",
      dark: "/screenshots/kiseki-dark.webp",
    },
    demo: "https://demo.yaakdoc.dev",
    docs: "/docs/theming/kiseki",
    npm: "https://www.npmjs.com/package/@yaakdoc/theme-kiseki",
    repository: "https://github.com/jozsefsallai/yaakdoc/tree/master/packages/theme-kiseki",
    official: true,
  },
];

export const defaultThemePackage = "@yaakdoc/theme-kiseki";

/** The name to use in `"theme"`, mirroring how yaakdoc resolves theme names. */
export function themeShortName(name: string): string {
  if (name.startsWith("@yaakdoc/theme-")) {
    return name.slice("@yaakdoc/theme-".length);
  }

  if (name.startsWith("yaakdoc-theme-")) {
    return name.slice("yaakdoc-theme-".length);
  }

  return name;
}

export function isOfficialTheme(name: string): boolean {
  return name.startsWith("@yaakdoc/");
}

interface SearchResult {
  objects: {
    downloads?: { monthly?: number; weekly?: number };
    updated?: string;
    package: {
      name: string;
      version: string;
      description?: string;
      keywords?: string[];
      date?: string;
      publisher?: { username?: string };
      links?: { npm?: string; repository?: string };
    };
  }[];
  total: number;
}

interface Manifest {
  author?: string | { name?: string };
  repository?: string | { url?: string; directory?: string };
  yaakdoc?: {
    displayName?: string;
    description?: string;
    preview?: string;
    demo?: string;
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { next: { revalidate: REVALIDATE } });
  if (!response.ok) {
    throw new Error(`${url}: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function search(): Promise<SearchResult["objects"]> {
  const size = 250;
  const objects: SearchResult["objects"] = [];

  for (let from = 0; ; from += size) {
    const page = await fetchJson<SearchResult>(
      `${REGISTRY}/-/v1/search?text=keywords:${KEYWORD}&size=${size}&from=${from}`,
    );

    objects.push(...page.objects);

    if (page.objects.length < size || objects.length >= page.total) {
      return objects;
    }
  }
}

function httpUrl(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  const cleaned = url.replace(/^git\+/, "").replace(/\.git$/, "");
  return /^https?:\/\//.test(cleaned) ? cleaned : undefined;
}

function repositoryUrl(manifest: Manifest, fallback?: string): string | undefined {
  const { repository } = manifest;

  if (typeof repository === "object" && repository.url) {
    const base = httpUrl(repository.url);

    if (base && repository.directory && base.startsWith("https://github.com/")) {
      return `${base}/tree/HEAD/${repository.directory}`;
    }

    return base;
  }

  return httpUrl(typeof repository === "string" ? repository : fallback);
}

function authorName(manifest: Manifest, publisher?: string): string | undefined {
  const { author } = manifest;
  const name = typeof author === "string" ? author : author?.name;
  // "Name <email> (url)" → "Name"
  return name?.replace(/\s*[<(].*$/, "").trim() || publisher;
}

async function fetchThemes(): Promise<Theme[]> {
  const results = await search();

  return Promise.all(
    results
      .filter(({ package: pkg }) => pkg.keywords?.includes(KEYWORD))
      .map(async ({ package: pkg, downloads, updated }) => {
        const manifest = await fetchJson<Manifest>(
          `${REGISTRY}/${pkg.name.replace("/", "%2F")}/latest`,
        ).catch((): Manifest => ({}));

        const meta = manifest.yaakdoc ?? {};

        return {
          package: pkg.name,
          shortName: themeShortName(pkg.name),
          displayName: meta.displayName ?? pkg.name,
          description: meta.description ?? pkg.description ?? "",
          version: pkg.version,
          author: authorName(manifest, pkg.publisher?.username),
          keywords: pkg.keywords ?? [],
          updatedAt: pkg.date ?? updated,
          downloads: downloads?.monthly,
          preview: httpUrl(meta.preview) ? { light: meta.preview! } : undefined,
          demo: httpUrl(meta.demo),
          npm: pkg.links?.npm ?? `https://www.npmjs.com/package/${pkg.name}`,
          repository: repositoryUrl(manifest, pkg.links?.repository),
          official: isOfficialTheme(pkg.name),
        } satisfies Theme;
      }),
  );
}

/** Every theme on npm with the `yaakdoc-theme` keyword, refreshed hourly. */
export async function getThemes(): Promise<Theme[]> {
  const remote = await fetchThemes().catch((error) => {
    console.warn(`Couldn't load themes from npm: ${error}`);
    return [] as Theme[];
  });

  const themes = new Map(remote.map((theme) => [theme.package, theme]));

  for (const local of localThemes) {
    const theme = themes.get(local.package);

    themes.set(
      local.package,
      theme ? { ...theme, ...local, keywords: theme.keywords, author: theme.author } : local,
    );
  }

  return [...themes.values()];
}
