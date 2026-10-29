import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseConfig } from "@yaakdoc/config";
import { describe, expect, it } from "vitest";

const contentDir = join(import.meta.dirname, "../content/docs");

function configExamples() {
  const examples: { name: string; source: string }[] = [];

  const files = readdirSync(contentDir, { recursive: true, encoding: "utf8" }).filter((file) =>
    file.endsWith(".mdx"),
  );

  for (const file of files) {
    const text = readFileSync(join(contentDir, file), "utf8");
    const blocks = text.matchAll(/^```jsonc? title="yaakdoc\.config\.json"\n([\s\S]*?)^```$/gm);

    for (const [index, block] of [...blocks].entries()) {
      examples.push({
        name: `${relative(contentDir, join(contentDir, file))} #${index + 1}`,
        source: block[1]!,
      });
    }
  }

  return examples;
}

describe("config examples in the docs", () => {
  const examples = configExamples();

  it("finds the examples", () => {
    expect(examples.length).toBeGreaterThan(10);
  });

  it.each(examples)("$name is a valid config", ({ source }) => {
    expect(() => parseConfig(JSON.parse(source))).not.toThrow();
  });
});
