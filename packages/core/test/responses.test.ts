import { describe, expect, it } from "vitest";
import { extractResponses, statusText } from "../src/index";

describe("extractResponses", () => {
  it("extracts response blocks with optional status codes", () => {
    const { description, responses } = extractResponses(
      [
        "Returns a product.",
        "",
        "```response",
        '{ "id": "prod_1" }',
        "```",
        "",
        "Errors:",
        "",
        "```response:404",
        '{ "error": "Not found" }',
        "```",
        "",
        "````response:500 text",
        "Oops ```",
        "````",
        "",
        "```json",
        "{}",
        "```",
      ].join("\n"),
    );

    expect(responses).toEqual([
      { status: null, language: "json", code: '{ "id": "prod_1" }' },
      { status: 404, language: "json", code: '{ "error": "Not found" }' },
      { status: 500, language: "text", code: "Oops ```" },
    ]);

    expect(description).toBe("Returns a product.\n\nErrors:\n\n```json\n{}\n```");
  });

  it("detects XML and HTML and leaves other blocks alone", () => {
    expect(extractResponses('```response:200\n<order id="1"/>\n```').responses[0]?.language).toBe(
      "xml",
    );

    expect(
      extractResponses("~~~response\n<!DOCTYPE html><p>hi</p>\n~~~").responses[0]?.language,
    ).toBe("html");

    expect(extractResponses("```responses\nx\n```").responses).toEqual([]);
  });

  it("knows common status texts", () => {
    expect(statusText(404)).toBe("Not Found");
    expect(statusText(299)).toBe("");
  });
});
