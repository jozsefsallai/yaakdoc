import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { createPageDoc, type PageDoc } from "@yaakdoc/core";
import { glob } from "tinyglobby";
import { parse as parseYaml } from "yaml";

const FRONT_MATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n?^---[ \t]*(?:\r?\n|$)/m;

/** Splits YAML front matter (`---` fenced, at the very start of the file) from the body. */
export function parseFrontMatter(
  source: string,
  file = "page",
): { data: Record<string, unknown>; body: string } {
  // A byte order mark (some Windows editors add one) would hide the front matter fence.
  const text = source.replace(/^\uFEFF/, "");

  const match = text.startsWith("---") ? text.match(FRONT_MATTER_RE) : null;

  if (match?.index !== 0) {
    return { data: {}, body: text };
  }

  let data: unknown;

  try {
    data = parseYaml(match[1] ?? "");
  } catch (error) {
    throw new Error(`Invalid front matter in ${file}: ${(error as Error).message}`);
  }

  return {
    data:
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {},
    body: text.slice(match[0].length),
  };
}

/** Loads every Markdown page (`**\/*.md`) in `dir`, sorted by path. */
export async function loadPages(dir: string): Promise<PageDoc[]> {
  const files = await glob(["**/*.md"], {
    cwd: dir,
    absolute: true,
    ignore: ["**/node_modules/**"],
  });

  return Promise.all(
    files.sort().map(async (file) => {
      const path = relative(dir, file).replace(/\\/g, "/");
      const { data, body } = parseFrontMatter(await readFile(file, "utf8"), path);

      return createPageDoc({ path, data, body, file });
    }),
  );
}
