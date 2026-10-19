import { applyAuth } from "@yaakdoc/core";
import { defineSnippet } from "../define";
import {
  bodyText,
  graphqlQuery,
  graphqlVariables,
  indent,
  indentLines,
  withContentType,
} from "../utils";

const goStr = (value: string) =>
  value.includes("`") || !value.includes("\n") ? JSON.stringify(value) : `\`${value}\``;

export const go = defineSnippet({
  id: "go",
  label: "Go",
  language: "go",
  supports: ["http"],
  generate(request) {
    if (request.kind !== "http") {
      return "";
    }

    const basic = request.auth?.type === "basic" ? request.auth : null;
    const req = basic ? { ...request, auth: null } : applyAuth(request);

    const imports = new Set(["fmt", "io", "net/http"]);

    const setup: string[] = [];

    let bodyVar = "nil";

    const headers = withContentType(req.headers, req.body);

    const { body } = req;

    if (body.type === "multipart") {
      imports.add("bytes");
      imports.add("mime/multipart");

      setup.push("\tbody := &bytes.Buffer{}", "\twriter := multipart.NewWriter(body)");

      for (const field of body.fields) {
        if (field.file) {
          imports.add("os");

          setup.push(
            `\tfile, _ := os.Open(${goStr(field.file)})`,
            "\tdefer file.Close()",
            `\tpart, _ := writer.CreateFormFile(${goStr(field.name)}, ${goStr(field.file.split("/").at(-1) ?? field.file)})`,
            "\tio.Copy(part, file)",
          );
        } else {
          setup.push(`\twriter.WriteField(${goStr(field.name)}, ${goStr(field.value)})`);
        }
      }

      setup.push("\twriter.Close()", "");

      bodyVar = "body";

      headers.push({ name: "Content-Type", value: "__MULTIPART__" });
    } else if (body.type === "binary") {
      imports.add("os");

      setup.push(
        `\tbody, _ := os.Open(${goStr(body.filePath ?? "file")})`,
        "\tdefer body.Close()",
        "",
      );

      bodyVar = "body";
    } else if (body.type === "graphql") {
      imports.add("bytes");
      imports.add("encoding/json");

      const query = graphqlQuery(body);
      const variables = graphqlVariables(body);
      const fields: Array<[string, string]> = [["query", "query"]];

      // A raw string keeps the query readable; fall back to a quoted string if it has backticks.
      setup.push(
        query.includes("`")
          ? `\tquery := ${JSON.stringify(query)}`
          : `\tquery := \`\n${indentLines(query, "\t\t")}\n\t\``,
      );

      if (variables !== undefined) {
        const json = JSON.stringify(variables, null, "\t");

        setup.push(
          json.includes("`")
            ? `\tvariables := json.RawMessage(${JSON.stringify(json)})`
            : `\tvariables := json.RawMessage(\`${indent(json, "\t")}\`)`,
        );

        fields.push(["variables", "variables"]);
      }

      if (body.operationName) {
        fields.push(["operationName", goStr(body.operationName)]);
      }

      const width = Math.max(...fields.map(([key]) => key.length)) + 3;

      setup.push(
        "",
        "\tpayload, _ := json.Marshal(map[string]any{",
        ...fields.map(([key, value]) => `\t\t${`"${key}":`.padEnd(width)} ${value},`),
        "\t})",
        "",
      );

      bodyVar = "bytes.NewReader(payload)";
    } else {
      const text = bodyText(body);

      if (text) {
        imports.add("strings");
        setup.push(`\tbody := strings.NewReader(${goStr(text)})`, "");
        bodyVar = "body";
      }
    }

    const lines = [
      "package main",
      "",
      `import (\n${[...imports]
        .sort()
        .map((i) => `\t"${i}"`)
        .join("\n")}\n)`,
      "",
      "func main() {",
      ...setup,
      `\treq, err := http.NewRequest(${goStr(req.method)}, ${goStr(req.url)}, ${bodyVar})`,
      "\tif err != nil {",
      "\t\tpanic(err)",
      "\t}",
      ...headers.map((h) =>
        h.value === "__MULTIPART__"
          ? '\treq.Header.Set("Content-Type", writer.FormDataContentType())'
          : `\treq.Header.Set(${goStr(h.name)}, ${goStr(h.value)})`,
      ),
      ...(basic ? [`\treq.SetBasicAuth(${goStr(basic.username)}, ${goStr(basic.password)})`] : []),
      "",
      "\tres, err := http.DefaultClient.Do(req)",
      "\tif err != nil {",
      "\t\tpanic(err)",
      "\t}",
      "\tdefer res.Body.Close()",
      "",
      "\tdata, _ := io.ReadAll(res.Body)",
      "\tfmt.Println(string(data))",
      "}",
    ];

    return lines.join("\n");
  },
});
