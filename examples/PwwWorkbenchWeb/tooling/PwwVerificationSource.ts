import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import type { PwwVerificationSource } from "../src/validation/PwwVerificationSource.js";

/** Read the resolved package, never an environment/query-string mode label. */
export function pwwReadVerificationSource(projectRoot: string): PwwVerificationSource {
  const root = fs.realpathSync(projectRoot);
  const manifestPath = path.join(root, "package.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const entry = fs.realpathSync(createRequire(manifestPath).resolve("phoenix-wing"));
  const checkedAt = new Date().toISOString();
  if (manifest.name === "phoenix-wing") {
    if (entry !== fs.realpathSync(path.join(root, "dist/index.js"))) {
      throw new Error("Development example must resolve this checkout's public dist entry");
    }
    const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
    return {
      mode: "development", version: manifest.version, checkedAt,
      commit: git("rev-parse", "HEAD"), branch: git("branch", "--show-current") || "detached",
      dirty: Boolean(git("status", "--porcelain")),
    };
  }
  const tarball = manifest.name === "phoenix-wing-example-tarball";
  if (!tarball && manifest.name !== "phoenix-wing-example-registry") {
    throw new Error("Unknown example host: cannot certify dependency source");
  }
  const expected = tarball ? manifest.pwwExpectedWingVersion : manifest.dependencies?.["phoenix-wing"];
  if (tarball && manifest.dependencies?.["phoenix-wing"] !== "file:wing-candidate.tgz") {
    throw new Error("Tarball example must use its local candidate archive");
  }
  if (!/^\d+\.\d+\.\d+$/.test(expected ?? "")) throw new Error("Registry version must be exact");
  const modules = path.join(root, "node_modules");
  if (!entry.startsWith(modules + path.sep)) throw new Error("Registry example resolved outside its isolated node_modules");
  let directory = path.dirname(entry);
  while (directory.startsWith(modules + path.sep)) {
    const file = path.join(directory, "package.json");
    if (fs.existsSync(file)) {
      const installed = JSON.parse(fs.readFileSync(file, "utf8"));
      if (installed.name === "phoenix-wing") {
        if (installed.version !== expected) throw new Error("Installed Registry version differs from exact request");
        if (tarball) {
          const archive = fs.realpathSync(path.join(root, "wing-candidate.tgz"));
          if (archive !== path.join(root, "wing-candidate.tgz")) throw new Error("Tarball archive must not be a symlink");
          return { mode: "tarball", version: installed.version, checkedAt,
            sha256: createHash("sha256").update(fs.readFileSync(archive)).digest("hex") };
        }
        return { mode: "registry", version: installed.version, checkedAt };
      }
    }
    directory = path.dirname(directory);
  }
  throw new Error("Resolved Wing manifest not found");
}
