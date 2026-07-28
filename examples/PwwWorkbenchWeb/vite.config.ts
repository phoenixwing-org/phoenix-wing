import path from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const pwwExampleRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: pwwExampleRoot,
  plugins: [vue()],
  server: {
    host: "127.0.0.1",
    port: 41789,
    strictPort: true,
  },
  build: {
    outDir: path.join(pwwExampleRoot, "dist"),
    emptyOutDir: true,
  },
});
