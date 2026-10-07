import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const retired = "@phoenix-wing/cad-rust-source";
const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean).filter(f => fs.existsSync(path.join(root, f)));
const failures = [];
if (fs.existsSync(path.join(root, "packages/cad-rust-source"))) failures.push("retired source directory or build residue");
for (const file of files) {
  if (file.startsWith("packages/cad-rust-source/") || /\.(?:rs|py)$/.test(file) || /(?:^|\/)Cargo\.(?:toml|lock)$/.test(file)) failures.push(file);
  if (file === "pnpm-lock.yaml" && fs.readFileSync(path.join(root, file), "utf8").includes("packages/cad-rust-source")) failures.push(file);
  if (file === "package.json" || /^packages\/[^/]+\/package\.json$/.test(file)) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
    for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
      if (manifest[field]?.[retired]) failures.push(file + ": " + field);
    }
    if (Object.values(manifest.scripts ?? {}).some(cmd => /\bcargo\b|\bpython(?:3)?\b|verify:cad-rust-tarball/.test(cmd))) failures.push(file + ": native runtime script");
  }
  if (file.startsWith(".github/workflows/") && /rust-toolchain|\bcargo\b|setup-python|verify:cad-rust-tarball/.test(fs.readFileSync(path.join(root, file), "utf8"))) failures.push(file);
}
const matrix = JSON.parse(fs.readFileSync(path.join(root, "release-matrix.json"), "utf8"));
if (matrix.packages.some(p => p.name === retired || p.kind === "rust-source")) failures.push("release-matrix.json");
if (failures.length) throw new Error("Retired CAD runtime returned: " + failures.join(", "));
console.log("[verify] CAD runtime is TypeScript-only; retired source package, Cargo/Python and CI hooks are absent");
