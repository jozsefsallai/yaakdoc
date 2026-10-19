import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Builds and dev servers take a few seconds each.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
