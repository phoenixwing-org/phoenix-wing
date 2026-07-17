import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "phoenix-wing-package-tarballs-"));
const packRoot = path.join(tempRoot, "packs");
const consumerRoot = path.join(tempRoot, "consumer");
const packageNames = [
  "code-core",
  "kt-codegen",
  "cad-contracts",
  "cad-core",
  "db-node",
  "workspace-schema",
];
const requiredPackageFiles = {
  "code-core": ["src/fixtures/annotation_sep.cpp"],
  "cad-contracts": ["fixtures/query-contract-v1.json"],
  "workspace-schema": [
    "fixtures/workspace-schema-v13.json",
    "fixtures/workspace-schema-compatibility-v1.json",
  ],
};
const purePackageForbiddenDependencies = new Set([
  "vue",
  "pinia",
  "element-plus",
  "node-sqlite3-wasm",
]);

try {
  fs.mkdirSync(packRoot, { recursive: true });
  fs.mkdirSync(consumerRoot, { recursive: true });

  const aggregateTarball = packAggregatePackage();
  verifyAggregateManifest(aggregateTarball);
  const tarballs = packageNames.map(packPackage);
  for (const item of tarballs) verifyPackedManifest(item);
  const installTarballs = tarballs.map((item) => item.tarball);
  if (process.env.PNW_VERIFY_OFFLINE === "1") {
    installTarballs.push(packOfflineDependency("node-sqlite3-wasm"));
  }

  fs.writeFileSync(
    path.join(consumerRoot, "package.json"),
    `${JSON.stringify({ name: "phoenix-wing-tarball-consumer", private: true, type: "module" }, null, 2)}\n`,
  );
  const installArgs = [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    ...(process.env.PNW_VERIFY_OFFLINE === "1" ? ["--offline"] : []),
    ...installTarballs,
  ];
  run(npmCommand(), installArgs, { cwd: consumerRoot });

  const smokeFile = path.join(consumerRoot, "smoke.mjs");
  fs.writeFileSync(smokeFile, `
import path from "node:path";
import { pnwNormalizeUuid } from "@phoenix-wing/code-core";
import { KtCodegenParam } from "@phoenix-wing/kt-codegen";
import { KT_CODEGEN_LEGACY_17_COLUMN_CSV_HEADERS } from "@phoenix-wing/kt-codegen/legacy";
import { ktCodegenValidateParam } from "@phoenix-wing/kt-codegen/model";
import { pnwNormalizeCadRelativePath } from "@phoenix-wing/cad-core";
import { PNW_CAD_NATIVE_PROTOCOL } from "@phoenix-wing/cad-contracts";
import {
  PNW_WORKSPACE_SCHEMA_ID,
  PNW_WORKSPACE_SCHEMA_VERSION,
  PNW_WORKSPACE_SCHEMA_V13_DDL,
} from "@phoenix-wing/workspace-schema";
import { pnwCreateDb } from "@phoenix-wing/db-node";

if (pnwNormalizeUuid("{550E8400-E29B-41D4-A716-446655440000}") !== "550e8400e29b41d4a716446655440000") {
  throw new Error("code-core export smoke failed");
}
if (new KtCodegenParam().kind !== "kt.codegen") {
  throw new Error("kt-codegen export smoke failed");
}
if (KT_CODEGEN_LEGACY_17_COLUMN_CSV_HEADERS.length !== 17 || typeof ktCodegenValidateParam !== "function") {
  throw new Error("kt-codegen subpath export smoke failed");
}
if (pnwNormalizeCadRelativePath("a\\\\b.FCStd") !== "a/b.FCStd") {
  throw new Error("cad-core export smoke failed");
}
if (PNW_CAD_NATIVE_PROTOCOL !== "phoenix-cad-native") {
  throw new Error("cad-contracts export smoke failed");
}
if (PNW_WORKSPACE_SCHEMA_ID !== "phoenix-workspace" || PNW_WORKSPACE_SCHEMA_VERSION !== 13) {
  throw new Error("workspace-schema export smoke failed");
}
const databasePath = path.join(process.cwd(), "consumer.sqlite");
const db = pnwCreateDb(databasePath);
try {
  db.exec(PNW_WORKSPACE_SCHEMA_V13_DDL);
  db.run("INSERT INTO phoenix_meta(key, value) VALUES (?, ?)", ["schema_version", "13"]);
  const row = db.get("SELECT value FROM phoenix_meta WHERE key = ?", ["schema_version"]);
  if (row?.value !== "13") throw new Error("db-node runtime smoke failed");
} finally {
  db.close();
}
process.stdout.write("[verify] clean npm consumer imports and SQLite smoke passed\\n");
`);
  run(process.execPath, [smokeFile], { cwd: consumerRoot });
  process.stdout.write(
    `[verify] ${process.platform}-${process.arch}: 1 aggregate + ${tarballs.length} small Wing package tarballs passed\n`,
  );
} finally {
  if (process.env.PNW_KEEP_VERIFY_DIR === "1") {
    process.stdout.write(`[verify] kept ${tempRoot}\n`);
  } else {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function packPackage(directoryName) {
  const packageRoot = path.join(root, "packages", directoryName);
  const result = run(
    npmCommand(),
    ["pack", "--json", "--pack-destination", packRoot],
    { cwd: packageRoot, capture: true },
  );
  const info = parsePackJson(result.stdout)?.[0];
  if (!info || typeof info.filename !== "string") {
    throw new Error(`npm pack returned no filename for ${directoryName}`);
  }
  return {
    directoryName,
    tarball: path.join(packRoot, info.filename),
    expectedName: JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")).name,
  };
}

function packAggregatePackage() {
  const result = run(
    pnpmCommand(),
    ["pack", "--json", "--pack-destination", packRoot],
    { cwd: root, capture: true },
  );
  const info = JSON.parse(result.stdout);
  if (!info || typeof info.filename !== "string") {
    throw new Error("pnpm pack returned no filename for phoenix-wing aggregate");
  }
  return {
    directoryName: "aggregate",
    tarball: info.filename,
  };
}

function packOfflineDependency(packageName) {
  const linkedPath = path.join(root, "packages", "db-node", "node_modules", packageName);
  if (!fs.existsSync(linkedPath)) {
    throw new Error(`offline verification requires installed ${packageName}; run pnpm install first`);
  }
  const packageRoot = fs.realpathSync(linkedPath);
  const result = run(
    npmCommand(),
    ["pack", "--json", "--pack-destination", packRoot],
    { cwd: packageRoot, capture: true },
  );
  const info = parsePackJson(result.stdout)?.[0];
  if (!info || typeof info.filename !== "string") {
    throw new Error(`npm pack returned no filename for offline dependency ${packageName}`);
  }
  return path.join(packRoot, info.filename);
}

function parsePackJson(stdout) {
  const marker = stdout.lastIndexOf("\n[");
  const jsonText = marker >= 0 ? stdout.slice(marker + 1) : stdout.slice(stdout.indexOf("["));
  return JSON.parse(jsonText);
}

function verifyPackedManifest(item) {
  const unpackRoot = path.join(tempRoot, "unpacked", item.directoryName);
  fs.mkdirSync(unpackRoot, { recursive: true });
  run("tar", ["-xzf", item.tarball, "-C", unpackRoot]);
  const packageRoot = path.join(unpackRoot, "package");
  const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  if (manifest.name !== item.expectedName) {
    throw new Error(`${item.directoryName} packed name changed to ${JSON.stringify(manifest.name)}`);
  }
  const serialized = JSON.stringify({
    dependencies: manifest.dependencies,
    optionalDependencies: manifest.optionalDependencies,
    peerDependencies: manifest.peerDependencies,
  });
  if (serialized.includes("workspace:")) {
    throw new Error(`${manifest.name} tarball still contains a workspace: dependency`);
  }
  for (const required of ["README.md", "LICENSE", "NOTICE", "dist/index.js", "dist/index.d.ts"]) {
    const file = path.join(packageRoot, required);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      throw new Error(`${manifest.name} tarball is missing ${required}`);
    }
  }
  for (const required of requiredPackageFiles[item.directoryName] ?? []) {
    const file = path.join(packageRoot, required);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      throw new Error(`${manifest.name} tarball is missing contract fixture ${required}`);
    }
  }
  if (item.directoryName !== "db-node") {
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.optionalDependencies,
      ...manifest.peerDependencies,
    };
    for (const forbidden of purePackageForbiddenDependencies) {
      if (dependencies[forbidden] !== undefined) {
        throw new Error(`${manifest.name} pure package must not depend on ${forbidden}`);
      }
    }
  }
}

