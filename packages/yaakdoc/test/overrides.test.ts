import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readOverrides } from "../src/cli/overrides";

describe("readOverrides", () => {
  it("parses inline JSON", () => {
    expect(readOverrides(' {"branding":{"title":"Docs"}}')).toEqual({
      branding: { title: "Docs" },
    });
  });

  it("reads a JSON file relative to cwd", async () => {
    const dir = await mkdtemp(join(tmpdir(), "yaakdoc-overrides-"));

    await writeFile(join(dir, "overrides.json"), '{"pages":"per-request"}');

    expect(readOverrides("overrides.json", dir)).toEqual({ pages: "per-request" });
  });

  it("rejects invalid JSON, missing files and non-objects", async () => {
    const dir = await mkdtemp(join(tmpdir(), "yaakdoc-overrides-"));

    await writeFile(join(dir, "list.json"), "[1]");

    expect(() => readOverrides("{nope")).toThrow(/Invalid JSON in --overrides/);
    expect(() => readOverrides("missing.json", dir)).toThrow(/Could not read overrides/);
    expect(() => readOverrides("list.json", dir)).toThrow(/must be a JSON object/);
  });
});
