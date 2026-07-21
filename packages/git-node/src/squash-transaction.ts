import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type {
  PnwGitIdentity,
  PnwGitSquashDraft,
  PnwGitSquashWarningCode,
} from "@phoenix-wing/git-core";
import { pnwRunGitCommand, type PnwGitCommandOptions } from "./git-runner.js";
import { pnwAnalyzeGitSquash, pnwReadGitRepository } from "./repository.js";

export interface PnwGitSquashExecutionInput {
  readonly repositoryRoot: string;
  readonly selectedOids: readonly string[];
  readonly expectedHeadOid: string;
  readonly draft: PnwGitSquashDraft;
  /** Warning categories explicitly accepted by the host after a user confirmation. */
  readonly acknowledgedWarnings?: readonly PnwGitSquashWarningCode[];
  readonly gitExecutable?: string;
  readonly tempBaseDirectory?: string;
}

export interface PnwGitSquashExecutionResult {
  readonly oldHeadOid: string;
  readonly newHeadOid: string;
  readonly combinedOid: string;
  readonly backupRef: string;
  readonly rewritten: readonly { readonly oldOid: string; readonly newOid: string }[];
}

export async function pnwExecuteGitSquash(
  input: PnwGitSquashExecutionInput,
): Promise<PnwGitSquashExecutionResult> {
  const analysis = await pnwAnalyzeGitSquash(input.repositoryRoot, input.selectedOids, {
    maxCommits: 10_000,
    gitExecutable: input.gitExecutable,
  });
  const { plan, snapshot } = analysis;
  if (!plan.valid) throw new Error(`Git squash preflight failed: ${plan.blockers.map((item) => item.code).join(", ")}`);
  assertWarningsAcknowledged(plan.warnings.map((item) => item.code), input.acknowledgedWarnings);
  if (snapshot.headOid !== input.expectedHeadOid || plan.oldHeadOid !== input.expectedHeadOid) {
    throw new Error(`HEAD changed: expected ${input.expectedHeadOid}, got ${snapshot.headOid}`);
  }
  if (!plan.currentRef || !plan.baseParentOid || !plan.selectedTipTreeOid || !plan.finalTreeOid) {
    throw new Error("Git squash plan is incomplete");
  }

  const branchName = sanitizeRefPart(plan.currentRef.slice("refs/heads/".length)) || "branch";
  let backupRef = "";
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const temporaryRef = `refs/kt-auto-code/tmp/${id}`;
  const rootOptions: PnwGitCommandOptions = { cwd: snapshot.root, gitExecutable: input.gitExecutable };
  const tempDirectory = await mkdtemp(path.join(input.tempBaseDirectory ?? os.tmpdir(), "pnw-git-squash-"));
  let branchUpdated = false;
  let tempWorktreeAdded = false;
  let combinedOid = "";
  const rewritten: { oldOid: string; newOid: string }[] = [];
  try {
    backupRef = await createNumberedRef(rootOptions, `refs/kt-auto-code/backup/${branchName}`, snapshot.headOid);
    await createRef(rootOptions, temporaryRef, plan.baseParentOid);
    await pnwRunGitCommand(["worktree", "add", "--detach", tempDirectory, plan.baseParentOid], rootOptions);
    tempWorktreeAdded = true;
    const tempOptions: PnwGitCommandOptions = { cwd: tempDirectory, gitExecutable: input.gitExecutable, timeoutMs: 120_000 };

    for (const oid of plan.selectedOids) {
      await pnwRunGitCommand(["cherry-pick", "--no-commit", oid], tempOptions);
    }
    await createCommit(tempOptions, input.draft.message, input.draft.author, input.draft.committer);
    combinedOid = await readHead(tempOptions);
    await assertTree(tempOptions, combinedOid, plan.selectedTipTreeOid);
    await pnwRunGitCommand(["update-ref", temporaryRef, combinedOid, plan.baseParentOid], rootOptions);

    for (const oldOid of plan.replayOids) {
      const original = snapshot.history.find((commit) => commit.oid === oldOid);
      if (!original) throw new Error(`Missing replay commit ${oldOid}`);
      await pnwRunGitCommand(["cherry-pick", "--no-commit", oldOid], tempOptions);
      const message = original.body.trim() ? `${original.subject}\n\n${original.body}` : original.subject;
      await createCommit(tempOptions, message, original.author, original.committer);
      const newOid = await readHead(tempOptions);
      await assertTree(tempOptions, newOid, original.treeOid);
      const previous = rewritten.at(-1)?.newOid ?? combinedOid;
      await pnwRunGitCommand(["update-ref", temporaryRef, newOid, previous], rootOptions);
      rewritten.push({ oldOid, newOid });
    }

    const newHeadOid = rewritten.at(-1)?.newOid ?? combinedOid;
    await assertTree(tempOptions, newHeadOid, plan.finalTreeOid);
    const finalAnalysis = await pnwAnalyzeGitSquash(snapshot.root, input.selectedOids, {
      maxCommits: 10_000,
      gitExecutable: input.gitExecutable,
      ignoredRefNames: [backupRef, temporaryRef],
    });
    if (!finalAnalysis.plan.valid || finalAnalysis.snapshot.headOid !== snapshot.headOid) {
      throw new Error(`Git squash final preflight failed: ${finalAnalysis.plan.blockers.map((item) => item.code).join(", ") || "HEAD changed"}`);
    }
    assertWarningsAcknowledged(finalAnalysis.plan.warnings.map((item) => item.code), input.acknowledgedWarnings);
    const status = await pnwRunGitCommand(["status", "--porcelain=v2", "-z", "--untracked-files=normal"], rootOptions);
    if (status.stdout.length !== 0) throw new Error("Current worktree changed during Git squash");
    await pnwRunGitCommand([
      "update-ref", "--create-reflog", "-m", "kt-auto-code: combine local commits",
      plan.currentRef, newHeadOid, snapshot.headOid,
    ], rootOptions);
    branchUpdated = true;
    try {
      await verifyUpdatedBranch(rootOptions, plan.currentRef, newHeadOid, plan.finalTreeOid);
    } catch (error) {
      const rollback = await pnwRunGitCommand([
        "update-ref", "--create-reflog", "-m", "kt-auto-code: restore after failed verification",
        plan.currentRef, snapshot.headOid, newHeadOid,
      ], { ...rootOptions, allowFailure: true });
      if (rollback.exitCode === 0) {
        branchUpdated = false;
        throw new Error(`Git squash final verification failed; original branch restored: ${messageOf(error)}`);
      }
      throw new Error(
        `Git squash final verification failed and automatic restore failed; backup retained at ${backupRef}: ${messageOf(error)}; ${rollback.stderr.trim()}`,
      );
    }
    return { oldHeadOid: snapshot.headOid, newHeadOid, combinedOid, backupRef, rewritten };
  } finally {
    if (tempWorktreeAdded) {
      await pnwRunGitCommand(["worktree", "remove", "--force", tempDirectory], { ...rootOptions, allowFailure: true });
    }
    await rm(tempDirectory, { recursive: true, force: true });
    await pnwRunGitCommand(["update-ref", "-d", temporaryRef], { ...rootOptions, allowFailure: true });
    if (!branchUpdated && backupRef) {
      await pnwRunGitCommand(["update-ref", "-d", backupRef, snapshot.headOid], { ...rootOptions, allowFailure: true });
    }
  }
}

