const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!,
  );

export type ErrorPageOptions = {
  title: string;
  /** Extra HTML before `</body>`, e.g. the script that reloads the page once the error is fixed. */
  script: string;
};

/** The page the dev server shows instead of the docs while something is broken. */
export function errorPage(error: Error, { title, script }: ErrorPageOptions): string {
  return `<!doctype html><meta charset="utf-8"><title>yaakdoc error</title><style>body{font:14px/1.5 ui-monospace,monospace;padding:2rem;background:#1e1e2e;color:#f5e0dc}pre{white-space:pre-wrap;color:#f38ba8}p{color:#a6adc8}</style><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(error.stack ?? error.message)}</pre><p>Fix it and save; this page reloads by itself.</p>${script}`;
}

/** Reloads the page through Vite's client (its `full-reload` after the next successful rebuild). */
export const viteClientScript = (base: string) =>
  `<script type="module" src="${base}@vite/client"></script>`;

/** Reloads the page as soon as the server stops answering with an error. */
export const pollScript = `<script>setInterval(()=>fetch(location.href,{method:"HEAD",cache:"no-store"}).then(r=>{if(r.status!==500)location.reload()},()=>{}),1000)</script>`;
