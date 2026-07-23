import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const matrix = readJson(path.join(root, "release-matrix.json"));

if (matrix.schema_version !== 1 || !isExactVersion(matrix.release_version)) {
  throw new Error("release-matrix.json must declare schema_version 1 and an exact release_version");
}
if (!Array.isArray(matrix.packages) || matrix.packages.length === 0) {
  throw new Error("release matrix has no Wing packages");
}

const packageNames = new Set();
for (const entry of matrix.packages) {
  const manifest = readJson(path.resolve(root, entry.manifest));
  if (manifest.name !== entry.name) {
    throw new Error(`${entry.manifest} name must be ${entry.name}, got ${manifest.name}`);
  }
  if (manifest.version !== matrix.release_version) {
    throw new Error(`${entry.name} must use lockstep version ${matrix.release_version}, got ${manifest.version}`);
  }
  if (packageNames.has(entry.name)) throw new Error(`duplicate Wing package in release matrix: ${entry.name}`);
  packageNames.add(entry.name);
}

process.stdout.write(
  `[verify] release matrix ${matrix.release_version}: ${packageNames.size} Wing packages passed\n`,
);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function isExactVersion(value) {
  return typeof value === "string" && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(value);
}
