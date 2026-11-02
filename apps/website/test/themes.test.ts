import { describe, expect, it } from "vitest";
import {
  criteriaParams,
  defaultCriteria,
  filterThemes,
  paginate,
  parseCriteria,
  type ThemeCriteria,
} from "../lib/theme-filter";
import { defaultThemePackage, type Theme, themeShortName } from "../lib/themes";

function theme(name: string, extra: Partial<Theme> = {}): Theme {
  return {
    package: name,
    shortName: themeShortName(name),
    displayName: name,
    description: "",
    keywords: ["yaakdoc-theme"],
    npm: `https://www.npmjs.com/package/${name}`,
    official: name.startsWith("@yaakdoc/"),
    ...extra,
  };
}

const kiseki = theme(defaultThemePackage, { displayName: "Kiseki", downloads: 10 });

const official = theme("@yaakdoc/theme-aurora", {
  displayName: "Aurora",
  downloads: 500,
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const winxp = theme("yaakdoc-theme-winxp", {
  displayName: "Windows XP",
  description: "A Luna inspired theme.",
  keywords: ["yaakdoc-theme", "retro"],
  downloads: 9000,
  updatedAt: "2026-10-01T00:00:00.000Z",
});

const zen = theme("@acme/zen", { displayName: "Zen", downloads: 20, author: "Acme" });

const themes = [zen, winxp, official, kiseki];

function names(criteria: Partial<ThemeCriteria>) {
  return filterThemes(themes, { ...defaultCriteria, ...criteria }, defaultThemePackage).map(
    (item) => item.displayName,
  );
}

describe("filterThemes", () => {
  it("pins Kiseki first when no criteria are set", () => {
    expect(names({})).toEqual(["Kiseki", "Aurora", "Windows XP", "Zen"]);
  });

  it("doesn't pin Kiseki once criteria are set", () => {
    expect(names({ sort: "updated" })).toEqual(["Aurora", "Kiseki", "Windows XP", "Zen"]);
    expect(names({ type: "official" })).toEqual(["Aurora", "Kiseki"]);
  });

  it("puts official themes first with every sort", () => {
    expect(names({ sort: "popular", type: "all", query: "a" }).slice(0, 2)).toEqual([
      "Aurora",
      "Kiseki",
    ]);

    expect(names({ sort: "name", query: "e" })).toEqual(["Aurora", "Kiseki", "Windows XP", "Zen"]);
  });

  it("filters by type", () => {
    expect(names({ type: "community" })).toEqual(["Windows XP", "Zen"]);
  });

  it("searches names, descriptions, keywords and authors", () => {
    expect(names({ query: "winxp" })).toEqual(["Windows XP"]);
    expect(names({ query: "LUNA" })).toEqual(["Windows XP"]);
    expect(names({ query: "retro" })).toEqual(["Windows XP"]);
    expect(names({ query: "acme" })).toEqual(["Zen"]);
    expect(names({ query: "luna retro" })).toEqual(["Windows XP"]);
    expect(names({ query: "nothing" })).toEqual([]);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 25 }, (_, index) => index);

  it("splits items into pages", () => {
    expect(paginate(items, 1)).toMatchObject({ page: 1, pages: 3, items: items.slice(0, 12) });
    expect(paginate(items, 3)).toMatchObject({ page: 3, items: [24] });
  });

  it("clamps the page", () => {
    expect(paginate(items, 99).page).toBe(3);
    expect(paginate(items, 0).page).toBe(1);
    expect(paginate([], 2)).toEqual({ items: [], page: 1, pages: 1 });
  });
});

describe("criteria params", () => {
  it("round-trips and leaves out defaults", () => {
    const state = { query: "xp", type: "community", sort: "name", page: 2 } as const;
    const params = criteriaParams(state);

    expect(params.toString()).toBe("q=xp&type=community&sort=name&page=2");
    expect(parseCriteria(params)).toEqual(state);
    expect(criteriaParams({ ...defaultCriteria, page: 1 }).toString()).toBe("");
  });

  it("ignores invalid values", () => {
    expect(parseCriteria(new URLSearchParams("type=nope&sort=nope&page=-1"))).toEqual({
      ...defaultCriteria,
      page: 1,
    });
  });
});

describe("themeShortName", () => {
  it("strips the theme prefixes", () => {
    expect(themeShortName("@yaakdoc/theme-kiseki")).toBe("kiseki");
    expect(themeShortName("yaakdoc-theme-winxp")).toBe("winxp");
    expect(themeShortName("@acme/docs-theme")).toBe("@acme/docs-theme");
  });
});
