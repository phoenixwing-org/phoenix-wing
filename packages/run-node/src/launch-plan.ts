import path from "node:path";
import type { PnwRunPlatform, PnwRunTarget } from "@phoenix-wing/run-core";

export interface PnwRunNodeLaunchPlan {
  readonly program: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
  readonly problemMatchers: readonly string[];
}

export interface PnwBundledCaaLaunchOptions {
  readonly platform: PnwRunPlatform;
  readonly resourceRoot: string;
  readonly caaVersion: string;
  readonly relatedProjectRoots?: readonly string[];
}

export interface PnwBundledClangFormatLaunchOptions {
  readonly resourceRoot: string;
  readonly runtimeProgram: string;
}

export function pnwCreateBundledCaaLaunchPlan(
  target: PnwRunTarget,
  options: PnwBundledCaaLaunchOptions,
): PnwRunNodeLaunchPlan {
  if (target.sourceKind !== "bundled" || (target.action !== "caa-build" && target.action !== "caa-run")) {
    throw new Error(`Target ${target.id} is not a bundled CAA action`);
  }
  if (options.platform !== "win32") throw new Error("CAA bundled runner is Windows-only");
  if (!/^\d{2,4}$/u.test(options.caaVersion)) throw new Error(`Invalid CAA version: ${options.caaVersion}`);
  assertSafeCaaPath(target.cwd, "project");
  const runner = path.resolve(options.resourceRoot, "caa", "pnw-caa-runner.cmd");
  const args = [
    "/d",
    "/s",
    "/c",
    runner,
    target.action === "caa-build" ? "mk" : "run",
    "--project",
    target.cwd,
    "--version",
    options.caaVersion,
  ];
  for (const related of uniqueCaaPaths(options.relatedProjectRoots ?? [], target.cwd)) {
    assertSafeCaaPath(related, "related project");
    args.push("--preq", related);
  }
  return {
    program: "cmd.exe",
    args,
    cwd: target.cwd,
    env: { CAA_MK_VERSION: options.caaVersion },
    problemMatchers: target.problemMatchers,
  };
}

export function pnwCreateBundledClangFormatLaunchPlan(
  target: PnwRunTarget,
  options: PnwBundledClangFormatLaunchOptions,
): PnwRunNodeLaunchPlan {
  if (target.sourceKind !== "bundled" || target.action !== "clang-format") {
    throw new Error(`Target ${target.id} is not a bundled Clang Format action`);
  }
  if (!path.isAbsolute(target.cwd)) throw new Error(`Invalid Clang Format project path: ${target.cwd}`);
  const runner = path.resolve(options.resourceRoot, "format", "pnw-clang-format-runner.cjs");
  return {
    program: options.runtimeProgram,
    args: [runner, "--project", target.cwd],
    cwd: target.cwd,
    env: { ELECTRON_RUN_AS_NODE: "1" },
    problemMatchers: target.problemMatchers,
  };
}

function uniqueCaaPaths(values: readonly string[], projectRoot: string): string[] {
  const projectKey = caaPathKey(projectRoot);
  const unique = new Map<string, string>();
  for (const value of values) {
    const key = caaPathKey(value);
    if (key !== projectKey && !unique.has(key)) unique.set(key, value);
  }
  return [...unique.values()].sort((left, right) => left.localeCompare(right));
}

function caaPathKey(value: string): string {
  return value.replaceAll("/", "\\").replace(/\\+$/u, "").toLocaleLowerCase();
}

function assertSafeCaaPath(value: string, label: string): void {
  const absolute = path.win32.isAbsolute(value) || path.posix.isAbsolute(value);
  if (!absolute || /[;"&|<>^%\r\n]/u.test(value)) throw new Error(`Invalid CAA ${label} path: ${value}`);
}
