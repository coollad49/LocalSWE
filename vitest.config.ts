import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "benchmark/repositories/*/tests/**/*.test.ts",
      "benchmark/frontier-hard/repositories/*/tests/**/*.test.ts",
      "benchmark/cases/*/private/**/*.test.ts",
      "benchmark/cases/*/public/**/*.test.ts",
      "benchmark/frontier-hard/cases/*/private/**/*.test.ts",
      "benchmark/frontier-hard/cases/*/public/**/*.test.ts",
      "src/evaluator/tests/**/*.test.ts",
      "src/**/*.test.ts",
    ],
    // Use vmThreads for tinyspy happy-dom if needed, but default is fine
    // Isolate false for tinyspy original, but we use run
    environment: "node",
    globals: false,
  },
  // Handle .ts extensions with allowImportingTsExtensions
  resolve: {
    // Vite will resolve .ts via esbuild
  },
});
