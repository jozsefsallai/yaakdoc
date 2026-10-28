import { defineConfig } from "tsdown";

export default defineConfig({
  // CommonJS too: Next.js compiles `next.config.ts` to CommonJS.
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  platform: "node",
  dts: true,
  fixedExtension: false,
  deps: { neverBundle: ["yaakdoc", /^yaakdoc\//, "next"] },
});
