import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts", cli: "src/cli/index.ts" },
  platform: "node",
  dts: true,
  fixedExtension: false,
  deps: { neverBundle: [/^@yaakdoc\//, "vite", /^react/] },
});
