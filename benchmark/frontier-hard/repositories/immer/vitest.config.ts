import {defineConfig} from "vitest/config"
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.[jt]s?(x)", "tests/**/*.test.ts"],
    globals: true,
  }
})
