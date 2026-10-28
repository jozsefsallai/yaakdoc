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

/** A project with a Yaak export, a pages directory (with a subdirectory and an image) and a config. */
export async function pagesProject(config: Record<string, unknown> = {}) {
  const dir = await mkdtemp(join(tmpdir(), "yaakdoc-pages-"));
  await cp(FIXTURE_EXPORT, join(dir, "yaak.json"));

  const docs = join(dir, "docs");
  await mkdir(join(docs, "guides"), { recursive: true });

  await writeFile(
    join(docs, "index.md"),
    "---\ntitle: Introduction\ndescription: Start here.\n---\n\nBase URL: `${[ base_url ]}`\n\nToken: ${[ api_token ]}\n\nSee [auth](./guides/auth.md#tokens).\n",
  );

  await writeFile(
    join(docs, "guides", "auth.md"),
    "# Authentication\n\n## Tokens\n\n![Flow](./flow.svg)\n",
  );

  await writeFile(join(docs, "guides", "flow.svg"), '<svg xmlns="http://www.w3.org/2000/svg"/>');

  await writeFile(
    join(dir, "yaakdoc.config.json"),
    JSON.stringify({ pagesDir: "./docs", environments: "public", ...config }),
  );

  return dir;
}
