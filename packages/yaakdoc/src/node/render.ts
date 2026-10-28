import { existsSync } from "node:fs";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import { createUniqueSlugger, type PageVariant, slugify } from "@yaakdoc/core";
import type { Snippet } from "@yaakdoc/snippets";
import { builtinSnippets } from "@yaakdoc/snippets";
import { createJiti } from "jiti";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import {
  bundledLanguages,
  createHighlighter,
  type Highlighter,
  type LanguageRegistration,
} from "shiki";
import { unified } from "unified";

const PRELOADED_LANGUAGES = [
  "bash",
  "javascript",
  "typescript",
  "python",
  "go",
  "json",
  "graphql",
  "xml",
  "html",
  "yaml",
  "http",
];

/** Highlights a delimited region as GraphQL (opening captures: prefix tokens, then the delimiter). */
const embeddedGraphql = (begin: string, end: string, prefixScopes: string[]) => ({
  begin,
  beginCaptures: Object.fromEntries(prefixScopes.map((name, index) => [index + 1, { name }])),
  end,
  endCaptures: { 0: { name: prefixScopes.at(-1)! } },
  contentName: "meta.embedded.block.graphql",
  patterns: [{ include: "source.graphql" }],
});

/**
 * Injection grammar highlighting GraphQL inside code examples (like VS Code's GraphQL extension):
 * `/* GraphQL *\/ \`...\`` and `gql\`...\`` in JavaScript, `query = """..."""` in Python and
 * `query := \`...\`` in Go.
 */
const GRAPHQL_INJECTION = {
  name: "yaakdoc-graphql-injection",
  scopeName: "inline.graphql.yaakdoc",
  injectTo: ["source.js", "source.ts", "source.python", "source.go"],
  injectionSelector: "L:source -comment -string",
  embeddedLangs: ["graphql"],
  patterns: [
    embeddedGraphql("(/\\*\\s*GraphQL\\s*\\*/)\\s*(`)", "`", [
      "comment.block.js",
      "punctuation.definition.string.template.begin.js",
    ]),
    embeddedGraphql("\\b(gql|graphql)(`)", "`", [
      "entity.name.function.tagged-template.js",
      "punctuation.definition.string.template.begin.js",
    ]),
    embeddedGraphql('\\b(query)\\s*(=)\\s*(""")', '"""', [
      "variable.other.python",
      "keyword.operator.assignment.python",
      "punctuation.definition.string.begin.python",
    ]),
    embeddedGraphql("\\b(query)\\s*(:=)\\s*(`)", "`", [
      "variable.other.go",
      "keyword.operator.assignment.go",
      "punctuation.definition.string.begin.go",
    ]),
  ],
} as unknown as LanguageRegistration;

const variantElement = (variant: PageVariant, index: number, children: HastNode[]): HastNode => ({
  type: "element",
  tagName: "div",
  properties: { dataYdEnv: variant.environmentId ?? "", hidden: index > 0 },
  children,
});

/**
 * Merges the rendered trees of a page's environment variants: top-level blocks that are the same
 * everywhere appear once, the others once per environment (so headings and their ids stay unique
 * unless they contain variables).
 */
function mergeVariants(
  trees: HastNode[],
  variants: readonly PageVariant[],
  stringify: (children: HastNode[]) => string,
): HastNode[] {
  const [first, ...rest] = trees.map((tree) => tree.children ?? []);

  if (!first) {
    return [];
  }

  if (rest.length === 0) {
    return first;
  }

  if (rest.some((children) => children.length !== first.length)) {
    return trees.map((tree, index) => variantElement(variants[index]!, index, tree.children ?? []));
  }

  return first.flatMap((node, index) => {
    const html = stringify([node]);

    if (rest.every((children) => stringify([children[index]!]) === html)) {
      return [node];
    }

    return trees.map((tree, variant) =>
      variantElement(variants[variant]!, variant, [tree.children![index]!]),
    );
  });
}

/** Resolves URLs in a custom page; returning `null` keeps the original. */
export type PageUrlResolvers = {
  /** `href` of links, e.g. `./quickstart.md#install` → `/quickstart/#install`. */
  link?: (href: string) => string | null;
  /** `src` of images, e.g. `./diagram.png` → `/_yaakdoc/diagram-1234abcd.png`. */
  asset?: (src: string) => string | null;
};

export type Renderer = {
  markdown: (source: string) => Promise<string>;
  page: (variants: readonly PageVariant[], resolvers?: PageUrlResolvers) => Promise<string>;
  highlight: (code: string, language: string) => Promise<string>;
};

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const textContent = (node: HastNode): string =>
  node.type === "text" ? (node.value ?? "") : (node.children ?? []).map(textContent).join("");

