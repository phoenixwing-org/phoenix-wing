import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireConsumers = process.argv.includes("--require-consumers");
const wingOnly = process.argv.includes("--wing-only");
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

let verifiedConsumers = 0;
if (!wingOnly) {
  for (const consumer of matrix.consumers ?? []) {
    const manifestPath = path.resolve(root, consumer.manifest);
    if (!fs.existsSync(manifestPath)) {
      if (requireConsumers) throw new Error(`required consumer manifest is missing: ${manifestPath}`);
      process.stdout.write(`[verify] skipped unavailable consumer ${consumer.name}\n`);
      continue;
    }
    const manifest = readJson(manifestPath);
    for (const [section, dependencies] of Object.entries(consumer.required ?? {})) {
      for (const [name, expected] of Object.entries(dependencies)) {
        const actual = manifest[section]?.[name];
        if (actual !== expected) {
          throw new Error(`${consumer.name} ${section}.${name} must be ${expected}, got ${String(actual)}`);
        }
      }
    }
    const declared = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.optionalDependencies,
      ...manifest.peerDependencies,
    };
    for (const name of consumer.forbidden ?? []) {
      if (declared[name] !== undefined) throw new Error(`${consumer.name} must not depend on ${name}`);
    }
    verifiedConsumers += 1;
  }
}

process.stdout.write(
  `[verify] release matrix ${matrix.release_version}: ${packageNames.size} Wing packages, ${verifiedConsumers} consumers passed\n`,
);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function isExactVersion(value) {
  return typeof value === "string" && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(value);
}
