import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectExport } from "../src/node";

const exportJson = JSON.stringify({ yaakSchema: 4, resources: {} });

describe("detectExport", () => {
  it("prefers yaakdoc.json, then yaak.json", async () => {
    const dir = await mkdtemp(join(tmpdir(), "yaakdoc-"));

    await writeFile(join(dir, "yaak.json"), exportJson);
    await writeFile(join(dir, "yaakdoc.json"), exportJson);

    expect(await detectExport(dir)).toBe(join(dir, "yaakdoc.json"));
  });

  it("uses yaak.json when there is no yaakdoc.json", async () => {
    const dir = await mkdtemp(join(tmpdir(), "yaakdoc-"));

    await writeFile(join(dir, "yaak.json"), exportJson);

    expect(await detectExport(dir)).toBe(join(dir, "yaak.json"));
  });

  it("does not pick up other JSON files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "yaakdoc-"));

    await writeFile(join(dir, "my-api.json"), exportJson);
    await writeFile(join(dir, "yaak.2025-06-01.json"), exportJson);

    await expect(detectExport(dir)).rejects.toThrow(/looked for yaakdoc\.json and yaak\.json/);
  });

  it("throws a helpful error", async () => {
    const dir = await mkdtemp(join(tmpdir(), "yaakdoc-"));
    await expect(detectExport(dir)).rejects.toThrow(/No Yaak export found/);
  });
});