const ZERO_OID = "0000000000000000000000000000000000000000";

async function createRef(options: PnwGitCommandOptions, refName: string, oid: string): Promise<void> {
  await pnwRunGitCommand(["update-ref", refName, oid, ZERO_OID], options);
}

async function createNumberedRef(
  options: PnwGitCommandOptions,
  baseRef: string,
  oid: string,
): Promise<string> {
  for (let number = 1; number <= 10_000; number += 1) {
    const candidate = number === 1 ? baseRef : `${baseRef}-${number}`;
    const result = await pnwRunGitCommand(
      ["update-ref", candidate, oid, ZERO_OID],
      { ...options, allowFailure: true },
    );
    if (result.exitCode === 0) return candidate;
    const existing = await pnwRunGitCommand(["show-ref", "--verify", "--quiet", candidate], {
      ...options,
      allowFailure: true,
    });
    if (existing.exitCode !== 0) throw new Error(`Cannot create Git backup ref ${candidate}: ${result.stderr.trim()}`);
  }
  throw new Error(`Cannot allocate a numbered Git backup ref below ${baseRef}`);
}

function sanitizeRefPart(value: string): string {
  return value
    .replace(/[^A-Za-z0-9._/-]+/gu, "-")
    .replace(/\.{2,}/gu, ".")
    .replace(/\/@\{/gu, "/-")
    .replace(/^[-/.]+|[-/.]+$/gu, "")
    .replace(/\.lock(?=\/|$)/gu, "-lock");
}

function assertWarningsAcknowledged(
  warnings: readonly PnwGitSquashWarningCode[],
  acknowledged: readonly PnwGitSquashWarningCode[] | undefined,
): void {
  const accepted = new Set(acknowledged ?? []);
  const missing = [...new Set(warnings)].filter((warning) => !accepted.has(warning));
  if (missing.length > 0) throw new Error(`Git squash warnings require acknowledgement: ${missing.join(", ")}`);
}

export async function pnwUndoGitSquash(
  repositoryRoot: string,
  currentRef: string,
  expectedNewHeadOid: string,
  backupRef: string,
  gitExecutable?: string,
): Promise<string> {
  const options: PnwGitCommandOptions = { cwd: repositoryRoot, gitExecutable };
  const snapshot = await pnwReadGitRepository(repositoryRoot, { gitExecutable });
  if (!snapshot.clean
    || snapshot.operationState !== "idle"
    || snapshot.currentRef !== currentRef
    || snapshot.headOid !== expectedNewHeadOid) {
    throw new Error("Git squash undo preflight failed: HEAD, branch, worktree or operation state changed");
  }
  const backupOid = (await pnwRunGitCommand(["rev-parse", backupRef], options)).stdout.trim();
  await pnwRunGitCommand([
    "update-ref", "--create-reflog", "-m", "kt-auto-code: undo local commit combine",
    currentRef, backupOid, expectedNewHeadOid,
  ], options);
  await pnwRunGitCommand(["update-ref", "-d", backupRef, backupOid], options);
  return backupOid;
}

async function createCommit(
  options: PnwGitCommandOptions,
  message: string,
  author: PnwGitIdentity,
  committer: PnwGitIdentity,
): Promise<void> {
  await pnwRunGitCommand(["commit", "--allow-empty", "--no-verify", "--no-gpg-sign", "--file=-"], {
    ...options,
    input: message.endsWith("\n") ? message : `${message}\n`,
    env: {
      GIT_AUTHOR_NAME: author.name,
      GIT_AUTHOR_EMAIL: author.email,
      GIT_AUTHOR_DATE: author.date,
      GIT_COMMITTER_NAME: committer.name,
      GIT_COMMITTER_EMAIL: committer.email,
      GIT_COMMITTER_DATE: committer.date,
    },
  });
}

async function readHead(options: PnwGitCommandOptions): Promise<string> {
  return (await pnwRunGitCommand(["rev-parse", "HEAD"], options)).stdout.trim();
}

async function assertTree(options: PnwGitCommandOptions, oid: string, expectedTreeOid: string): Promise<void> {
  const treeOid = (await pnwRunGitCommand(["rev-parse", `${oid}^{tree}`], options)).stdout.trim();
  if (treeOid !== expectedTreeOid) throw new Error(`Tree mismatch for ${oid}: expected ${expectedTreeOid}, got ${treeOid}`);
}

async function verifyUpdatedBranch(
  options: PnwGitCommandOptions,
  currentRef: string,
  expectedHeadOid: string,
  expectedTreeOid: string,
): Promise<void> {
  const symbolicRef = (await pnwRunGitCommand(["symbolic-ref", "-q", "HEAD"], options)).stdout.trim();
  const refOid = (await pnwRunGitCommand(["rev-parse", "--verify", currentRef], options)).stdout.trim();
  const headOid = await readHead(options);
  if (symbolicRef !== currentRef || refOid !== expectedHeadOid || headOid !== expectedHeadOid) {
    throw new Error(`ref/HEAD mismatch: symbolic=${symbolicRef}, ref=${refOid}, HEAD=${headOid}`);
  }
  await assertTree(options, headOid, expectedTreeOid);
  const indexTreeOid = (await pnwRunGitCommand(["write-tree"], options)).stdout.trim();
  if (indexTreeOid !== expectedTreeOid) {
    throw new Error(`index tree mismatch: expected ${expectedTreeOid}, got ${indexTreeOid}`);
  }
  const status = await pnwRunGitCommand(["status", "--porcelain=v2", "-z", "--untracked-files=normal"], options);
  if (status.stdout.length !== 0) throw new Error("current worktree or index changed after ref update");
  const reflogHead = (await pnwRunGitCommand(["reflog", "show", "--format=%H", "-1", currentRef], options)).stdout.trim();
  if (reflogHead !== expectedHeadOid) {
    throw new Error(`reflog mismatch: expected ${expectedHeadOid}, got ${reflogHead || "(empty)"}`);
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
