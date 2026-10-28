import { describe, expect, it } from "vitest";
import { getConfigJsonSchema, parseConfig } from "../src/index";

describe("navigation config", () => {
  it("accepts navigation shapes", () => {
    const config = parseConfig({
      pagesDir: "./docs",
      apiPath: "/reference/",
      navigation: {
        tabs: [
          {
            tab: "Guides",
            groups: [
              {
                group: "Basics",
                pages: [
                  "index",
                  {
                    group: "Nested",
                    pages: ["a"],
                  },
                ],
              },
            ],
          },
          {
            tab: "API",
            api: true,
          },
        ],
      },
    });

    expect(config.apiPath).toBe("reference");
    expect(config.search).toBe(true);
    expect(config.navigation?.tabs?.[0]?.groups?.[0]?.pages?.[1]).toEqual({
      group: "Nested",
      pages: ["a"],
    });

    expect(parseConfig({ navigation: { pages: ["index", { api: true }] } }).navigation).toEqual({
      pages: ["index", { api: true }],
    });
    expect(parseConfig({}).apiPath).toBeUndefined();
  });

  it("rejects tabs mixed with top-level groups", () => {
    expect(() =>
      parseConfig({ navigation: { tabs: [{ tab: "A", api: true }], groups: [] } }),
    ).toThrow(/either `tabs`/);
  });

  it("is representable as JSON schema", () => {
    expect(JSON.stringify(getConfigJsonSchema())).toContain("NavigationGroup");
  });
});
