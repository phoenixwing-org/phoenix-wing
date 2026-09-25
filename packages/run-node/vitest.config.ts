import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // These integration suites launch real Git processes and own temporary repositories.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
