import { cp, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const FIXTURE_EXPORT = new URL("../../core/test/fixtures/current.json", import.meta.url);

/** A minimal Vite app (with a public folder) and a Yaak export next to it. */
export async function hostApp() {
  const dir = await mkdtemp(join(tmpdir(), "yaakdoc-host-"));
  await cp(FIXTURE_EXPORT, join(dir, "yaak.json"));
  await writeFile(join(dir, "index.html"), "<!doctype html><title>Host app</title><h1>Host</h1>");
  await mkdir(join(dir, "public"));
  await writeFile(join(dir, "public", "robots.txt"), "User-agent: *");
  return dir;
}
