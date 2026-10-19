import { applyAuth, tryParseJson } from "@yaakdoc/core";
import { defineSnippet } from "../define";
import { graphqlQuery, graphqlVariables, withContentType } from "../utils";

const pyStr = (value: string) => JSON.stringify(value);

/** Serializes a JSON value as a Python literal. */
export function toPython(value: unknown, level = 0): string {
  const pad = "    ".repeat(level);
  const inner = "    ".repeat(level + 1);

  if (value === null || value === undefined) {
    return "None";
  }

  if (value === true) {
    return "True";
  }

  if (value === false) {
    return "False";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return pyStr(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    return `[\n${value.map((item) => `${inner}${toPython(item, level + 1)},`).join("\n")}\n${pad}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>);

  if (entries.length === 0) {
    return "{}";
  }

  return `{\n${entries.map(([k, v]) => `${inner}${pyStr(k)}: ${toPython(v, level + 1)},`).join("\n")}\n${pad}}`;
}

export const python = defineSnippet({
  id: "python",
  label: "Python",
  language: "python",
  supports: ["http"],
  generate(request) {
    if (request.kind !== "http") {
      return "";
    }

    const basic = request.auth?.type === "basic" ? request.auth : null;
    const req = basic ? { ...request, auth: null } : applyAuth(request);

    const lines = ["import requests", "", `url = ${pyStr(req.url)}`];
    const args = ["url"];

    const { body } = req;

    const headers = withContentType(req.headers, body).filter(
      // `json=` sets the JSON content type automatically
      (h) =>
        !(
          (body.type === "json" || body.type === "graphql") &&
          h.name.toLowerCase() === "content-type" &&
          h.value === "application/json"
        ),
    );

    if (headers.length > 0) {
      lines.push(
        `headers = ${toPython(Object.fromEntries(headers.map((h) => [h.name, h.value])))}`,
      );

      args.push("headers=headers");
    }

    switch (body.type) {
      case "json": {
        const parsed = tryParseJson(body.text);

        if (parsed.ok) {
          lines.push(`payload = ${toPython(parsed.value)}`);
          args.push("json=payload");
        } else if (body.text) {
          lines.push(`payload = ${pyStr(body.text)}`);
          args.push("data=payload");
        }

        break;
      }

      case "graphql": {
        const variables = graphqlVariables(body);
        const query = graphqlQuery(body).replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"');

        lines.push(
          "",
          `query = """\n${query}\n"""`,
          "",
          [
            "payload = {",
            '    "query": query,',
            ...(variables !== undefined ? [`    "variables": ${toPython(variables, 1)},`] : []),
            ...(body.operationName ? [`    "operationName": ${pyStr(body.operationName)},`] : []),
            "}",
          ].join("\n"),
        );

        args.push("json=payload");
        break;
      }

      case "text":
        if (body.text) {
          lines.push(`payload = ${pyStr(body.text)}`);
          args.push("data=payload");
        }

        break;

      case "form-urlencoded":
        lines.push(
          `payload = ${toPython(Object.fromEntries(body.fields.map((f) => [f.name, f.value])))}`,
        );

        args.push("data=payload");
        break;

      case "multipart": {
        const files = body.fields.filter((f) => f.file);
        const data = body.fields.filter((f) => !f.file);

        if (data.length > 0) {
          lines.push(
            `payload = ${toPython(Object.fromEntries(data.map((f) => [f.name, f.value])))}`,
          );

          args.push("data=payload");
        }

        if (files.length > 0) {
          lines.push(
            `files = {\n${files.map((f) => `    ${pyStr(f.name)}: open(${pyStr(f.file!)}, "rb"),`).join("\n")}\n}`,
          );

          args.push("files=files");
        }

        break;
      }

      case "binary":
        lines.push(`payload = open(${pyStr(body.filePath ?? "file")}, "rb")`);
        args.push("data=payload");
        break;
    }

    if (basic) {
      args.push(`auth=(${pyStr(basic.username)}, ${pyStr(basic.password)})`);
    }

    const method = req.method.toLowerCase();
    const call = ["get", "post", "put", "patch", "delete", "head", "options"].includes(method)
      ? `requests.${method}(${args.join(", ")})`
      : `requests.request(${pyStr(req.method)}, ${args.join(", ")})`;

    lines.push("", `response = ${call}`, "print(response.json())");
    return lines.join("\n");
  },
});
