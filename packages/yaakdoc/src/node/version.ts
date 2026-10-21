import { readFileSync } from "node:fs";
import { ENGINE_ANCHOR } from "./resolve";

declare const __YAAKDOC_VERSION__: string | undefined;

/** The yaakdoc version: inlined by the build, read from package.json when running from source. */
export const VERSION: string =
  typeof __YAAKDOC_VERSION__ === "string"
    ? __YAAKDOC_VERSION__
    : JSON.parse(readFileSync(ENGINE_ANCHOR, "utf8")).version;
