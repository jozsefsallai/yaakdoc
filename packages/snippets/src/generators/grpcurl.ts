import { grpcMethodPath } from "@yaakdoc/core";
import { defineSnippet } from "../define";
import { shellQuote } from "../utils";

export const grpcurl = defineSnippet({
  id: "grpcurl",
  label: "grpcurl",
  language: "bash",
  supports: ["grpc"],
  generate(request) {
    if (request.kind !== "grpc") {
      return "";
    }

    const plaintext = request.url.startsWith("http://") || request.url.startsWith("grpc://");
    const address = request.url.replace(/^[a-z]+:\/\//i, "").replace(/\/+$/, "") || "localhost:443";
    const parts = ["grpcurl"];

    if (plaintext) {
      parts.push("-plaintext");
    }

    const metadata = [...request.metadata];

    const { auth } = request;

    if (auth?.type === "bearer") {
      metadata.push({ name: "authorization", value: `${auth.prefix} ${auth.token}` });
    } else if (auth?.type === "apikey") {
      metadata.push({ name: auth.key, value: auth.value });
    } else if (auth?.type === "other" && auth.header) {
      metadata.push(auth.header);
    }

    for (const entry of metadata) {
      parts.push(`-H ${shellQuote(`${entry.name}: ${entry.value}`)}`);
    }

    if (request.message.trim()) {
      parts.push(`-d ${shellQuote(request.message.trim())}`);
    }

    parts.push(address);

    const method = grpcMethodPath(request);

    if (method) {
      parts.push(method);
    }

    return parts.join(" \\\n  ");
  },
});
