import { readFileSync } from "node:fs";
import {
  createVariableMap,
  flattenTree,
  normalize,
  resolveRequest,
  selectEnvironment,
} from "@yaakdoc/core";
import { describe, expect, it } from "vitest";
import { builtinSnippets, generateExamples } from "../src/index";

const raw = JSON.parse(
  readFileSync(new URL("../../core/test/fixtures/current.json", import.meta.url), "utf8"),
);

const ws = normalize(raw).workspaces[0]!;
const env = selectEnvironment(ws);

describe("snippets", () => {
  for (const id of flattenTree(ws.tree)) {
    const request = ws.requests[id]!;

    it(`${request.kind} ${request.name}`, () => {
      const resolved = resolveRequest(request, {
        variables: createVariableMap(
          ws,
          env,
          request.breadcrumbs.map((b) => b.id),
        ),
        hide: ["token", "password", "api_key"],
      });

      const examples = generateExamples(resolved, Object.values(builtinSnippets));
      expect(examples.length).toBeGreaterThan(0);

      const output = examples.map((e) => `--- ${e.id} (${e.language})\n${e.code}`).join("\n\n");
      expect(output).not.toMatch(/eyJ0eXAi/); // secret value from the fixture
      expect(output).toMatchSnapshot();
    });
  }
});
