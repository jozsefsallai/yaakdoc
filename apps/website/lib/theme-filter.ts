import type { Theme } from "./themes";

export const themeTypes = ["all", "official", "community"] as const;
export const themeSorts = ["popular", "updated", "name"] as const;

export type ThemeType = (typeof themeTypes)[number];
export type ThemeSort = (typeof themeSorts)[number];

export interface ThemeCriteria {
  query: string;
  type: ThemeType;
  sort: ThemeSort;
}

export const defaultCriteria: ThemeCriteria = { query: "", type: "all", sort: "popular" };

export const themesPerPage = 12;

function oneOf<T extends string>(
  values: readonly T[],
  value: string | null | undefined,
  fallback: T,
) {
  return values.includes(value as T) ? (value as T) : fallback;
}

/** Reads the criteria from URL search params, ignoring unknown values. */
export function parseCriteria(params: { get(name: string): string | null }): ThemeCriteria & {
  page: number;
} {
  const page = Number.parseInt(params.get("page") ?? "", 10);

  return {
    query: params.get("q")?.trim() ?? "",
    type: oneOf(themeTypes, params.get("type"), defaultCriteria.type),
    sort: oneOf(themeSorts, params.get("sort"), defaultCriteria.sort),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** The criteria as URL search params, leaving out defaults. */
export function criteriaParams(criteria: ThemeCriteria & { page: number }): URLSearchParams {
  const params = new URLSearchParams();

  if (criteria.query) {
    params.set("q", criteria.query);
  }

  if (criteria.type !== defaultCriteria.type) {
    params.set("type", criteria.type);
  }

  if (criteria.sort !== defaultCriteria.sort) {
    params.set("sort", criteria.sort);
  }

  if (criteria.page > 1) {
    params.set("page", String(criteria.page));
  }

  return params;
}

export function isDefaultCriteria(criteria: ThemeCriteria): boolean {
  return (
    !criteria.query &&
    criteria.type === defaultCriteria.type &&
    criteria.sort === defaultCriteria.sort
  );
}

function matches(theme: Theme, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const haystack = [
    theme.package,
    theme.shortName,
    theme.displayName,
    theme.description,
    theme.author ?? "",
    ...theme.keywords,
  ]
    .join(" ")
    .toLowerCase();

  return terms.every((term) => haystack.includes(term));
}

const comparators: Record<ThemeSort, (a: Theme, b: Theme) => number> = {
  popular: (a, b) => (b.downloads ?? 0) - (a.downloads ?? 0),
  updated: (a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
  name: () => 0,
};

/**
 * Filters and sorts themes. Official themes always come first, and the pinned theme (Kiseki)
 * leads when no criteria are set.
 */
export function filterThemes(themes: Theme[], criteria: ThemeCriteria, pinned?: string): Theme[] {
  const pin = isDefaultCriteria(criteria) ? pinned : undefined;

  return themes
    .filter((theme) => {
      if (criteria.type === "official" && !theme.official) {
        return false;
      }

      if (criteria.type === "community" && theme.official) {
        return false;
      }

      return matches(theme, criteria.query);
    })
    .sort(
      (a, b) =>
        Number(b.package === pin) - Number(a.package === pin) ||
        Number(b.official) - Number(a.official) ||
        comparators[criteria.sort](a, b) ||
        a.displayName.localeCompare(b.displayName),
    );
}

export function paginate<T>(items: T[], page: number, perPage = themesPerPage) {
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, page), pages);

  return {
    items: items.slice((current - 1) * perPage, current * perPage),
    page: current,
    pages,
  };
}
