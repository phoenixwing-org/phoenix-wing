import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { test } from "node:test";

const verifier = fs.readFileSync(new URL("./verify-cad-runtime.mjs", import.meta.url), "utf8");
function runFixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pnw-cad-retirement-test-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    const inputs = {
      "scripts/verify-cad-runtime.mjs": verifier,
      "package.json": JSON.stringify({ name: "fixture", scripts: { build: "tsc" } }),
      "release-matrix.json": JSON.stringify({ packages: [{ name: "@phoenix-wing/cad-core", kind: "typescript-core" }] }),
      ...files,
    };
    for (const [file, contents] of Object.entries(inputs)) {
      const target = path.join(root, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, contents);
    }
    return spawnSync(process.execPath, ["scripts/verify-cad-runtime.mjs"], { cwd: root, encoding: "utf8" });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("accepts TypeScript CAD and historical prose without native execution", () => {
  const result = runFixture({ "README.md": "Historical cad-rust-source / Python discussion\n" });
  assert.equal(result.status, 0, result.stderr);
});

for (const [name, files] of [
  ["retired source package", { "packages/cad-rust-source/package.json": "{}" }],
  ["ignored build residue", { ".gitignore": "target/\n", "packages/cad-rust-source/target/cache": "fixture" }],
  ["Rust source", { "packages/cad-core/src/reader.rs": "// fixture" }],
  ["Python source", { "packages/cad-core/src/reader.py": "# fixture" }],
  ["Cargo manifest", { "Cargo.toml": "[workspace]\n" }],
  ["runtime dependency", { "package.json": JSON.stringify({ dependencies: { "@phoenix-wing/cad-rust-source": "0.6.3" } }) }],
  ["runtime command", { "package.json": JSON.stringify({ scripts: { build: "python3 reader.py" } }) }],
  ["native CI toolchain", { ".github/workflows/ci.yml": "steps:\n  - uses: dtolnay/rust-toolchain@stable\n" }],
  ["retired release entry", { "release-matrix.json": JSON.stringify({ packages: [{ name: "@phoenix-wing/cad-rust-source", kind: "rust-source" }] }) }],
  ["retired lockfile importer", { "pnpm-lock.yaml": "importers:\n  packages/cad-rust-source: {}\n" }],
]) {
  test(`rejects ${name}`, () => {
    const result = runFixture(files);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Retired CAD runtime returned/);
  });
}
