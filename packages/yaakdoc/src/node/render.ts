import { existsSync } from "node:fs";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
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

export type Renderer = {
  markdown: (source: string) => Promise<string>;
  highlight: (code: string, language: string) => Promise<string>;
};

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

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeShikiFromHighlighter, highlighter, {
      ...shikiOptions,
      fallbackLanguage: "text",
      lazy: true,
    })
    .use(rehypeStringify);

  return {
    markdown: async (source) => String(await processor.process(source)),
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
