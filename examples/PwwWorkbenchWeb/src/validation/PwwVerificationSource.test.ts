import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { pwwReadVerificationSource } from "../../tooling/PwwVerificationSource.js";

const pwwTemporary: string[] = [];
function pwwRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pww-source-test-"));
  pwwTemporary.push(root);
  return root;
}
function pwwPackage(root: string, version = "0.7.5"): void {
  fs.mkdirSync(path.join(root, "dist"), { recursive: true });
  fs.writeFileSync(path.join(root, "dist/index.js"), "export const PNW_VERSION = 'test';\n");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "phoenix-wing", version, exports: "./dist/index.js", type: "module" }));
}
function pwwRegistry(root: string, version = "0.7.5"): void {
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "phoenix-wing-example-registry", dependencies: { "phoenix-wing": version } }));
  pwwPackage(path.join(root, "node_modules/phoenix-wing"));
}
afterEach(() => { for (const root of pwwTemporary.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

describe("example verification source comes from package resolution", () => {
  it("reports development HEAD/branch and detects dirty without publishing machine paths", () => {
    const root = pwwRoot();
    pwwPackage(root);
    const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
    git("init", "-b", "sample"); git("add", ".");
    git("-c", "user.name=Sample", "-c", "user.email=sample@example.invalid", "commit", "-m", "sample");
    const clean = pwwReadVerificationSource(root);
    expect(clean).toMatchObject({ mode: "development", version: "0.7.5", branch: "sample", dirty: false });
    expect(JSON.stringify(clean)).not.toContain(root);
    fs.writeFileSync(path.join(root, "pending.txt"), "pending");
    expect(pwwReadVerificationSource(root)).toMatchObject({ dirty: true });
  });
  it("reports Registry only from exact standalone node_modules", () => {
    const root = pwwRoot(); pwwRegistry(root);
    expect(pwwReadVerificationSource(root)).toMatchObject({ mode: "registry", version: "0.7.5" });
    expect(pwwReadVerificationSource(root)).not.toHaveProperty("commit");
  });
  it("rejects non-exact requests and mismatched installed versions", () => {
    const range = pwwRoot(); pwwRegistry(range, "^0.7.5");
    expect(() => pwwReadVerificationSource(range)).toThrow("exact");
    const mismatch = pwwRoot(); pwwRegistry(mismatch, "0.7.4");
    expect(() => pwwReadVerificationSource(mismatch)).toThrow("differs");
  });
  it("rejects local symlinks masquerading as Registry installation", () => {
    const root = pwwRoot(); pwwRegistry(root);
    const outside = pwwRoot(); pwwPackage(outside);
    fs.rmSync(path.join(root, "node_modules/phoenix-wing"), { recursive: true });
    fs.symlinkSync(outside, path.join(root, "node_modules/phoenix-wing"), "junction");
    expect(() => pwwReadVerificationSource(root)).toThrow("outside");
  });
  it("fails closed for unknown hosts", () => {
    const root = pwwRoot(); pwwRegistry(root);
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "unverified" }));
    expect(() => pwwReadVerificationSource(root)).toThrow("Unknown");
  });
});
