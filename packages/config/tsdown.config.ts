import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/node.ts"],
  platform: "node",
  dts: true,
  fixedExtension: false,
});
