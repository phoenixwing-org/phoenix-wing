import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

/** SFC SSR tests use the same Vue compiler as the aggregate Vite build. */
export default defineConfig({
  plugins: [vue()],
  test: {
    include: [
      "src/**/*.test.ts",
      "examples/PwwWorkbenchWeb/src/**/*.test.ts",
    ],
  },
});
