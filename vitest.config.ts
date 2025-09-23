import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "test/",
        "**/*.d.ts",
        "**/*.config.{js,ts}",
        "**/__tests__/**",
        "**/*.test.{js,ts}",
        "**/*.spec.{js,ts}",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    setupFiles: ["./test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
