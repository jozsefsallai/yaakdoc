import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveContext, ThemeError, themeFromDefinition } from "../src/static";

const FIXTURE_EXPORT = new URL("../../core/test/fixtures/current.json", import.meta.url);

describe("yaakdoc/static", () => {
  it("prepares an in-memory export with a theme from the resolveTheme hook", async () => {
    const exportData = JSON.parse(await readFile(FIXTURE_EXPORT, "utf8"));
    const requested: string[] = [];

    const context = await resolveContext({
      cwd: tmpdir(),
      exportData,
      overrides: { theme: "acme", themeOptions: { accent: "teal" } },
      resolveTheme: (spec, { themeOptions }) => {
        requested.push(spec);

        return themeFromDefinition(
          { name: "acme", entry: "./entry.tsx" },
          { manifest: join(tmpdir(), "acme", "theme.ts"), themeOptions },
        );
      },
    });

    expect(requested).toEqual(["acme"]);
    expect(context.exportPath).toBeNull();
    expect(context.watchFiles).toEqual([]);
    expect(context.theme.entry).toBe(join(tmpdir(), "acme", "entry.tsx"));
    expect(context.site.themeOptions).toEqual({ accent: "teal" });
    expect(context.document.workspace.name).toBe("Acme Store API");
  });

  it("validates theme options of a loaded definition", () => {
    const options = {
      parse: (value: unknown) => {
        if ((value as { depth?: unknown }).depth !== 1) {
          throw new Error("depth must be 1");
        }

        return value;
      },
    };

    expect(() =>
      themeFromDefinition(
        { name: "strict", entry: "./entry.tsx", options: options as never },
        { manifest: "/themes/strict/theme.ts", themeOptions: { depth: 2 } },
      ),
    ).toThrow(ThemeError);
  });
});
