import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts"],
    environment: "node",
    testTimeout: 10_000,
    env: {
      // Ensure PROJECT_ROOT points to the actual project root (2 levels up from orchestrator)
      PROJECT_ROOT: resolve(__dirname, "../.."),
    },
  },
});
