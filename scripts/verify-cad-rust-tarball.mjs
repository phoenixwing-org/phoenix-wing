import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(root, "packages", "cad-rust-source");
const releaseVersion = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "phoenix-cad-rust-tarball-"));
const unpackRoot = path.join(tempRoot, "unpacked");
const cargoTargetDir = path.join(tempRoot, "target");

try {
  fs.mkdirSync(unpackRoot, { recursive: true });
  const packResult = run(npmCommand(), ["pack", "--json", "--pack-destination", tempRoot], {
    cwd: packageRoot,
    capture: true,
  });
  const packInfo = JSON.parse(packResult.stdout);
  const filename = packInfo?.[0]?.filename;
  if (typeof filename !== "string" || !filename.endsWith(".tgz")) {
    throw new Error(`npm pack did not return a tarball filename: ${packResult.stdout}`);
  }

  const tarball = path.join(tempRoot, filename);
  run("tar", ["-xzf", tarball, "-C", unpackRoot]);
  const extracted = path.join(unpackRoot, "package");
  assertFiles(extracted, [
    "package.json",
    "Cargo.toml",
    "Cargo.lock",
    "source-manifest.json",
    "LICENSE",
    "NOTICE",
    "crates/fcstd-query/Cargo.toml",
    "fixtures/database/query-v13.sql",
  ]);
  const packedManifest = JSON.parse(fs.readFileSync(path.join(extracted, "package.json"), "utf8"));
  assertEqual(packedManifest.name, "@phoenix-wing/cad-rust-source", "Rust source package name");
  assertEqual(packedManifest.version, releaseVersion, "Rust source package version");
  assertEqual(packedManifest.publishConfig?.access, "public", "Rust source publish access");
  const serializedDependencies = JSON.stringify({
    dependencies: packedManifest.dependencies,
    optionalDependencies: packedManifest.optionalDependencies,
    peerDependencies: packedManifest.peerDependencies,
  });
  if (/(?:workspace:|file:|link:)/u.test(serializedDependencies)) {
    throw new Error("Rust source tarball contains a local dependency specifier");
  }
  const sourceManifest = JSON.parse(fs.readFileSync(path.join(extracted, "source-manifest.json"), "utf8"));
  assertEqual(sourceManifest.package_version, releaseVersion, "Rust source manifest package version");

  run("cargo", [
    "test",
    "--workspace",
    "--release",
    "--locked",
    "--manifest-path",
    path.join(extracted, "Cargo.toml"),
  ], {
    cwd: extracted,
    env: { ...process.env, CARGO_TARGET_DIR: cargoTargetDir },
  });

  const queryBinary = path.join(
    cargoTargetDir,
    "release",
    process.platform === "win32" ? "fcstd-query.exe" : "fcstd-query",
  );
  const contractResult = run(queryBinary, ["--contract"], { capture: true });
  const contract = JSON.parse(contractResult.stdout);
  assertEqual(contract.protocol, "phoenix-cad-query", "query protocol");
  assertEqual(contract.version?.major, 1, "query protocol major");
  assertEqual(contract.schema?.id, "phoenix-workspace", "workspace schema id");
  assertEqual(contract.schema?.version, 13, "workspace schema version");
  assertEqual(
    contract.schema?.ddl_sha256,
    "116c5bff9c95e6f670b9ecfc52c053ee08e33e9cf1f3f3b46c02888e97643e1c",
    "workspace schema hash",
  );

  process.stdout.write(
    `[verify] ${process.platform}-${process.arch}: ${filename} release tests and query contract passed\n`,
  );
} finally {
  if (process.env.PNW_KEEP_VERIFY_DIR === "1") {
    process.stdout.write(`[verify] kept ${tempRoot}\n`);
  } else {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: options.env ?? process.env,
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

function assertFiles(directory, files) {
  for (const relative of files) {
    const file = path.join(directory, relative);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      throw new Error(`required tarball file is missing: ${relative}`);
    }
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} must equal ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
