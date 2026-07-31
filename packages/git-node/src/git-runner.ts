import { spawn } from "node:child_process";

export interface PnwGitCommandOptions {
  readonly cwd: string;
  readonly gitExecutable?: string;
  readonly env?: Readonly<NodeJS.ProcessEnv>;
  readonly input?: string;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly allowFailure?: boolean;
  /** Cancels the child process and rejects with an AbortError. */
  readonly signal?: AbortSignal;
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
  if (options.signal?.aborted) throw pnwCreateGitAbortError(options.signal.reason);
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
    const onAbort = () => {
      child.kill();
      finish(pnwCreateGitAbortError(options.signal?.reason));
    };
    const finish = (error?: Error, result?: PnwGitCommandResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", onAbort);
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
    options.signal?.addEventListener("abort", onAbort, { once: true });
    if (options.signal?.aborted) {
      onAbort();
      return;
    }
    if (options.input !== undefined) child.stdin.end(options.input, "utf8");
    else child.stdin.end();
  });
}

function pnwCreateGitAbortError(reason: unknown): Error {
  if (reason instanceof Error && reason.name === "AbortError") return reason;
  const error = new Error("Git command was aborted", reason === undefined ? undefined : { cause: reason });
  error.name = "AbortError";
  return error;
}
