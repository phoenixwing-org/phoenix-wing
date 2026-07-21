import { access } from "node:fs/promises";
import path from "node:path";
import {
  pnwCreateGitSquashDraft,
  pnwPlanGitSquash,
  type PnwGitCommitRecord,
  type PnwGitIdentity,
  type PnwGitOperationState,
  type PnwGitRefTarget,
  type PnwGitSquashDraft,
  type PnwGitSquashPlan,
} from "@phoenix-wing/git-core";
import { pnwRunGitCommand, type PnwGitCommandOptions } from "./git-runner.js";

export interface PnwGitRepositorySnapshot {
  readonly root: string;
  readonly name: string;
  readonly currentRef?: string;
  readonly branch?: string;
  readonly upstream?: string;
  readonly remoteUrl?: string;
  readonly headOid: string;
  readonly detached: boolean;
  readonly clean: boolean;
  readonly operationState: PnwGitOperationState;
  readonly history: readonly PnwGitCommitRecord[];
  readonly remoteReachableOids: readonly string[];
  readonly refTargets: readonly PnwGitRefTarget[];
}

export interface PnwGitSquashAnalysis {
  readonly snapshot: PnwGitRepositorySnapshot;
  readonly plan: PnwGitSquashPlan;
  readonly draft?: PnwGitSquashDraft;
}

export interface PnwGitRepositoryReadOptions {
  readonly maxCommits?: number;
  readonly gitExecutable?: string;
  /** Internal transaction refs that must not block a final repeated preflight. */
  readonly ignoredRefNames?: readonly string[];
}

export async function pnwFindGitRepositoryRoot(
  startPath: string,
  gitExecutable?: string,
): Promise<string> {
  const result = await pnwRunGitCommand(["rev-parse", "--show-toplevel"], { cwd: startPath, gitExecutable });
  return path.resolve(result.stdout.trim());
}

export async function pnwReadGitRepository(
  startPath: string,
  options: PnwGitRepositoryReadOptions = {},
): Promise<PnwGitRepositorySnapshot> {
  const root = await pnwFindGitRepositoryRoot(startPath, options.gitExecutable);
  const commandOptions: PnwGitCommandOptions = { cwd: root, gitExecutable: options.gitExecutable };
  const headOid = (await pnwRunGitCommand(["rev-parse", "HEAD"], commandOptions)).stdout.trim();
  const symbolic = await pnwRunGitCommand(["symbolic-ref", "-q", "HEAD"], { ...commandOptions, allowFailure: true });
  const currentRef = symbolic.exitCode === 0 ? symbolic.stdout.trim() : undefined;
  const branch = currentRef?.startsWith("refs/heads/") ? currentRef.slice("refs/heads/".length) : undefined;
  const upstreamResult = await pnwRunGitCommand(
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
    { ...commandOptions, allowFailure: true },
  );
  const upstream = upstreamResult.exitCode === 0 ? upstreamResult.stdout.trim() : "";
  const remoteName = upstream.includes("/") ? upstream.slice(0, upstream.indexOf("/")) : "origin";
  const remoteUrlResult = await pnwRunGitCommand(
    ["remote", "get-url", remoteName || "origin"],
    { ...commandOptions, allowFailure: true },
  );
  const status = await pnwRunGitCommand(["status", "--porcelain=v2", "-z", "--untracked-files=normal"], commandOptions);
  const revList = await pnwRunGitCommand(
    ["rev-list", "--first-parent", "--reverse", `--max-count=${options.maxCommits ?? 200}`, "HEAD"],
    commandOptions,
  );
  const history: PnwGitCommitRecord[] = [];
  for (const oid of lines(revList.stdout)) history.push(await readCommit(oid, commandOptions));
  const remoteResult = await pnwRunGitCommand(["rev-list", "--remotes"], { ...commandOptions, allowFailure: true });
  const refsResult = await pnwRunGitCommand(
    ["for-each-ref", "--format=%(refname)%00%(objectname)%00%(*objectname)"],
    commandOptions,
  );
  return {
    root,
    name: path.basename(root),
    ...(currentRef ? { currentRef } : {}),
    ...(branch ? { branch } : {}),
    ...(upstream ? { upstream } : {}),
    ...(remoteUrlResult.exitCode === 0 && remoteUrlResult.stdout.trim()
      ? { remoteUrl: remoteUrlResult.stdout.trim() }
      : {}),
    headOid,
    detached: !currentRef,
    clean: status.stdout.length === 0,
    operationState: await readOperationState(root, commandOptions),
    history,
    remoteReachableOids: remoteResult.exitCode === 0 ? lines(remoteResult.stdout) : [],
    refTargets: parseRefTargets(refsResult.stdout),
  };
}

