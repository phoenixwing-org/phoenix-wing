import { realpath } from "node:fs/promises";
import type { PnwGitCommitSummary, PnwGitIdentity } from "@phoenix-wing/git-core";
import { pnwRunGitCommand, type PnwGitCommandOptions } from "./git-runner.js";
import { pnwFindGitRepositoryRoot } from "./repository.js";

export interface PnwGitRepositorySummaryReadOptions {
  /** Number of newest first-parent commits to include. Defaults to 1. */
  readonly maxCommits?: number;
  /** Resolve and include one remote URL. No remote command runs when false. */
  readonly includeRemoteUrl?: boolean;
  readonly gitExecutable?: string;
  readonly signal?: AbortSignal;
}

/** Lightweight repository identity and newest-first history for list UIs. */
export interface PnwGitRepositorySummary {
  readonly root: string;
  readonly headOid: string;
  readonly currentRef?: string;
  readonly branch?: string;
  readonly upstream?: string;
  readonly remoteUrl?: string;
  readonly commits: readonly PnwGitCommitSummary[];
}

export interface PnwGitCommitPageReadOptions {
  /** HEAD observed by the caller. The read fails if the repository has moved. */
  readonly expectedHeadOid: string;
  /** Opaque OID returned as nextBeforeOid by the preceding page, excluded from this page. */
  readonly beforeOid?: string;
  /** Maximum commits returned. Defaults to 50; accepted range is 1..1000. */
  readonly limit?: number;
  readonly gitExecutable?: string;
  readonly signal?: AbortSignal;
}

export interface PnwGitCommitPage {
  readonly headOid: string;
  /** First-parent commits ordered newest to oldest. */
  readonly commits: readonly PnwGitCommitSummary[];
  /** Pass this OID as beforeOid to read the next page. Present only when hasMore is true. */
  readonly nextBeforeOid?: string;
  readonly hasMore: boolean;
}

const PNW_GIT_LOG_FORMAT = "%H%x00%an%x00%ae%x00%at%x00%ai%x00%cn%x00%ce%x00%ct%x00%ci%x00%s%x00%b";
const PNW_GIT_LOG_FIELD_COUNT = 11;

export async function pnwReadGitRepositorySummary(
  startPath: string,
  options: PnwGitRepositorySummaryReadOptions = {},
): Promise<PnwGitRepositorySummary> {
  const limit = pnwValidateGitReadLimit(options.maxCommits ?? 1, "maxCommits");
  const root = await pnwCanonicalGitRoot(startPath, options.gitExecutable, options.signal);
  const commandOptions = pnwGitReadCommandOptions(root, options.gitExecutable, options.signal);
  const headOid = pnwNormalizeFullGitOid(
    (await pnwRunGitCommand(["rev-parse", "--verify", "HEAD"], commandOptions)).stdout.trim(),
    "HEAD",
  );
  const symbolic = await pnwRunGitCommand(
    ["symbolic-ref", "-q", "HEAD"],
    { ...commandOptions, allowFailure: true },
  );
  const currentRef = symbolic.exitCode === 0 ? symbolic.stdout.trim() : undefined;
  const branch = currentRef?.startsWith("refs/heads/")
    ? currentRef.slice("refs/heads/".length)
    : undefined;
  const upstreamResult = currentRef
    ? await pnwRunGitCommand(
      ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
      { ...commandOptions, allowFailure: true },
    )
    : undefined;
  const upstream = upstreamResult?.exitCode === 0 ? upstreamResult.stdout.trim() || undefined : undefined;
  const commits = await pnwReadGitCommitSummaries(commandOptions, headOid, limit);

  let remoteUrl: string | undefined;
  if (options.includeRemoteUrl === true) {
    const remoteName = upstream?.includes("/") ? upstream.slice(0, upstream.indexOf("/")) : "origin";
    const remoteResult = await pnwRunGitCommand(
      ["remote", "get-url", remoteName || "origin"],
      { ...commandOptions, allowFailure: true },
    );
    remoteUrl = remoteResult.exitCode === 0 ? remoteResult.stdout.trim() || undefined : undefined;
  }

  return {
    root,
    headOid,
    ...(currentRef ? { currentRef } : {}),
    ...(branch ? { branch } : {}),
    ...(upstream ? { upstream } : {}),
    ...(remoteUrl ? { remoteUrl } : {}),
    commits,
  };
}

