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
      { status: null, language: "json", code: '{ "id": "prod_1" }', headers: [] },
      { status: 404, language: "json", code: '{ "error": "Not found" }', headers: [] },
      { status: 500, language: "text", code: "Oops ```", headers: [] },
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

  it("splits response headers off the body", () => {
    const [withBody, onlyHeaders] = extractResponses(
      [
        "```response:429",
        "Retry-After: 30",
        "X-RateLimit-Remaining:   0  ",
        "",
        "",
        '{ "error": "Too many requests" }',
        "```",
        "",
        "```response:204",
        "X-Request-Id: abc",
        "",
        "```",
      ].join("\n"),
    ).responses;

    expect(withBody).toEqual({
      status: 429,
      language: "json",
      code: '{ "error": "Too many requests" }',
      headers: [
        { name: "Retry-After", value: "30" },
        { name: "X-RateLimit-Remaining", value: "0" },
      ],
    });

    expect(onlyHeaders).toMatchObject({
      code: "",
      headers: [{ name: "X-Request-Id", value: "abc" }],
    });
  });

  it("keeps header-like text when no blank line follows it or a line isn't a header", () => {
    const [noBlank, prose, leadingBlank] = extractResponses(
      [
        "```response",
        "Content-Type: text/plain",
        "```",
        "```response",
        "Note: this is prose",
        "and so is this",
        "",
        "body",
        "```",
        "```response",
        "",
        "Retry-After: 30",
        "```",
      ].join("\n"),
    ).responses;

    expect(noBlank).toMatchObject({ headers: [], code: "Content-Type: text/plain" });
    expect(prose).toMatchObject({
      headers: [],
      code: "Note: this is prose\nand so is this\n\nbody",
    });
    expect(leadingBlank).toMatchObject({ headers: [] });
  });

  it("flags invalid status codes instead of ignoring the block", () => {
    const responses = extractResponses(
      ["2001", "20", "abc", "600", "099", "200xml"]
        .map((status) => `\`\`\`response:${status}\n{}\n\`\`\``)
        .join("\n\n"),
    ).responses;

    expect(responses.map((response) => [response.status, response.invalidStatus])).toEqual([
      [null, "2001"],
      [null, "20"],
      [null, "abc"],
      [null, "600"],
      [null, "099"],
      [null, "200xml"],
    ]);

    expect(extractResponses("```response:599\n```").responses[0]).not.toHaveProperty(
      "invalidStatus",
    );
  });

  it("flags JSON bodies that don't parse, unless marked jsonc", () => {
    const flags = extractResponses(
      [
        '```response:200\n{ "a": 1, }\n```',
        "```response:200 json\n{ oops\n```",
        "```response:200 jsonc\n{ // comment\n}\n```",
        '```response:200\n{ "a": 1 }\n```',
        "```response:200 json\n```",
      ].join("\n\n"),
    ).responses.map((response) => response.invalidJson ?? false);

    expect(flags).toEqual([true, true, false, false, false]);
  });

  it("knows common status texts", () => {
    expect(statusText(404)).toBe("Not Found");
    expect(statusText(299)).toBe("");
  });
});
