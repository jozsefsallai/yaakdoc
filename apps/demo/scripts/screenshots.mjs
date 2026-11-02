/**
 * Captures the website's theme screenshots from the built demo: light and dark, at a laptop-sized
 * viewport (1280x800) and 2x pixel density, saved as 2000x1250 WebP in the website's public folder.
 *
 *   pnpm --filter demo build
 *   pnpm --filter demo screenshots terminal          # or: kiseki terminal ...
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "../website/public/screenshots");

const PORT = 4710;
const PAGE = "reference/#products-get-a-product";
/** Themes better shown from another page (Editorial: the masthead and the overview's drop cap). */
const PAGES = { editorial: "reference/" };
const VIEWPORT = { width: 1280, height: 800 };
const SIZE = { width: 2000, height: 1250 };

/** Kiseki is the demo's root; the other themes are built under `/<theme>/`. */
const basePath = (theme) => (theme === "kiseki" ? "/" : `/${theme}/`);

const themes = process.argv.slice(2);
if (themes.length === 0) {
  console.error("Usage: screenshots <theme...>   e.g. screenshots terminal");
  process.exit(1);
}

const server = spawn("yaakdoc", ["preview", "--port", String(PORT)], {
  cwd: root,
  stdio: "ignore",
  shell: process.platform === "win32",
});

try {
  await waitForServer(`http://localhost:${PORT}/`);
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();

  for (const theme of themes) {
    for (const mode of ["light", "dark"]) {
      const context = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: 2,
        colorScheme: mode,
      });

      const page = await context.newPage();
      await page.goto(`http://localhost:${PORT}${basePath(theme)}${PAGES[theme] ?? PAGE}`);
      await page.evaluate(() => document.fonts.ready);
      // Let islands hydrate and the smooth scroll to the anchor finish.
      await page.waitForTimeout(1200);

      const file = join(outDir, `${theme}-${mode}.webp`);
      await sharp(await page.screenshot())
        .resize(SIZE)
        .webp({ quality: 85 })
        .toFile(file);
      console.log(`Saved ${file}`);

      await context.close();
    }
  }

  await browser.close();
} finally {
  server.kill();
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`The preview server didn't start at ${url}`);
}
