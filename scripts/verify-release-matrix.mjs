import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const matrix = readJson(path.join(root, "release-matrix.json"));

if (matrix.schema_version !== 2) {
  throw new Error("release-matrix.json must declare schema_version 2 with per-package versions");
}
if (!Array.isArray(matrix.packages) || matrix.packages.length === 0) {
  throw new Error("release matrix has no Wing packages");
}

const packageNames = new Set(matrix.packages.map(({ name }) => name));
const manifests = new Map();
for (const entry of matrix.packages) {
  if (!isExactVersion(entry.version)) {
    throw new Error(`${entry.name ?? entry.manifest} must declare an exact matrix version`);
  }
  const manifest = readJson(path.resolve(root, entry.manifest));
  if (manifest.name !== entry.name) {
    throw new Error(`${entry.manifest} name must be ${entry.name}, got ${manifest.name}`);
  }
  if (manifest.version !== entry.version) {
    throw new Error(`${entry.name} must use matrix version ${entry.version}, got ${manifest.version}`);
  }
  if (manifests.has(entry.name)) throw new Error(`duplicate Wing package in release matrix: ${entry.name}`);
  if (manifest.private === true) {
    throw new Error(`${entry.name} is a release unit and must not be private`);
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error(`${entry.name} must declare a non-empty files allowlist`);
  }
  if (manifest.exports === null || typeof manifest.exports !== "object") {
    throw new Error(`${entry.name} must declare package exports`);
  }
  if (!String(manifest.scripts?.prepublishOnly ?? "").endsWith("verify-publish-client.mjs")) {
    throw new Error(`${entry.name} must retain the pnpm publish client gate`);
  }
  if (entry.name.startsWith("@") && manifest.publishConfig?.access !== "public") {
    throw new Error(`${entry.name} must declare publishConfig.access=public`);
  }
  manifests.set(entry.name, { entry, manifest });
}

for (const [packageName, { manifest }] of manifests) {
  for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
    for (const [dependencyName, specifier] of Object.entries(manifest[field] ?? {})) {
      const dependencyEntry = manifests.get(dependencyName)?.entry;
      const expected = dependencyEntry ? `workspace:${dependencyEntry.version}` : undefined;
      if (expected && specifier !== expected) {
        throw new Error(`${packageName} ${field}.${dependencyName} must equal ${expected}, got ${specifier}`);
      }
      if (!packageNames.has(dependencyName) && /^(?:workspace:|file:|link:)/u.test(specifier)) {
        throw new Error(`${packageName} ${field}.${dependencyName} must not use local specifier ${specifier}`);
      }
    }
  }
}

const rustPackage = manifests.get("@phoenix-wing/cad-rust-source");
if (!rustPackage) throw new Error("release matrix is missing @phoenix-wing/cad-rust-source");
const rustVersion = rustPackage.entry.version;
const rustRoot = path.dirname(path.resolve(root, rustPackage.entry.manifest));
const sourceManifest = readJson(path.join(rustRoot, "source-manifest.json"));
if (sourceManifest.package_version !== rustVersion) {
  throw new Error(
    `cad-rust-source package_version must equal ${rustVersion}, got ${sourceManifest.package_version}`,
  );
}
const queryManifest = fs.readFileSync(path.join(rustRoot, "crates/fcstd-query/Cargo.toml"), "utf8");
const queryVersion = queryManifest.match(/^version = "([^"]+)"$/mu)?.[1];
if (queryVersion !== rustVersion) {
  throw new Error(`fcstd-query crate must equal ${rustVersion}, got ${queryVersion}`);
}
const cargoLock = fs.readFileSync(path.join(rustRoot, "Cargo.lock"), "utf8");
const lockedQueryVersion = cargoLock.match(
  /\[\[package\]\]\r?\nname = "fcstd-query"\r?\nversion = "([^"]+)"/u,
)?.[1];
if (lockedQueryVersion !== rustVersion) {
  throw new Error(`Cargo.lock must record fcstd-query ${rustVersion}, got ${lockedQueryVersion ?? "missing"}`);
}

const rootPackage = manifests.get("phoenix-wing");
if (!rootPackage) throw new Error("release matrix is missing phoenix-wing");
const aggregateSource = fs.readFileSync(path.join(root, "src/index.ts"), "utf8");
const aggregateVersion = aggregateSource.match(/PNW_VERSION\s*=\s*['"]([^'"]+)['"]/u)?.[1];
if (aggregateVersion !== rootPackage.entry.version) {
  throw new Error(`PNW_VERSION must equal phoenix-wing ${rootPackage.entry.version}, got ${aggregateVersion}`);
}

process.stdout.write(
  `[verify] independent release matrix: ${packageNames.size} Wing packages passed\n`,
);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function isExactVersion(value) {
  return typeof value === "string" && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(value);
}
