import { applyAuth } from "@yaakdoc/core";
import { defineSnippet } from "../define";
import { graphqlPayload, shellQuote, withContentType } from "../utils";

export const curl = defineSnippet({
  id: "curl",
  label: "cURL",
  language: "bash",
  supports: ["http"],
  generate(request) {
    if (request.kind !== "http") {
      return "";
    }

    const basic = request.auth?.type === "basic" ? request.auth : null;
    const req = basic ? { ...request, auth: null } : applyAuth(request);

    const parts: string[] = [];

    parts.push(
      req.method === "GET" && req.body.type === "none"
        ? `curl ${shellQuote(req.url)}`
        : `curl -X ${req.method} ${shellQuote(req.url)}`,
    );

    for (const header of withContentType(req.headers, req.body)) {
      parts.push(`-H ${shellQuote(`${header.name}: ${header.value}`)}`);
    }

    if (basic) {
      parts.push(`-u ${shellQuote(`${basic.username}:${basic.password}`)}`);
    }

    const { body } = req;

    switch (body.type) {
      case "json":
      case "text":
        if (body.text) {
          parts.push(`--data-raw ${shellQuote(body.text)}`);
        }

        break;

      case "graphql": {
        parts.push(`--data-raw ${shellQuote(JSON.stringify(graphqlPayload(body)))}`);
        break;
      }

      case "form-urlencoded":
        for (const field of body.fields) {
          parts.push(`--data-urlencode ${shellQuote(`${field.name}=${field.value}`)}`);
        }

        break;

      case "multipart":
        for (const field of body.fields) {
          const value = field.file
            ? `@${field.file}${field.contentType ? `;type=${field.contentType}` : ""}`
            : field.value;

          parts.push(`-F ${shellQuote(`${field.name}=${value}`)}`);
        }

        break;

      case "binary":
        parts.push(`--data-binary ${shellQuote(`@${body.filePath ?? "file"}`)}`);
        break;
    }

    return parts.join(" \\\n  ");
  },
});
