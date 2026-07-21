import { spawn } from "node:child_process";

export interface PnwGitCommandOptions {
  readonly cwd: string;
  readonly gitExecutable?: string;
  readonly env?: Readonly<NodeJS.ProcessEnv>;
  readonly input?: string;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly allowFailure?: boolean;
}

export interface PnwGitCommandResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export class PnwGitCommandError extends Error {
  readonly args: readonly string[];
  readonly exitCode: number;
  readonly stderr: string;

  constructor(args: readonly string[], result: PnwGitCommandResult) {
    super(`git ${args.join(" ")} failed with exit code ${result.exitCode}: ${result.stderr.trim()}`);
    this.name = "PnwGitCommandError";
    this.args = [...args];
    this.exitCode = result.exitCode;
    this.stderr = result.stderr;
  }
}

export async function pnwRunGitCommand(
  args: readonly string[],
  options: PnwGitCommandOptions,
): Promise<PnwGitCommandResult> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const maxOutputBytes = options.maxOutputBytes ?? 16 * 1024 * 1024;
  return await new Promise<PnwGitCommandResult>((resolve, reject) => {
    const child = spawn(options.gitExecutable ?? "git", [...args], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outputBytes = 0;
    let settled = false;
    const timeout = setTimeout(() => {
      child.kill();
      finish(new Error(`git command timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    const finish = (error?: Error, result?: PnwGitCommandResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve(result!);
    };
    const append = (target: Buffer[], chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) {
        child.kill();
        finish(new Error(`git command output exceeded ${maxOutputBytes} bytes`));
        return;
      }
      target.push(chunk);
    };
    child.stdout.on("data", (chunk: Buffer) => append(stdout, chunk));
    child.stderr.on("data", (chunk: Buffer) => append(stderr, chunk));
    child.on("error", (error) => finish(error));
    child.on("close", (code) => {
      const result: PnwGitCommandResult = {
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
        exitCode: code ?? -1,
      };
      if (result.exitCode !== 0 && !options.allowFailure) finish(new PnwGitCommandError(args, result));
      else finish(undefined, result);
    });
    if (options.input !== undefined) child.stdin.end(options.input, "utf8");
    else child.stdin.end();
  });
}
