import { defineConfig } from "tsdown";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  entry: {
    index: "src/index.ts",
    static: "src/static.ts",
    vite: "src/vite.ts",
    integration: "src/integration.ts",
    worker: "src/worker.ts",
    cli: "src/cli/index.ts",
  },
  platform: "node",
  dts: true,
  fixedExtension: false,
  define: { __YAAKDOC_VERSION__: JSON.stringify(pkg.version) },
  deps: { neverBundle: [/^@yaakdoc\//, "vite", /^react/] },
});
