import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const pwwRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pwwArgs = process.argv.slice(2).filter(arg => arg !== "--");
const pwwBuildOnly = pwwArgs.includes("--build-only");
const pwwIndex = pwwArgs.indexOf("--wing-version");
const pwwVersion = pwwArgs[pwwIndex + 1];
const pwwArchiveIndex = pwwArgs.indexOf("--wing-tarball");
const pwwArchive = pwwArchiveIndex >= 0 ? pwwArgs[pwwArchiveIndex + 1] : undefined;
if (pwwIndex < 0 || !/^\d+\.\d+\.\d+$/.test(pwwVersion ?? "")
  || (pwwArchiveIndex >= 0 && (!pwwArchive || !pwwArchive.endsWith('.tgz')))
  || pwwArgs.some((arg, i) => i !== pwwIndex && i !== pwwIndex + 1 && !(pwwArchiveIndex >= 0 && (i === pwwArchiveIndex || i === pwwArchiveIndex + 1)) && arg !== "--build-only")) {
  throw new Error("Usage: pnpm example:registry --wing-version <exact> [--wing-tarball <file.tgz>] [--build-only]");
}
const pwwConsumer = fs.mkdtempSync(path.join(os.tmpdir(), "phoenix-wing-example-registry-"));
const pwwExample = "examples/PwwWorkbenchWeb";
const pwwRequire = createRequire(path.join(pwwRoot, "package.json"));

function pwwInstalledVersion(name) {
  let entry;
  try { entry = pwwRequire.resolve(`${name}/package.json`); }
  catch { entry = pwwRequire.resolve(name); }
  let directory = path.dirname(entry);
  while (directory !== path.dirname(directory)) {
    const file = path.join(directory, "package.json");
    if (fs.existsSync(file)) {
      const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
      if (manifest.name === name) return manifest.version;
    }
    directory = path.dirname(directory);
  }
  throw new Error(`Install repository development dependencies first: ${name}`);
}

function pwwRun(args, allowInterrupt = false) {
  const result = spawnSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", args, {
    cwd: pwwConsumer, stdio: "inherit", shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (allowInterrupt && (result.signal === "SIGINT" || result.status === 130)) return;
  if (result.status !== 0) throw new Error(`Registry example command failed: pnpm ${args.join(" ")} (${result.status ?? result.signal})`);
}

// A new standalone consumer: never mutate repository manifests, lockfiles or node_modules.
fs.cpSync(path.join(pwwRoot, pwwExample), path.join(pwwConsumer, pwwExample), {
  recursive: true,
  filter: source => !/(?:^|[/\\])(?:dist|node_modules)(?:[/\\]|$)/.test(source)
    && !source.endsWith(".test.ts"),
});
fs.copyFileSync(path.join(pwwRoot, "tsconfig.json"), path.join(pwwConsumer, "tsconfig.json"));
const dependencies = { "phoenix-wing": pwwVersion };
if (pwwArchive) {
  fs.copyFileSync(path.resolve(pwwArchive), path.join(pwwConsumer, "wing-candidate.tgz"));
  dependencies["phoenix-wing"] = "file:wing-candidate.tgz";
}
for (const name of ["vue", "pinia", "element-plus"]) dependencies[name] = pwwInstalledVersion(name);
const devDependencies = {};
for (const name of ["vite", "@vitejs/plugin-vue", "typescript", "vue-tsc", "@types/node"]) {
  devDependencies[name] = pwwInstalledVersion(name);
}
fs.writeFileSync(path.join(pwwConsumer, "package.json"), JSON.stringify({
  name: pwwArchive ? "phoenix-wing-example-tarball" : "phoenix-wing-example-registry", private: true, type: "module",
  ...(pwwArchive ? {pwwExpectedWingVersion: pwwVersion} : {}),
  packageManager: JSON.parse(fs.readFileSync(path.join(pwwRoot, "package.json"), "utf8")).packageManager,
  dependencies, devDependencies,
}, null, 2) + "\n");
console.log(`[Wing example][${pwwArchive ? 'TARBALL' : 'REGISTRY'}] exact phoenix-wing@${pwwVersion}; isolated example: ${pwwConsumer}`);
pwwRun(["install", "--ignore-scripts", "--registry=https://registry.npmjs.org/"]);
pwwRun(["exec", "vue-tsc", "-p", `${pwwExample}/tsconfig.json`, "--noEmit", "--pretty", "false"]);
pwwRun(["exec", "vite", "build", "--config", `${pwwExample}/vite.config.ts`]);
console.log(`[Wing example][${pwwArchive ? 'TARBALL' : 'REGISTRY'}] typecheck/build passed. This is not the full release gate.`);
if (!pwwBuildOnly) {
  console.log("[Wing example] Preview: http://127.0.0.1:41790 — Ctrl+C stops preview; isolated evidence is retained.");
  pwwRun(["exec", "vite", "preview", "--config", `${pwwExample}/vite.config.ts`, "--host", "127.0.0.1", "--port", "41790", "--strictPort"], true);
}
