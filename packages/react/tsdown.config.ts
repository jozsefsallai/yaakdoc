import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    islands: "src/islands/index.ts",
    client: "src/client.ts",
    server: "src/server.tsx",
    theme: "src/theme.ts",
  },
  platform: "neutral",
  dts: true,
  fixedExtension: false,
  deps: { neverBundle: [/^react/, /^@yaakdoc\//] },
});
