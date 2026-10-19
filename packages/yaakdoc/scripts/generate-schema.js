// Writes config.schema.json (referenced from yaakdoc.config.json via "$schema").
import { writeFileSync } from "node:fs";
import { getConfigJsonSchema } from "@yaakdoc/config";

const schema = { ...getConfigJsonSchema(), $id: "https://unpkg.com/yaakdoc/config.schema.json" };

writeFileSync(
  new URL("../config.schema.json", import.meta.url),
  `${JSON.stringify(schema, null, 2)}\n`,
);