export async function pnwReadGitCommitPage(
  startPath: string,
  options: PnwGitCommitPageReadOptions,
): Promise<PnwGitCommitPage> {
  const expectedHeadOid = pnwNormalizeFullGitOid(options.expectedHeadOid, "expectedHeadOid");
  const beforeOid = options.beforeOid === undefined
    ? undefined
    : pnwNormalizeFullGitOid(options.beforeOid, "beforeOid");
  const limit = pnwValidateGitReadLimit(options.limit ?? 50, "limit");
  const root = await pnwCanonicalGitRoot(startPath, options.gitExecutable, options.signal);
  const commandOptions = pnwGitReadCommandOptions(root, options.gitExecutable, options.signal);
  const headOid = pnwNormalizeFullGitOid(
    (await pnwRunGitCommand(["rev-parse", "--verify", "HEAD"], commandOptions)).stdout.trim(),
    "HEAD",
  );
  if (headOid !== expectedHeadOid) {
    throw new Error(`Git HEAD changed: expected ${expectedHeadOid}, got ${headOid}`);
  }
  if (beforeOid) {
    const ancestor = await pnwRunGitCommand(
      ["merge-base", "--is-ancestor", beforeOid, expectedHeadOid],
      { ...commandOptions, allowFailure: true },
    );
    if (ancestor.exitCode !== 0) throw new Error(`Git commit cursor is not reachable from expected HEAD: ${beforeOid}`);
  }

  const candidates = await pnwReadGitCommitSummaries(
    commandOptions,
    beforeOid ?? expectedHeadOid,
    limit + 1,
    beforeOid === undefined ? 0 : 1,
  );
  const hasMore = candidates.length > limit;
  const commits = candidates.slice(0, limit);
  const nextBeforeOid = hasMore ? commits.at(-1)?.oid : undefined;
  return {
    headOid,
    commits,
    ...(nextBeforeOid ? { nextBeforeOid } : {}),
    hasMore,
  };
}

async function pnwCanonicalGitRoot(
  startPath: string,
  gitExecutable: string | undefined,
  signal: AbortSignal | undefined,
): Promise<string> {
  const root = await pnwFindGitRepositoryRoot(startPath, gitExecutable, signal);
  return await realpath(root);
}

async function pnwReadGitCommitSummaries(
  options: PnwGitCommandOptions,
  revision: string,
  limit: number,
  skip = 0,
): Promise<PnwGitCommitSummary[]> {
  const result = await pnwRunGitCommand([
    "log",
    "--no-color",
    "--no-decorate",
    "--no-show-signature",
    "--first-parent",
    `--max-count=${limit}`,
    ...(skip > 0 ? [`--skip=${skip}`] : []),
    "-z",
    `--format=${PNW_GIT_LOG_FORMAT}`,
    revision,
  ], options);
  return pnwParseGitCommitSummaries(result.stdout);
}

function pnwParseGitCommitSummaries(output: string): PnwGitCommitSummary[] {
  if (output.length === 0) return [];
  const fields = output.split("\0");
  if (fields.at(-1) === "") fields.pop();
  if (fields.length % PNW_GIT_LOG_FIELD_COUNT !== 0) {
    throw new Error(`Unexpected NUL-delimited git log output: ${fields.length} fields`);
  }
  const commits: PnwGitCommitSummary[] = [];
  for (let offset = 0; offset < fields.length; offset += PNW_GIT_LOG_FIELD_COUNT) {
    const [oid, authorName, authorEmail, authorTime, authorDate, committerName, committerEmail,
      committerTime, committerDate, subject, body] = fields.slice(offset, offset + PNW_GIT_LOG_FIELD_COUNT);
    commits.push({
      oid: pnwNormalizeFullGitOid(oid!, "commit oid"),
      author: pnwParseGitLogIdentity(authorName!, authorEmail!, authorTime!, authorDate!),
      committer: pnwParseGitLogIdentity(committerName!, committerEmail!, committerTime!, committerDate!),
      subject: subject!,
      body: body!.replace(/\n$/u, ""),
    });
  }
  return commits;
}

function pnwParseGitLogIdentity(name: string, email: string, epoch: string, date: string): PnwGitIdentity {
  if (!/^\d+$/u.test(epoch)) throw new Error(`Unsupported Git identity timestamp: ${epoch}`);
  const timezone = /([+-]\d{4})$/u.exec(date)?.[1];
  if (!timezone) throw new Error(`Unsupported Git identity date: ${date}`);
  return { name, email, date: `${epoch} ${timezone}` };
}

function pnwNormalizeFullGitOid(value: string, field: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(normalized)) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
  return normalized;
}

function pnwValidateGitReadLimit(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_000) {
    throw new Error(`${field} must be an integer between 1 and 1000`);
  }
  return value;
}

function pnwGitReadCommandOptions(
  cwd: string,
  gitExecutable: string | undefined,
  signal: AbortSignal | undefined,
): PnwGitCommandOptions {
  return {
    cwd,
    ...(gitExecutable ? { gitExecutable } : {}),
    ...(signal ? { signal } : {}),
  };
}
