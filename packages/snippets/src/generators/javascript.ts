import { applyAuth, type ResolvedHttpRequest, tryParseJson } from "@yaakdoc/core";
import { defineSnippet } from "../define";
import { graphqlPayload, indent, withContentType } from "../utils";

const str = (value: string) => JSON.stringify(value);

const objectLiteral = (entries: Array<[string, string]>, pad: string) =>
  entries.length === 0
    ? "{}"
    : `{\n${entries.map(([k, v]) => `${pad}  ${str(k)}: ${str(v)},`).join("\n")}\n${pad}}`;

export const javascript = defineSnippet({
  id: "javascript",
  label: "JavaScript",
  language: "javascript",
  supports: ["http", "websocket"],
  generate(request) {
    if (request.kind === "websocket") {
      const req = applyAuth(request);
      const lines = [`const socket = new WebSocket(${str(req.url)});`, ""];

      if (req.headers.length > 0) {
        lines.unshift(
          "// Note: browsers don't support custom WebSocket headers. In Node.js, use the `ws` package:",
          `// new WebSocket(url, { headers: ${JSON.stringify(Object.fromEntries(req.headers.map((h) => [h.name, h.value])))} })`,
        );
      }

      lines.push(
        'socket.addEventListener("open", () => {',
        req.message ? `  socket.send(${templateString(req.message)});` : "  // Connected",
        "});",
        "",
        'socket.addEventListener("message", (event) => {',
        "  console.log(event.data);",
        "});",
      );

      return lines.join("\n");
    }

    if (request.kind !== "http") {
      return "";
    }

    if (request.auth?.type === "basic") {
      const { username, password } = request.auth;
      const credentials = str(`${username}:${password}`);
      return fetchSnippet({ ...request, auth: null }, credentials);
    }

    return fetchSnippet(applyAuth(request));
  },
});

function fetchSnippet(req: ResolvedHttpRequest, basicCredentials?: string): string {
  const pre: string[] = [];
  const options: string[] = [];

  const headers = withContentType(req.headers, req.body);
  const headerEntries = headers.map((h) => `    ${str(h.name)}: ${str(h.value)},`);

  if (basicCredentials) {
    headerEntries.push(`    Authorization: \`Basic \${btoa(${basicCredentials})}\`,`);
  }

  if (req.method !== "GET") {
    options.push(`method: ${str(req.method)},`);
  }

  if (headerEntries.length > 0) {
    options.push(`headers: {\n${headerEntries.join("\n")}\n  },`);
  }

  const { body } = req;

  switch (body.type) {
    case "json": {
      const parsed = tryParseJson(body.text);

      if (parsed.ok) {
        options.push(
          `body: JSON.stringify(${indent(JSON.stringify(parsed.value, null, 2), "  ")}),`,
        );
      } else if (body.text) {
        options.push(`body: ${templateString(body.text)},`);
      }

      break;
    }

    case "text":
      if (body.text) {
        options.push(`body: ${templateString(body.text)},`);
      }

      break;

    case "graphql":
      options.push(
        `body: JSON.stringify(${indent(JSON.stringify(graphqlPayload(body), null, 2), "  ")}),`,
      );

      break;

    case "form-urlencoded":
      options.push(
        `body: new URLSearchParams(${objectLiteral(
          body.fields.map((f) => [f.name, f.value]),
          "  ",
        )}),`,
      );

      break;

    case "multipart":
      pre.push("const form = new FormData();");

      for (const field of body.fields) {
        pre.push(
          field.file
            ? `form.append(${str(field.name)}, fileInput.files[0]); // ${field.file}`
            : `form.append(${str(field.name)}, ${str(field.value)});`,
        );
      }

      pre.push("");
      options.push("body: form,");

      break;

    case "binary":
      options.push(`body: file, // ${body.filePath ?? "binary file"}`);
      break;
  }

  const call =
    options.length === 0
      ? `const response = await fetch(${str(req.url)});`
      : `const response = await fetch(${str(req.url)}, {\n${options.map((o) => `  ${o}`).join("\n")}\n});`;

  return [...pre, call, "", "const data = await response.json();", "console.log(data);"].join("\n");
}

function templateString(value: string): string {
  if (!value.includes("\n")) {
    return str(value);
  }

  return `\`${value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}\``;
}