const isRelative = (url: string) => !/^([a-z][a-z\d+.-]*:|\/\/|#|\/)/i.test(url);

/**
 * Rehype plugin for custom pages (runs after sanitizing): gives headings unique ids and resolves
 * relative links and images with the resolvers passed in `file.data.resolvers`.
 */
function rehypePageUrls() {
  return (tree: HastNode, file: { data: object }) => {
    const { link, asset } = (file.data as { resolvers?: PageUrlResolvers }).resolvers ?? {};
    const unique = createUniqueSlugger();

    const visit = (node: HastNode) => {
      const props = node.properties;

      if (props && node.tagName && /^h[1-6]$/.test(node.tagName) && !props.id) {
        props.id = unique(slugify(textContent(node)));
      }

      if (props && node.tagName === "a" && typeof props.href === "string" && link) {
        if (isRelative(props.href)) {
          props.href = link(props.href) ?? props.href;
        }
      }

      if (props && node.tagName === "img" && typeof props.src === "string" && asset) {
        if (isRelative(props.src)) {
          props.src = asset(props.src) ?? props.src;
        }
      }

      node.children?.forEach(visit);
    };

    visit(tree);
  };
}

const highlighters = new Map<string, Promise<Highlighter>>();

function getHighlighter(themes: { light: string; dark: string }) {
  const key = `${themes.light}|${themes.dark}`;

  let highlighter = highlighters.get(key);
  if (!highlighter) {
    highlighter = createHighlighter({
      themes: [themes.light, themes.dark],
      langs: [...PRELOADED_LANGUAGES, GRAPHQL_INJECTION],
    });

    highlighters.set(key, highlighter);
  }

  return highlighter;
}

const LANGUAGE_ALIASES: Record<string, string> = {
  shell: "bash",
  sh: "bash",
  js: "javascript",
  ts: "typescript",
  text: "text",
  plain: "text",
};

async function ensureLanguage(highlighter: Highlighter, language: string): Promise<string> {
  const lang = LANGUAGE_ALIASES[language] ?? language;

  if (lang === "text" || highlighter.getLoadedLanguages().includes(lang)) {
    return lang;
  }

  if (lang in bundledLanguages) {
    await highlighter.loadLanguage(lang as keyof typeof bundledLanguages);
    return lang;
  }

  return "text";
}

const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-./] as [string, RegExp],
    ],
  },
};

/**
 * Creates the Markdown/code renderer: GFM, sanitized HTML (descriptions come from exports that may
 * be shared by others), and Shiki highlighting with dual light/dark themes via CSS variables.
 */
export async function createRenderer(themes: { light: string; dark: string }): Promise<Renderer> {
  const highlighter = await getHighlighter(themes);
  const shikiOptions = { themes, defaultColor: false as const };

  const shiki = {
    ...shikiOptions,
    fallbackLanguage: "text",
    lazy: true,
  } as const;

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeShikiFromHighlighter, highlighter, shiki)
    .use(rehypeStringify);

  const pageProcessor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypePageUrls)
    .use(rehypeShikiFromHighlighter, highlighter, shiki)
    .use(rehypeStringify);

  return {
    markdown: async (source) => String(await processor.process(source)),
    page: async (variants, resolvers = {}) => {
      const trees = await Promise.all(
        variants.map(async ({ markdown }) => {
          const file = { value: markdown, data: { resolvers } };
          return (await pageProcessor.run(pageProcessor.parse(file), file)) as HastNode;
        }),
      );

      const stringify = (children: HastNode[]) =>
        pageProcessor.stringify({ type: "root", children } as never);

      return stringify(mergeVariants(trees, variants, stringify));
    },
    highlight: async (code, language) =>
      highlighter.codeToHtml(code, {
        ...shikiOptions,
        lang: await ensureLanguage(highlighter, language),
      }),
  };
}

/** Loads snippet generators by built-in id or module path/package (default export or `snippet`). */
export async function loadSnippets(ids: readonly string[], root: string): Promise<Snippet[]> {
  const jiti = createJiti(`${root}/`, { interopDefault: true });
  const snippets: Snippet[] = [];

  for (const id of ids) {
    const builtin = builtinSnippets[id];
    if (builtin) {
      snippets.push(builtin);
      continue;
    }

    if (!existsSync(id) && !id.includes("/") && !id.startsWith("@")) {
      throw new Error(
        `Unknown snippet "${id}". Built-in snippets: ${Object.keys(builtinSnippets).join(", ")}.`,
      );
    }

    const mod = (await jiti.import(id)) as Snippet | Snippet[] | { default?: Snippet | Snippet[] };

    const loaded =
      "default" in (mod as object) ? (mod as { default: Snippet | Snippet[] }).default : mod;

    for (const snippet of Array.isArray(loaded) ? loaded : [loaded]) {
      if (!snippet || typeof (snippet as Snippet).generate !== "function") {
        throw new Error(
          `Snippet module "${id}" must export a snippet created with defineSnippet().`,
        );
      }

      snippets.push(snippet as Snippet);
    }
  }

  return snippets;
}
