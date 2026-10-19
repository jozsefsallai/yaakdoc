import { describe, expect, it } from "vitest";
import { graphqlPayload, graphqlQuery, minifyGraphql } from "../src/utils";

const body = {
  type: "graphql" as const,
  contentType: "application/json",
  query:
    "\n    mutation redeploy($id: String!) {\n      deploymentRedeploy(id: $id) {\n        id\n      }\n    }\n  ",
  variables: '{ "id": null }',
  operationName: "redeploy",
};

describe("GraphQL helpers", () => {
  it("dedents the query", () => {
    expect(graphqlQuery(body)).toBe(
      "mutation redeploy($id: String!) {\n  deploymentRedeploy(id: $id) {\n    id\n  }\n}",
    );
  });

  it("minifies to one readable line, dropping comments but not strings", () => {
    expect(
      minifyGraphql(
        'query x(\n  $id: ID! # the id\n) {\n  a(id: $id, note: "x  # y") {\n    # hidden\n    id\n  }\n}',
      ),
    ).toBe('query x($id: ID!) { a(id: $id, note: "x  # y") { id } }');
  });

  it("includes variables and the operation name in the payload", () => {
    expect(graphqlPayload(body, "q")).toEqual({
      query: "q",
      variables: { id: null },
      operationName: "redeploy",
    });
  });
});
