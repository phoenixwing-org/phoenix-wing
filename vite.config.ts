import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import ts from "typescript";
import { defineConfig, type Plugin, type UserConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.join(root, "src");

function collectEntries(directory: string, entries: Record<string, string> = {}): Record<string, string> {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, item.name);
    if (item.isDirectory()) {
      collectEntries(absolute, entries);
      continue;
    }
    if (!/\.(?:ts|vue)$/u.test(item.name) || /(?:\.test|\.d)\.ts$/u.test(item.name)) continue;
    if (item.name.endsWith(".ts") && !pnwEmitsRuntimeJavaScript(absolute)) continue;
    const relative = path.relative(sourceRoot, absolute).replaceAll(path.sep, "/");
    const name = relative.replace(/\.(?:ts|vue)$/u, "");
    entries[name] = absolute;
  }
  return entries;
}

/** 纯类型模块只由 vue-tsc 生成 .d.ts，不应成为 Rollup JavaScript entry。 */
function pnwEmitsRuntimeJavaScript(file: string): boolean {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      removeComments: true,
      verbatimModuleSyntax: true,
    },
    fileName: file,
  }).outputText.replaceAll(/\s/gu, "");
  return output !== "" && output !== "export{};" && output !== "export{}";
}

/** Direct component subpath imports keep their scoped CSS without reintroducing source SFCs. */
function injectComponentCss(): Plugin {
  return {
    name: "phoenix-wing-inject-component-css",
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const style = Object.values(bundle).find(
          (item) => item.type === "asset" && item.fileName === "style.css",
        );
        if (!style) throw new Error("phoenix-wing aggregate build did not emit style.css");
        for (const item of Object.values(bundle)) {
          if (item.type !== "chunk" || !item.isEntry) continue;
          const isComponentEntry = item.facadeModuleId?.endsWith(".vue");
          const isAggregateEntry = item.fileName === "index.js";
          if (!isComponentEntry && !isAggregateEntry) continue;
          const specifier = path.posix.relative(path.posix.dirname(item.fileName), style.fileName);
          item.code = `import ${JSON.stringify(specifier.startsWith(".") ? specifier : `./${specifier}`)};\n${item.code}`;
        }
      },
    },
  };
}

export default defineConfig({
  plugins: [vue(), injectComponentCss()],
  build: {
    lib: {
      entry: collectEntries(sourceRoot),
      formats: ["es"],
      cssFileName: "style",
    },
    cssCodeSplit: false,
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    rollupOptions: {
      external: (id) => /^(?:vue|pinia|element-plus|@phoenix-wing\/)/u.test(id),
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "[name][extname]",
      },
    },
  },
} satisfies UserConfig);
