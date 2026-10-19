import { applyAuth } from "@yaakdoc/core";
import { defineSnippet } from "../define";
import { shellQuote } from "../utils";

export const wscat = defineSnippet({
  id: "wscat",
  label: "wscat",
  language: "bash",
  supports: ["websocket"],
  generate(request) {
    if (request.kind !== "websocket") {
      return "";
    }

    const req = applyAuth(request);
    const parts = [`wscat -c ${shellQuote(req.url)}`];

    for (const header of req.headers) {
      parts.push(`-H ${shellQuote(`${header.name}: ${header.value}`)}`);
    }

    const command = parts.join(" \\\n  ");
    if (!req.message) {
      return command;
    }

    return `${command}\n\n# Then send:\n# ${req.message.split("\n").join("\n# ")}`;
  },
});