function verifyAggregateManifest(item) {
  const unpackRoot = path.join(tempRoot, "unpacked", item.directoryName);
  fs.mkdirSync(unpackRoot, { recursive: true });
  run("tar", ["-xzf", item.tarball, "-C", unpackRoot]);
  const packageRoot = path.join(unpackRoot, "package");
  const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  if (manifest.name !== "phoenix-wing" || manifest.version !== "0.4.0") {
    throw new Error(`aggregate tarball identity changed to ${manifest.name}@${manifest.version}`);
  }
  const serialized = JSON.stringify({
    dependencies: manifest.dependencies,
    optionalDependencies: manifest.optionalDependencies,
    peerDependencies: manifest.peerDependencies,
  });
  if (serialized.includes("workspace:")) {
    throw new Error("phoenix-wing aggregate tarball still contains a workspace: dependency");
  }
  for (const dependency of ["@phoenix-wing/code-core", "@phoenix-wing/db-node"]) {
    if (manifest.dependencies?.[dependency] !== manifest.version) {
      throw new Error(`${dependency} must match aggregate version ${manifest.version}`);
    }
  }
  for (const required of ["README.md", "LICENSE", "src/index.ts", "src/code-core/index.ts"]) {
    const file = path.join(packageRoot, required);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      throw new Error(`phoenix-wing aggregate tarball is missing ${required}`);
    }
  }
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function pnpmCommand() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: process.env,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = options.capture ? `\n${String(result.stderr).trim()}` : "";
    throw new Error(`${command} exited with ${result.status}${stderr}`);
  }
  return result;
}
