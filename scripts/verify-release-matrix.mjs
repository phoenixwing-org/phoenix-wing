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

const packageNames = new Set(matrix.packages.map(({ name }) => name));
const manifests = new Map();
for (const entry of matrix.packages) {
  const manifest = readJson(path.resolve(root, entry.manifest));
  if (manifest.name !== entry.name) {
    throw new Error(`${entry.manifest} name must be ${entry.name}, got ${manifest.name}`);
  }
  if (manifest.version !== matrix.release_version) {
    throw new Error(`${entry.name} must use lockstep version ${matrix.release_version}, got ${manifest.version}`);
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
      const expected = `workspace:${matrix.release_version}`;
      if (packageNames.has(dependencyName) && specifier !== expected) {
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
const rustRoot = path.dirname(path.resolve(root, rustPackage.entry.manifest));
const sourceManifest = readJson(path.join(rustRoot, "source-manifest.json"));
if (sourceManifest.package_version !== matrix.release_version) {
  throw new Error(
    `cad-rust-source package_version must equal ${matrix.release_version}, got ${sourceManifest.package_version}`,
  );
}
const queryManifest = fs.readFileSync(path.join(rustRoot, "crates/fcstd-query/Cargo.toml"), "utf8");
const queryVersion = queryManifest.match(/^version = "([^"]+)"$/mu)?.[1];
if (queryVersion !== matrix.release_version) {
  throw new Error(`fcstd-query crate must equal ${matrix.release_version}, got ${queryVersion}`);
}
const cargoLock = fs.readFileSync(path.join(rustRoot, "Cargo.lock"), "utf8");
if (!cargoLock.includes(`name = "fcstd-query"\nversion = "${matrix.release_version}"`)) {
  throw new Error(`Cargo.lock must record fcstd-query ${matrix.release_version}`);
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
