import { describe, expect, it } from "vitest";
import { createRenderer } from "../src/node/render";

const colorOf = (html: string, text: string) =>
  html.match(new RegExp(`--shiki-dark:(#[0-9A-Fa-f]+)">\\s*${text}<`))?.[1];

describe("syntax highlighting", () => {
  it("highlights GraphQL embedded in JavaScript, Python and Go examples", async () => {
    const renderer = await createRenderer({ light: "github-light", dark: "github-dark" });

    const examples = {
      javascript: "const query = /* GraphQL */ `\n  mutation redeploy($id: ID!) { id }\n`;",
      python: 'query = """\nmutation redeploy($id: ID!) { id }\n"""',
      go: "query := `\n\t\tmutation redeploy($id: ID!) { id }\n\t`",
    };

    for (const [language, code] of Object.entries(examples)) {
      const html = await renderer.highlight(code, language);

      // The GraphQL keyword gets a keyword color, not the string color of the surrounding literal.
      expect(colorOf(html, "mutation"), language).toBeDefined();
      expect(colorOf(html, "mutation"), language).not.toBe(colorOf(html, "redeploy"));
    }
  });
});
