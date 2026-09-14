import path from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { pwwReadVerificationSource } from "./tooling/PwwVerificationSource.js";

const pwwExampleRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: pwwExampleRoot,
  plugins: [vue(), {
    name: "pww-verification-source",
    resolveId(id) { return id === "virtual:pww-verification-source" ? "\0virtual:pww-verification-source" : undefined; },
    load(id) {
      if (id !== "\0virtual:pww-verification-source") return;
      return `export default ${JSON.stringify(pwwReadVerificationSource(path.resolve(pwwExampleRoot, "../..")))}`;
    },
  }],
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