export async function pnwAnalyzeGitSquash(
  startPath: string,
  selectedOids: readonly string[],
  options: PnwGitRepositoryReadOptions = {},
): Promise<PnwGitSquashAnalysis> {
  const snapshot = await pnwReadGitRepository(startPath, options);
  const ignoredRefNames = new Set(options.ignoredRefNames ?? []);
  const visibleRefTargets = snapshot.refTargets.filter((target) => !ignoredRefNames.has(target.name));
  const preliminary = pnwPlanGitSquash({
    history: snapshot.history,
    selectedOids,
    currentRef: snapshot.currentRef,
    detached: snapshot.detached,
    clean: snapshot.clean,
    operationState: snapshot.operationState,
    remoteReachableOids: snapshot.remoteReachableOids,
    refTargets: visibleRefTargets,
  });
  const reachableRefTargets = await readReachableLocalRefTargets(
    snapshot.root,
    preliminary.affectedOids,
    snapshot.currentRef,
    visibleRefTargets,
    options.gitExecutable,
  );
  const plan = pnwPlanGitSquash({
    history: snapshot.history,
    selectedOids,
    currentRef: snapshot.currentRef,
    detached: snapshot.detached,
    clean: snapshot.clean,
    operationState: snapshot.operationState,
    remoteReachableOids: snapshot.remoteReachableOids,
    refTargets: [...visibleRefTargets, ...reachableRefTargets],
  });
  return {
    snapshot,
    plan,
    ...(plan.valid ? { draft: pnwCreateGitSquashDraft(snapshot.history, plan.selectedOids) } : {}),
  };
}

async function readReachableLocalRefTargets(
  root: string,
  affectedOids: readonly string[],
  currentRef: string | undefined,
  refTargets: readonly PnwGitRefTarget[],
  gitExecutable: string | undefined,
): Promise<PnwGitRefTarget[]> {
  if (affectedOids.length === 0) return [];
  const affected = new Set(affectedOids);
  const localRefs = [...new Set(refTargets.map((target) => target.name))]
    .filter((name) => name !== currentRef && (name.startsWith("refs/heads/") || name.startsWith("refs/tags/")));
  const options: PnwGitCommandOptions = { cwd: root, gitExecutable };
  const occupied: PnwGitRefTarget[] = [];
  for (const refName of localRefs) {
    const reachable = await pnwRunGitCommand(["rev-list", refName], options);
    for (const oid of lines(reachable.stdout)) {
      if (affected.has(oid)) occupied.push({ name: refName, oid });
    }
  }
  return occupied;
}

async function readCommit(oid: string, options: PnwGitCommandOptions): Promise<PnwGitCommitRecord> {
  const raw = (await pnwRunGitCommand(["cat-file", "-p", oid], options)).stdout;
  const separator = raw.indexOf("\n\n");
  if (separator < 0) throw new Error(`Commit ${oid} has no header/message separator`);
  const headerLines = raw.slice(0, separator).split("\n");
  const message = raw.slice(separator + 2).replace(/\n$/u, "");
  const headers = new Map<string, string[]>();
  let currentKey: string | undefined;
  for (const line of headerLines) {
    if (line.startsWith(" ") && currentKey) {
      const values = headers.get(currentKey)!;
      values[values.length - 1] = `${values.at(-1)}\n${line}`;
      continue;
    }
    const space = line.indexOf(" ");
    if (space <= 0) continue;
    currentKey = line.slice(0, space);
    const values = headers.get(currentKey) ?? [];
    values.push(line.slice(space + 1));
    headers.set(currentKey, values);
  }
  const [subject = "", empty, ...bodyLines] = message.split(/\r?\n/u);
  const body = empty === "" ? bodyLines.join("\n") : [empty, ...bodyLines].filter((value) => value !== undefined).join("\n");
  const knownHeaders = new Set(["tree", "parent", "author", "committer", "gpgsig", "gpgsig-sha256"]);
  return {
    oid,
    parentOids: headers.get("parent") ?? [],
    treeOid: requireHeader(headers, "tree", oid),
    author: parseIdentity(requireHeader(headers, "author", oid)),
    committer: parseIdentity(requireHeader(headers, "committer", oid)),
    subject,
    body,
    hasSignature: headers.has("gpgsig") || headers.has("gpgsig-sha256"),
    extraHeaders: [...headers.keys()].filter((key) => !knownHeaders.has(key)),
  };
}

function parseIdentity(value: string): PnwGitIdentity {
  const match = /^(.*) <([^<>]*)> (\d+) ([+-]\d{4})$/u.exec(value);
  if (!match) throw new Error(`Unsupported Git identity: ${value}`);
  return { name: match[1]!, email: match[2]!, date: `${match[3]} ${match[4]}` };
}

function requireHeader(headers: ReadonlyMap<string, readonly string[]>, key: string, oid: string): string {
  const value = headers.get(key)?.[0];
  if (!value) throw new Error(`Commit ${oid} is missing ${key}`);
  return value;
}

function parseRefTargets(output: string): PnwGitRefTarget[] {
  return lines(output).flatMap((line) => {
    const [name, oid, peeled] = line.split("\0");
    if (!name || !oid) return [];
    return [{ name, oid: peeled || oid }];
  });
}

async function readOperationState(root: string, options: PnwGitCommandOptions): Promise<PnwGitOperationState> {
  const checks: readonly [PnwGitOperationState, string[]][] = [
    ["merge", ["MERGE_HEAD"]],
    ["rebase", ["rebase-merge", "rebase-apply"]],
    ["cherry-pick", ["CHERRY_PICK_HEAD"]],
    ["revert", ["REVERT_HEAD"]],
    ["bisect", ["BISECT_LOG"]],
  ];
  for (const [state, names] of checks) {
    for (const name of names) {
      const gitPath = (await pnwRunGitCommand(["rev-parse", "--git-path", name], options)).stdout.trim();
      try {
        await access(path.resolve(root, gitPath));
        return state;
      } catch {
        // Continue checking operation markers.
      }
    }
  }
  return "idle";
}

function lines(value: string): string[] {
  return value.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
}
