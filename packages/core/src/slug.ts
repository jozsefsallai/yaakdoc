/** Converts a string to a URL/anchor-friendly slug. */
export function slugify(input: string): string {
  return (
    input
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/['"`]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

/** Returns a function that produces unique values by appending `-2`, `-3`, ... on collisions. */
export function createUniqueSlugger(reserved: Iterable<string> = []) {
  const used = new Set(reserved);

  return (candidate: string): string => {
    let slug = candidate;
    let counter = 2;

    while (used.has(slug)) {
      slug = `${candidate}-${counter++}`;
    }

    used.add(slug);

    return slug;
  };
}

/** Normalizes a base path to the `/path/` form (`"docs"`, `"/docs"` → `"/docs/"`, `""` → `"/"`). */
export function normalizeBase(path: string): string {
  return `/${path.replace(/^\/+|\/+$/g, "")}/`.replace(/^\/\/$/, "/");
}

/**
 * Converts a site path (which includes the base, e.g. `/docs/products/`) into an absolute URL
 * using the public site URL (which corresponds to the base, e.g. `https://acme.dev/docs`).
 */
export function absoluteUrl(siteUrl: string, base: string, path: string): string {
  const relative = path.startsWith(base) ? path.slice(base.length) : path.replace(/^\//, "");
  return new URL(relative, siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`).href;
}
