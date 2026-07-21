import type {
  PnwGitCommitRecord,
  PnwGitOperationState,
  PnwGitRefTarget,
} from "./types.js";

export type PnwGitSquashBlockerCode =
  | "detached-head"
  | "dirty-worktree"
  | "operation-in-progress"
  | "selection-too-small"
  | "selection-not-found"
  | "selection-not-contiguous"
  | "history-not-linear"
  | "root-commit"
  | "signed-commit"
  | "unsupported-headers";

export type PnwGitSquashWarningCode = "remote-history" | "occupied-ref";

export interface PnwGitSquashBlocker {
  readonly code: PnwGitSquashBlockerCode;
  readonly oid?: string;
  readonly refName?: string;
  readonly operationState?: PnwGitOperationState;
}

export interface PnwGitSquashWarning {
  readonly code: PnwGitSquashWarningCode;
  readonly oid?: string;
  readonly refName?: string;
}

export interface PnwGitSquashPlanInput {
  /** Current branch first-parent history ordered from oldest to HEAD. */
  readonly history: readonly PnwGitCommitRecord[];
  readonly selectedOids: readonly string[];
  readonly currentRef?: string;
  readonly detached: boolean;
  readonly clean: boolean;
  readonly operationState: PnwGitOperationState;
  readonly remoteReachableOids?: readonly string[];
  readonly refTargets?: readonly PnwGitRefTarget[];
}

export interface PnwGitSquashPlan {
  readonly valid: boolean;
  readonly blockers: readonly PnwGitSquashBlocker[];
  readonly warnings: readonly PnwGitSquashWarning[];
  readonly currentRef?: string;
  readonly oldHeadOid?: string;
  readonly baseParentOid?: string;
  readonly selectedOids: readonly string[];
  readonly replayOids: readonly string[];
  readonly affectedOids: readonly string[];
  readonly selectedTipTreeOid?: string;
  readonly finalTreeOid?: string;
}

export interface PnwGitSquashDraft {
  readonly message: string;
  readonly author: PnwGitCommitRecord["author"];
  readonly committer: PnwGitCommitRecord["committer"];
}

export function pnwPlanGitSquash(input: PnwGitSquashPlanInput): PnwGitSquashPlan {
  const blockers: PnwGitSquashBlocker[] = [];
  const warnings: PnwGitSquashWarning[] = [];
  if (input.detached || !input.currentRef) blockers.push({ code: "detached-head" });
  if (!input.clean) blockers.push({ code: "dirty-worktree" });
  if (input.operationState !== "idle") {
    blockers.push({ code: "operation-in-progress", operationState: input.operationState });
  }

  const historyIndex = new Map(input.history.map((commit, index) => [commit.oid, index]));
  const uniqueSelected = [...new Set(input.selectedOids)];
  if (uniqueSelected.length < 2) blockers.push({ code: "selection-too-small" });
  const selectedIndexes = uniqueSelected.map((oid) => historyIndex.get(oid));
  if (selectedIndexes.some((index) => index === undefined)) blockers.push({ code: "selection-not-found" });

  const indexes = selectedIndexes.filter((index): index is number => index !== undefined).sort((a, b) => a - b);
  const oldestIndex = indexes[0];
  const selectedTipIndex = indexes.at(-1);
  if (indexes.length > 1 && indexes.some((index, offset) => index !== indexes[0]! + offset)) {
    blockers.push({ code: "selection-not-contiguous" });
  }

  const selected = oldestIndex === undefined || selectedTipIndex === undefined
    ? []
    : input.history.slice(oldestIndex, selectedTipIndex + 1);
  const affected = oldestIndex === undefined ? [] : input.history.slice(oldestIndex);
  const replay = selectedTipIndex === undefined ? [] : input.history.slice(selectedTipIndex + 1);

  if (affected.length > 0) {
    const oldest = affected[0]!;
    if (oldest.parentOids.length === 0) blockers.push({ code: "root-commit", oid: oldest.oid });
    for (let offset = 0; offset < affected.length; offset += 1) {
      const commit = affected[offset]!;
      if (commit.parentOids.length !== 1) blockers.push({ code: "history-not-linear", oid: commit.oid });
      if (offset > 0 && commit.parentOids[0] !== affected[offset - 1]!.oid) {
        blockers.push({ code: "history-not-linear", oid: commit.oid });
      }
      if (commit.hasSignature) blockers.push({ code: "signed-commit", oid: commit.oid });
      if (commit.extraHeaders.length > 0) blockers.push({ code: "unsupported-headers", oid: commit.oid });
    }
  }

  const affectedSet = new Set(affected.map((commit) => commit.oid));
  for (const oid of input.remoteReachableOids ?? []) {
    if (affectedSet.has(oid)) warnings.push({ code: "remote-history", oid });
  }
  for (const target of input.refTargets ?? []) {
    const isLocalBranchOrTag = target.name.startsWith("refs/heads/") || target.name.startsWith("refs/tags/");
    if (isLocalBranchOrTag && target.name !== input.currentRef && affectedSet.has(target.oid)) {
      warnings.push({ code: "occupied-ref", oid: target.oid, refName: target.name });
    }
  }

  const oldest = selected[0];
  const tip = selected.at(-1);
  const head = input.history.at(-1);
  return {
    valid: blockers.length === 0,
    blockers: dedupeBlockers(blockers),
    warnings: dedupeWarnings(warnings),
    ...(input.currentRef ? { currentRef: input.currentRef } : {}),
    ...(head ? { oldHeadOid: head.oid, finalTreeOid: head.treeOid } : {}),
    ...(oldest?.parentOids[0] ? { baseParentOid: oldest.parentOids[0] } : {}),
    selectedOids: selected.map((commit) => commit.oid),
    replayOids: replay.map((commit) => commit.oid),
    affectedOids: affected.map((commit) => commit.oid),
    ...(tip ? { selectedTipTreeOid: tip.treeOid } : {}),
  };
}

function dedupeWarnings(warnings: readonly PnwGitSquashWarning[]): PnwGitSquashWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.code}\0${warning.oid ?? ""}\0${warning.refName ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function pnwCreateGitSquashDraft(
  history: readonly PnwGitCommitRecord[],
  selectedOids: readonly string[],
): PnwGitSquashDraft {
  const selectedSet = new Set(selectedOids);
  const selected = history.filter((commit) => selectedSet.has(commit.oid));
  const tip = selected.at(-1);
  if (!tip || selected.length < 2) throw new Error("At least two selected commits are required");
  const message = selected.map((commit) => {
    const body = commit.body.trim();
    return body ? `${commit.subject.trim()}\n\n${body}` : commit.subject.trim();
  }).join("\n\n");
  return { message, author: tip.author, committer: tip.committer };
}

function dedupeBlockers(blockers: readonly PnwGitSquashBlocker[]): PnwGitSquashBlocker[] {
  const seen = new Set<string>();
  return blockers.filter((blocker) => {
    const key = `${blocker.code}\0${blocker.oid ?? ""}\0${blocker.refName ?? ""}\0${blocker.operationState ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
