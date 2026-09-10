// SPDX-License-Identifier: Apache-2.0

import type { BigIntStats } from "node:fs";
import { lstat, readdir, realpath, rm, rmdir, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import {
  pnwCleanupFilenameMatches,
  pnwParseCleanupConfigurationYaml,
  type PnwCleanupConfiguration,
} from "@phoenix-wing/run-core";

const pnwExecFile = promisify(execFile);
const PNW_CLEANUP_MAX_BUFFER = 32 * 1024 * 1024;

export type PnwCleanupTargetKind = "file" | "directory" | "directory-link";

export interface PnwCleanupPathIdentity {
  readonly path: string;
  readonly dev: string;
  readonly ino: string;
  readonly size: string;
  readonly mtimeNs: string;
  readonly ctimeNs: string;
  readonly birthtimeNs: string;
}

export interface PnwCleanupTreeEntry {
  readonly kind: PnwCleanupTargetKind;
  readonly identity: PnwCleanupPathIdentity;
}

export interface PnwCleanupArtifactTarget {
  readonly path: string;
  readonly kind: PnwCleanupTargetKind;
  /** Complete non-link-following tree frozen at preview time. */
  readonly tree: readonly PnwCleanupTreeEntry[];
}

export interface PnwCleanupArtifactPreview {
  readonly root: string;
  readonly rootIdentity: PnwCleanupPathIdentity;
  readonly rules: PnwCleanupConfiguration;
  readonly matched: readonly string[];
  readonly targets: readonly PnwCleanupArtifactTarget[];
}

export interface PnwCleanupExecutionOptions {
  /** Return false when the Host cancelled the destructive operation. */
  readonly shouldContinue?: () => boolean;
}

export interface PnwCleanupResult {
  readonly root: string;
  /** Top-level targets removed, rather than every child in a removed directory tree. */
  readonly deleted: readonly string[];
}

export interface PnwGitForcedCleanupPreview {
  readonly repository: string;
  readonly repositoryIdentity: PnwCleanupPathIdentity;
  readonly head: string;
  readonly trackedStatus: string;
  /** Exact HEAD-to-worktree diff frozen at preview time. */
  readonly trackedDiff: string;
  /** Index can change without changing the final worktree or porcelain status. */
  readonly trackedIndexDiff: string;
  readonly cleanDryRun: string;
  readonly trackedChanges: readonly string[];
  readonly untrackedAndIgnored: readonly string[];
  /** Complete untracked/ignored candidate trees, including nested repositories; never follows links. */
  readonly cleanTargets: readonly PnwCleanupArtifactTarget[];
}

export interface PnwGitForcedCleanupResult {
  readonly repository: string;
  readonly resetOutput: string;
  readonly cleanOutput: string;
}

export interface PnwRecursiveCleanupArtifactPreview extends PnwCleanupArtifactPreview {
  readonly scope: "recursive";
  readonly ancestorIdentities: readonly PnwCleanupPathIdentity[];
  readonly skippedPaths: readonly string[];
}

export interface PnwGitUntrackedRepositoryPreview {
  readonly repository: string;
  readonly repositoryIdentity: PnwCleanupPathIdentity;
  readonly ancestorIdentities: readonly PnwCleanupPathIdentity[];
  readonly trackedIndex: string;
  readonly cleanDryRun: string;
  readonly untrackedAndIgnored: readonly string[];
  readonly cleanTargets: readonly PnwCleanupArtifactTarget[];
  readonly preservedRepositories: readonly string[];
}

export interface PnwGitUntrackedCleanupPreview {
  readonly root: string;
  readonly rootIdentity: PnwCleanupPathIdentity;
  readonly repositories: readonly PnwGitUntrackedRepositoryPreview[];
}

export interface PnwGitUntrackedCleanupResult {
  readonly root: string;
  readonly repositories: readonly {
    readonly repository: string;
    readonly deleted: readonly string[];
    readonly cleanOutput: string;
  }[];
}

/** Explicit recursive mode; the original direct-child rule API remains unchanged. */
export async function pnwPreviewRecursiveCleanupArtifacts(
  root: string,
  rulesYaml: string,
  options: PnwCleanupExecutionOptions = {},
): Promise<PnwRecursiveCleanupArtifactPreview> {
  pnwAssertCleanupCanContinue(options);
  const resolvedRoot = await pnwResolveSafeCleanupRoot(root);
  const rootIdentity = await pnwReadCleanupPathIdentity(resolvedRoot);
  const rules = pnwParseCleanupConfigurationYaml(rulesYaml);
  if (rules.unlinkDirectories.length) throw new Error("递归规则不支持 unlinkDirectories；目录链接始终跳过。");
  const targets: PnwCleanupArtifactTarget[] = [];
  const skippedPaths = new Set<string>();
  const walk = async (directory: string): Promise<void> => {
    pnwAssertCleanupCanContinue(options);
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      pnwAssertCleanupCanContinue(options);
      const target = path.join(directory, entry.name);
      if (entry.name.toLowerCase() === ".git" || entry.isSymbolicLink()) { skippedPaths.add(target); continue; }
      await pnwReadCleanupAncestors(resolvedRoot, target);
      if (entry.isDirectory() && rules.directories.some((name) => pnwCleanupNameEquals(name, entry.name))) {
        targets.push(...await pnwProtectedCleanupTargets(target, skippedPaths, true, options));
      } else if (entry.isFile() && pnwCleanupFilenameMatches(entry.name, rules.files)) {
        const tree = await pnwSnapshotCleanupTree(target, options);
        if (tree[0]?.kind !== "file") throw new Error("递归清理目标在预览期间改变类型，请重新预览。");
        targets.push(Object.freeze({ path: target, kind: "file", tree }));
      } else if (entry.isDirectory()) await walk(target);
    }
  };
  await walk(resolvedRoot);
  const frozenTargets = Object.freeze(targets.sort((a, b) => a.path.localeCompare(b.path)));
  const ancestorIdentities = await pnwCollectCleanupAncestors(resolvedRoot, frozenTargets.map(({ path: value }) => value));
  pnwAssertCleanupCanContinue(options);
  return Object.freeze({ scope: "recursive", root: resolvedRoot, rootIdentity, rules,
    matched: Object.freeze(frozenTargets.map(({ path: value }) => value)), targets: frozenTargets,
    ancestorIdentities, skippedPaths: Object.freeze([...skippedPaths].sort()) });
}

/** Discover repository boundaries without traversing directory links. */
export async function pnwPreviewGitUntrackedCleanup(
  root: string,
  options: PnwCleanupExecutionOptions = {},
): Promise<PnwGitUntrackedCleanupPreview> {
  pnwAssertCleanupCanContinue(options);
  const resolvedRoot = await pnwResolveSafeCleanupRoot(root);
  const rootIdentity = await pnwReadCleanupPathIdentity(resolvedRoot);
  const repositories: PnwGitUntrackedRepositoryPreview[] = [];
  const walk = async (directory: string): Promise<void> => {
    pnwAssertCleanupCanContinue(options);
    const entries = await readdir(directory, { withFileTypes: true });
    if (entries.some(({ name }) => name.toLowerCase() === ".git")) {
      pnwAssertCleanupCanContinue(options);
      repositories.push(await pnwPreviewUntrackedRepository(resolvedRoot, directory, options));
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      pnwAssertCleanupCanContinue(options);
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const child = path.join(directory, entry.name);
      await pnwReadCleanupAncestors(resolvedRoot, path.join(child, ".pnw-ancestor-check"));
      await walk(child);
    }
  };
  await walk(resolvedRoot);
  pnwAssertCleanupCanContinue(options);
  return Object.freeze({ root: resolvedRoot, rootIdentity, repositories: Object.freeze(repositories) });
}

export async function pnwCleanPreviewedRecursiveArtifacts(
  preview: PnwRecursiveCleanupArtifactPreview,
  options: PnwCleanupExecutionOptions = {},
): Promise<PnwCleanupResult> {
  if (preview.scope !== "recursive" || !Array.isArray(preview.ancestorIdentities)
    || preview.targets.length !== preview.matched.length) throw new Error("递归清理快照不完整，请重新预览。");
  const root = await pnwResolveSafeCleanupRoot(preview.root);
  const deleted: string[] = [];
  const deletedNodes: string[] = [];
  let phase = "整批复验";
  let currentTarget: string | undefined;
  let currentNode: string | undefined;
  try {
    pnwAssertCleanupCanContinue(options);
    pnwAssertCleanupRootIdentity(preview.rootIdentity, await pnwReadCleanupPathIdentity(root));
    await pnwVerifyFrozenCleanupTargets(root, preview.targets, preview.ancestorIdentities);
    for (const target of preview.targets) {
      phase = "目标执行";
      currentTarget = target.path;
      currentNode = undefined;
      pnwAssertCleanupCanContinue(options);
      const nodes = [...target.tree].sort((a, b) => pnwCleanupDepth(b.identity.path) - pnwCleanupDepth(a.identity.path)
        || b.identity.path.localeCompare(a.identity.path));
      for (const node of nodes) {
        currentNode = node.identity.path;
        pnwAssertCleanupCanContinue(options);
        await pnwVerifyCleanupAncestors(root, node.identity.path, [...preview.ancestorIdentities,
          ...target.tree.filter(({ kind }) => kind === "directory").map(({ identity }) => identity)]);
        const current = await pnwReadCleanupPathIdentity(node.identity.path);
        if (node.kind === "directory") {
          pnwAssertStableCleanupPathIdentity(node.identity, current, "清理目录");
          await rmdir(node.identity.path);
        } else {
          pnwAssertCleanupPathIdentity(node.identity, current, "清理候选");
          await rm(node.identity.path, { force: true });
        }
        deletedNodes.push(node.identity.path);
      }
      deleted.push(target.path);
    }
    phase = "完成检查";
    currentTarget = undefined;
    currentNode = undefined;
    pnwAssertCleanupCanContinue(options);
    return Object.freeze({ root, deleted: Object.freeze(deleted) });
  } catch (error) {
    const removed = deletedNodes.length ? `\n已删除节点：\n${deletedNodes.map((value) => JSON.stringify(value)).join("\n")}` : "";
    throw new Error(`递归清理未完整完成（阶段：${phase}）；已完成 ${deleted.length} 个目标，已删除 ${deletedNodes.length} 个节点；当前目标：${currentTarget ?? "无"}；当前节点：${currentNode ?? "无"}；已删内容不自动回滚。${error instanceof Error ? error.message : String(error)}${removed}`);
  }
}

/** Single force with ignored files, no reset. Only frozen literal pathspecs are cleaned. */
export async function pnwExecuteGitUntrackedCleanup(
  preview: PnwGitUntrackedCleanupPreview,
  options: PnwCleanupExecutionOptions = {},
): Promise<PnwGitUntrackedCleanupResult> {
  pnwAssertCleanupCanContinue(options);
  const root = await pnwResolveSafeCleanupRoot(preview.root);
  pnwAssertCleanupRootIdentity(preview.rootIdentity, await pnwReadCleanupPathIdentity(root));
  for (const repository of preview.repositories) await pnwVerifyUntrackedRepository(root, repository);
  const results: Array<PnwGitUntrackedCleanupResult["repositories"][number]> = [];
  for (const repository of preview.repositories) {
    const deleted: string[] = [];
    const outputs: string[] = [];
    try {
      pnwAssertCleanupCanContinue(options);
      for (const target of repository.cleanTargets) {
        pnwAssertCleanupCanContinue(options);
        await pnwVerifyCleanupAncestors(root, repository.repository, repository.ancestorIdentities);
        pnwAssertCleanupRootIdentity(repository.repositoryIdentity, await pnwReadCleanupPathIdentity(repository.repository));
        if (await pnwGit(repository.repository, ["ls-files", "--stage", "-z"]) !== repository.trackedIndex) {
          throw new Error("Git 暂存区自预览后已变化，请重新预览。");
        }
        await pnwVerifyFrozenCleanupTargets(repository.repository, [target], repository.ancestorIdentities);
        const relative = path.relative(repository.repository, target.path).split(path.sep).join("/");
        outputs.push(await pnwGit(repository.repository, ["--literal-pathspecs", "clean", "-dfx", "--", relative]));
        try { await lstat(target.path); }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") { deleted.push(target.path); continue; }
          throw error;
        }
        throw new Error(`Git 未删除已确认目标，可能出现新的仓库边界：${target.path}`);
      }
      pnwAssertCleanupCanContinue(options);
      results.push(Object.freeze({ repository: repository.repository, deleted: Object.freeze(deleted), cleanOutput: outputs.join("") }));
    } catch (error) {
      throw new Error(`Git 未跟踪清理未完整完成；已处理 ${results.length} 个仓库，当前仓库 ${repository.repository} 已删除 ${deleted.length} 项；当前目标也可能部分完成，已删内容不自动回滚。${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return Object.freeze({ root, repositories: Object.freeze(results) });
}

async function pnwPreviewUntrackedRepository(root: string, repository: string, options: PnwCleanupExecutionOptions = {}): Promise<PnwGitUntrackedRepositoryPreview> {
  pnwAssertCleanupCanContinue(options);
  const topLevel = (await pnwGit(repository, ["rev-parse", "--show-toplevel"])).trim();
  if (await realpath(topLevel) !== repository) throw new Error(`Git 清理目标不是仓库顶层：${repository}`);
  const trackedIndex = await pnwGit(repository, ["ls-files", "--stage", "-z"]);
  const candidates = await pnwSnapshotGitCleanupTargets(repository, options);
  const preserved = new Set<string>();
  const targets: PnwCleanupArtifactTarget[] = [];
  for (const candidate of candidates) targets.push(...await pnwProtectedCleanupTargets(candidate.path, preserved, false, options));
  const cleanTargets = Object.freeze(targets.sort((a, b) => a.path.localeCompare(b.path)));
  const ancestorIdentities = await pnwCollectCleanupAncestors(root, [repository, ...cleanTargets.map(({ path: value }) => value)]);
  const repositoryIdentity = await pnwReadCleanupPathIdentity(repository);
  pnwAssertCleanupCanContinue(options);
  const cleanDryRun = await pnwGit(repository, ["clean", "-ndfx"]);
  pnwAssertCleanupCanContinue(options);
  return Object.freeze({ repository, repositoryIdentity, ancestorIdentities,
    trackedIndex, cleanDryRun, cleanTargets,
    untrackedAndIgnored: Object.freeze(cleanTargets.map(({ path: value }) => path.relative(repository, value))),
    preservedRepositories: Object.freeze([...preserved].sort()) });
}

/** Split selected trees around preserved metadata/links without claiming retained parents were removed. */
async function pnwProtectedCleanupTargets(target: string, skipped: Set<string>, protectLinks: boolean, options: PnwCleanupExecutionOptions = {}): Promise<PnwCleanupArtifactTarget[]> {
  pnwAssertCleanupCanContinue(options);
  const entry = await lstat(target);
  if (entry.isSymbolicLink() && protectLinks) { skipped.add(target); return []; }
  if (entry.isDirectory()) {
    const entries = await readdir(target, { withFileTypes: true });
    if (entries.some(({ name }) => name.toLowerCase() === ".git")) { skipped.add(target); return []; }
    const before = skipped.size;
    const children: PnwCleanupArtifactTarget[] = [];
    for (const child of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      children.push(...await pnwProtectedCleanupTargets(path.join(target, child.name), skipped, protectLinks, options));
    }
    if (skipped.size !== before) return children;
  }
  const tree = await pnwSnapshotCleanupTree(target, options);
  if (tree.some(({ kind, identity }) => (protectLinks && kind === "directory-link")
    || path.relative(target, identity.path).split(path.sep).some((name) => name.toLowerCase() === ".git"))) {
    throw new Error("清理目标在预览期间出现新的链接或 Git 边界，请重新预览。");
  }
  return [Object.freeze({ path: target, kind: tree[0]!.kind, tree })];
}

async function pnwReadCleanupAncestors(root: string, target: string): Promise<PnwCleanupPathIdentity[]> {
  if (!path.isAbsolute(target) || path.resolve(target) !== target) throw new Error("清理目标路径必须是规范绝对路径。");
  const relative = path.relative(root, target);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error("清理目标越出已确认范围。");
  const directories = [root];
  if (target !== root) {
    let directory = path.dirname(target);
    while (directory !== root) { directories.push(directory); directory = path.dirname(directory); }
  }
  const result: PnwCleanupPathIdentity[] = [];
  for (const directory of directories) {
    const value = await lstat(directory, { bigint: true });
    if (!value.isDirectory() || value.isSymbolicLink()) throw new Error(`清理祖先目录不是普通目录，拒绝执行：${directory}`);
    result.push(pnwCleanupPathIdentityFromStat(directory, value));
  }
  return result;
}

async function pnwCollectCleanupAncestors(root: string, targets: readonly string[]): Promise<readonly PnwCleanupPathIdentity[]> {
  const ancestors = new Map<string, PnwCleanupPathIdentity>();
  for (const target of targets) for (const value of await pnwReadCleanupAncestors(root, target)) ancestors.set(value.path, value);
  return Object.freeze([...ancestors.values()].sort((a, b) => a.path.localeCompare(b.path)));
}

async function pnwVerifyCleanupAncestors(root: string, target: string, accepted: readonly PnwCleanupPathIdentity[]): Promise<void> {
  if (!Array.isArray(accepted)) throw new Error("清理快照缺少祖先身份，请重新预览。");
  const byPath = new Map(accepted.map((identity) => [identity.path, identity]));
  for (const current of await pnwReadCleanupAncestors(root, target)) {
    const previous = byPath.get(current.path);
    if (!previous) throw new Error(`清理快照缺少祖先身份：${current.path}`);
    pnwAssertStableCleanupPathIdentity(previous, current, "清理祖先目录");
  }
}

async function pnwVerifyFrozenCleanupTargets(root: string, targets: readonly PnwCleanupArtifactTarget[], ancestors: readonly PnwCleanupPathIdentity[]): Promise<void> {
  for (const target of targets) {
    if (target.path === root) throw new Error("不能删除清理根目录本身。");
    await pnwVerifyCleanupAncestors(root, target.path, ancestors);
    pnwAssertCleanupTree(target.tree, await pnwSnapshotCleanupTree(target.path), target.path);
  }
}

async function pnwVerifyUntrackedRepository(root: string, accepted: PnwGitUntrackedRepositoryPreview): Promise<void> {
  await pnwVerifyCleanupAncestors(root, accepted.repository, accepted.ancestorIdentities);
  pnwAssertCleanupRootIdentity(accepted.repositoryIdentity, await pnwReadCleanupPathIdentity(accepted.repository));
  const current = await pnwPreviewUntrackedRepository(root, accepted.repository);
  if (accepted.trackedIndex !== current.trackedIndex) throw new Error("Git 暂存区自预览后已变化，请重新预览。");
  const byPath = new Map(current.cleanTargets.map((target) => [target.path, target]));
  for (const target of accepted.cleanTargets) {
    const now = byPath.get(target.path);
    if (!now) throw new Error(`Git 已确认目标已改变，请重新预览：${target.path}`);
    pnwAssertCleanupTree(target.tree, now.tree, target.path);
  }
  await pnwVerifyFrozenCleanupTargets(accepted.repository, accepted.cleanTargets, accepted.ancestorIdentities);
}

export async function pnwPreviewCleanupArtifacts(
  root: string,
  rulesYaml: string,
): Promise<PnwCleanupArtifactPreview> {
  const resolvedRoot = await pnwResolveSafeCleanupRoot(root);
  const rootIdentity = await pnwReadCleanupPathIdentity(resolvedRoot);
  const rules = pnwParseCleanupConfigurationYaml(rulesYaml);
  const directChildren = await readdir(resolvedRoot, { withFileTypes: true });
  const targets = new Map<string, PnwCleanupArtifactTarget>();

  for (const entry of directChildren) {
    if (entry.name.toLocaleLowerCase() === ".git") continue;
    const entryPath = path.join(resolvedRoot, entry.name);
    if (entry.isFile() && pnwCleanupFilenameMatches(entry.name, rules.files)) {
      await pnwAddCleanupTarget(targets, entryPath, "file");
      continue;
    }
    if (entry.isDirectory() && rules.directories.some((name) => (
      pnwCleanupNameEquals(name, entry.name)
    ))) {
      await pnwAddCleanupTarget(targets, entryPath, "directory");
      continue;
    }
    if (!entry.isSymbolicLink()) continue;
    let directoryLink = false;
    try { directoryLink = (await stat(entryPath)).isDirectory(); }
    catch { /* Broken links are not accepted as directory-link cleanup targets. */ }
    if (!directoryLink) continue;
    const exactDirectory = rules.directories.some((name) => (
      pnwCleanupNameEquals(name, entry.name)
    ));
    const unlinkMatch = pnwCleanupFilenameMatches(entry.name, rules.unlinkDirectories);
    if (exactDirectory || unlinkMatch) {
      await pnwAddCleanupTarget(targets, entryPath, "directory-link");
    }
  }

  const frozenTargets = Object.freeze(
    [...targets.values()].sort((left, right) => left.path.localeCompare(right.path)),
  );
  return Object.freeze({
    root: resolvedRoot,
    rootIdentity,
    rules,
    matched: Object.freeze(frozenTargets.map(({ path: targetPath }) => targetPath)),
    targets: frozenTargets,
  });
}

export async function pnwCleanArtifacts(
  root: string,
  rulesYaml: string,
  options: PnwCleanupExecutionOptions = {},
): Promise<PnwCleanupResult> {
  return pnwCleanPreviewedArtifacts(
    await pnwPreviewCleanupArtifacts(root, rulesYaml),
    options,
  );
}

/**
 * Freeze every direct child of a directory so the Host can later empty that
 * exact directory without deleting the directory itself. Directory links are
 * unlinked and never traversed; a nested `.git` entry is deliberately skipped.
 */
export async function pnwPreviewDirectoryContents(
  root: string,
): Promise<PnwCleanupArtifactPreview> {
  const resolvedRoot = await pnwResolveSafeCleanupRoot(root);
  const rootIdentity = await pnwReadCleanupPathIdentity(resolvedRoot);
  const directChildren = await readdir(resolvedRoot, { withFileTypes: true });
  const targets = new Map<string, PnwCleanupArtifactTarget>();
  for (const entry of directChildren) {
    if (entry.name.toLocaleLowerCase() === ".git") continue;
    const targetPath = path.join(resolvedRoot, entry.name);
    const kind: PnwCleanupTargetKind = entry.isSymbolicLink()
      ? "directory-link"
      : entry.isDirectory() ? "directory" : "file";
    await pnwAddCleanupTarget(targets, targetPath, kind);
  }
  const frozenTargets = Object.freeze(
    [...targets.values()].sort((left, right) => left.path.localeCompare(right.path)),
  );
  return Object.freeze({
    root: resolvedRoot,
    rootIdentity,
    rules: Object.freeze({
      unlinkDirectories: Object.freeze([]),
      directories: Object.freeze([]),
      files: Object.freeze([]),
    }),
    matched: Object.freeze(frozenTargets.map(({ path: targetPath }) => targetPath)),
    targets: frozenTargets,
  });
}

/** Empty only the exact directory contents accepted in the frozen preview. */
export async function pnwCleanPreviewedDirectoryContents(
  preview: PnwCleanupArtifactPreview,
  options: PnwCleanupExecutionOptions = {},
): Promise<PnwCleanupResult> {
  return pnwCleanPreviewedArtifacts(preview, options);
}

/** Delete only the exact files, links and complete directory trees accepted by the Host. */
export async function pnwCleanPreviewedArtifacts(
  preview: PnwCleanupArtifactPreview,
  options: PnwCleanupExecutionOptions = {},
): Promise<PnwCleanupResult> {
  const resolvedRoot = await pnwResolveSafeCleanupRoot(preview.root);
  pnwAssertCleanupRootIdentity(
    preview.rootIdentity,
    await pnwReadCleanupPathIdentity(resolvedRoot),
  );
  if (preview.targets.length !== preview.matched.length) {
    throw new Error("清理候选身份快照不完整，拒绝删除。");
  }

  for (const target of preview.targets) {
    pnwAssertDirectCleanupChild(resolvedRoot, target.path);
    pnwAssertCleanupTree(
      target.tree,
      await pnwSnapshotCleanupTree(target.path),
      target.path,
    );
  }
  pnwAssertCleanupCanContinue(options);

  const deleted: string[] = [];
  for (const target of preview.targets) {
    pnwAssertCleanupCanContinue(options);
    const nodes = [...target.tree].sort((left, right) => (
      pnwCleanupDepth(right.identity.path) - pnwCleanupDepth(left.identity.path)
      || right.identity.path.localeCompare(left.identity.path)
    ));
    for (const node of nodes) {
      pnwAssertCleanupCanContinue(options);
      const current = await pnwReadCleanupPathIdentity(node.identity.path);
      if (node.kind === "directory") {
        pnwAssertStableCleanupPathIdentity(node.identity, current, "清理目录");
        await rmdir(node.identity.path);
      } else {
        pnwAssertCleanupPathIdentity(node.identity, current, "清理候选");
        await rm(node.identity.path, { force: true });
      }
    }
    deleted.push(target.path);
  }
  return Object.freeze({ root: resolvedRoot, deleted: Object.freeze(deleted) });
}

export async function pnwPreviewGitForcedCleanup(
  repository: string,
): Promise<PnwGitForcedCleanupPreview> {
  const resolved = await pnwResolveSafeCleanupRoot(repository);
  const topLevel = (await pnwGit(resolved, ["rev-parse", "--show-toplevel"])).trim();
  const resolvedTopLevel = await realpath(path.resolve(topLevel));
  if (resolvedTopLevel !== resolved) {
    throw new Error(`清理目标必须是 Git 仓库顶层：${resolvedTopLevel}`);
  }
  const head = (await pnwGit(resolved, ["rev-parse", "HEAD"])).trim();
  const trackedStatus = await pnwGit(resolved, [
    "status",
    "--porcelain=v1",
    "--untracked-files=no",
  ]);
  const trackedDiff = await pnwGit(resolved, [
    "diff",
    "--binary",
    "--no-ext-diff",
    "--no-textconv",
    "HEAD",
  ]);
  const trackedIndexDiff = await pnwGit(resolved, ["diff", "--cached", "--binary", "--no-ext-diff", "--no-textconv", "HEAD"]);
  // Preview must use the same two force flags as execution, including nested Git repositories.
  const cleanDryRun = await pnwGit(resolved, ["clean", "-nffdx"]);
  const cleanTargets = await pnwSnapshotGitCleanupTargets(resolved);
  return Object.freeze({
    repository: resolved,
    repositoryIdentity: await pnwReadCleanupPathIdentity(resolved),
    head,
    trackedStatus,
    trackedDiff,
    trackedIndexDiff,
    cleanDryRun,
    cleanTargets,
    trackedChanges: Object.freeze(pnwNonEmptyLines(trackedStatus)),
    untrackedAndIgnored: Object.freeze(
      pnwNonEmptyLines(cleanDryRun).map((line) => line.replace(/^Would remove\s+/u, "")),
    ),
  });
}

/**
 * Execute exactly `git reset --hard HEAD` followed by `git clean -ffdx` after
 * revalidating the accepted repository, HEAD, tracked status, clean dry-run and complete target trees.
 */
export async function pnwExecuteGitForcedCleanup(
  preview: PnwGitForcedCleanupPreview,
  options: PnwCleanupExecutionOptions = {},
): Promise<PnwGitForcedCleanupResult> {
  const current = await pnwPreviewGitForcedCleanup(preview.repository);
  pnwAssertGitCleanupPreview(preview, current);
  pnwAssertCleanupCanContinue(options);

  const resetOutput = await pnwGit(preview.repository, ["reset", "--hard", "HEAD"]);
  try {
    const afterReset = await pnwPreviewGitForcedCleanup(preview.repository);
    pnwAssertCleanupRootIdentity(preview.repositoryIdentity, afterReset.repositoryIdentity);
    if (afterReset.head !== preview.head || afterReset.cleanDryRun !== preview.cleanDryRun) {
      throw new Error("Git 仓库或待清理文件在 reset 后发生变化，拒绝继续 clean。");
    }
    pnwAssertGitCleanupTargets(preview.cleanTargets, afterReset.cleanTargets);
    pnwAssertCleanupCanContinue(options);
  } catch (error) {
    throw new Error(`Git reset --hard 已完成；未继续 clean，不自动回滚已恢复的文件。${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    const cleanOutput = await pnwGit(preview.repository, ["clean", "-ffdx"]);
    return Object.freeze({ repository: preview.repository, resetOutput, cleanOutput });
  } catch (error) {
    throw new Error(`Git reset --hard 已完成；clean 未完整完成，部分内容可能已删除，不自动回滚。${error instanceof Error ? error.message : String(error)}`);
  }
}

export function pnwIsCleanupFilesystemRoot(value: string): boolean {
  const pathApi = /^[A-Za-z]:[\\/]/u.test(value) || /^\\\\/u.test(value)
    ? path.win32
    : path.posix;
  const normalized = pathApi.resolve(value);
  if (/^\\\\\?\\UNC\\[^\\]+\\[^\\]+\\?$/iu.test(normalized)) return true;
  return normalized.toLocaleLowerCase() === pathApi.parse(normalized).root.toLocaleLowerCase();
}

async function pnwAddCleanupTarget(
  targets: Map<string, PnwCleanupArtifactTarget>,
  targetPath: string,
  expectedKind: PnwCleanupTargetKind,
): Promise<void> {
  if (targets.has(targetPath)) return;
  const tree = await pnwSnapshotCleanupTree(targetPath);
  if (tree[0]?.kind !== expectedKind) {
    throw new Error(`清理候选类型在预览期间发生变化：${targetPath}`);
  }
  targets.set(targetPath, Object.freeze({ path: targetPath, kind: expectedKind, tree }));
}

async function pnwSnapshotCleanupTree(
  entryPath: string,
  options: PnwCleanupExecutionOptions = {},
): Promise<readonly PnwCleanupTreeEntry[]> {
  const result: PnwCleanupTreeEntry[] = [];
  await pnwSnapshotCleanupEntry(entryPath, result, options);
  pnwAssertCleanupCanContinue(options);
  return Object.freeze(result);
}

async function pnwSnapshotCleanupEntry(
  entryPath: string,
  result: PnwCleanupTreeEntry[],
  options: PnwCleanupExecutionOptions,
): Promise<void> {
  pnwAssertCleanupCanContinue(options);
  const entry = await lstat(entryPath, { bigint: true });
  const kind: PnwCleanupTargetKind = entry.isSymbolicLink()
    ? "directory-link"
    : entry.isDirectory() ? "directory" : "file";
  result.push(Object.freeze({
    kind,
    identity: pnwCleanupPathIdentityFromStat(entryPath, entry),
  }));
  if (kind !== "directory") return;
  const children = await readdir(entryPath, { withFileTypes: true });
  children.sort((left, right) => left.name.localeCompare(right.name));
  for (const child of children) {
    await pnwSnapshotCleanupEntry(path.join(entryPath, child.name), result, options);
  }
}

function pnwAssertCleanupTree(
  accepted: readonly PnwCleanupTreeEntry[],
  current: readonly PnwCleanupTreeEntry[],
  targetPath: string,
): void {
  if (accepted.length !== current.length) {
    throw new Error(`清理目录自确认预览后已变化，拒绝删除：${targetPath}`);
  }
  for (let index = 0; index < accepted.length; index += 1) {
    const expected = accepted[index]!;
    const actual = current[index]!;
    if (expected.kind !== actual.kind) {
      throw new Error(`清理候选类型自确认预览后已变化，拒绝删除：${expected.identity.path}`);
    }
    pnwAssertCleanupPathIdentity(expected.identity, actual.identity, "清理候选");
  }
}

async function pnwReadCleanupPathIdentity(
  entryPath: string,
): Promise<PnwCleanupPathIdentity> {
  return pnwCleanupPathIdentityFromStat(entryPath, await lstat(entryPath, { bigint: true }));
}

function pnwCleanupPathIdentityFromStat(
  entryPath: string,
  entry: BigIntStats,
): PnwCleanupPathIdentity {
  return Object.freeze({
    path: entryPath,
    dev: entry.dev.toString(),
    ino: entry.ino.toString(),
    size: entry.size.toString(),
    mtimeNs: entry.mtimeNs.toString(),
    ctimeNs: entry.ctimeNs.toString(),
    birthtimeNs: entry.birthtimeNs.toString(),
  });
}

function pnwAssertCleanupRootIdentity(
  accepted: PnwCleanupPathIdentity,
  current: PnwCleanupPathIdentity,
): void {
  const nativeIdentityAvailable = accepted.dev !== "0" || accepted.ino !== "0";
  if (accepted.path !== current.path || (nativeIdentityAvailable
    ? accepted.dev !== current.dev || accepted.ino !== current.ino
    : accepted.birthtimeNs !== current.birthtimeNs)) {
    throw new Error(`清理根目录自确认预览后已变化，拒绝删除：${accepted.path}`);
  }
}

function pnwAssertStableCleanupPathIdentity(
  accepted: PnwCleanupPathIdentity,
  current: PnwCleanupPathIdentity,
  description: string,
): void {
  const nativeIdentityAvailable = accepted.dev !== "0" || accepted.ino !== "0";
  if (accepted.path !== current.path || (nativeIdentityAvailable
    ? accepted.dev !== current.dev || accepted.ino !== current.ino
    : accepted.birthtimeNs !== current.birthtimeNs)) {
    throw new Error(`${description}自确认预览后已被替换，拒绝删除：${accepted.path}`);
  }
}

function pnwAssertCleanupPathIdentity(
  accepted: PnwCleanupPathIdentity,
  current: PnwCleanupPathIdentity,
  description: string,
): void {
  if (accepted.path !== current.path
    || accepted.dev !== current.dev
    || accepted.ino !== current.ino
    || accepted.size !== current.size
    || accepted.mtimeNs !== current.mtimeNs
    || accepted.ctimeNs !== current.ctimeNs
    || accepted.birthtimeNs !== current.birthtimeNs) {
    throw new Error(`${description}自确认预览后已变化，拒绝删除：${accepted.path}`);
  }
}

function pnwAssertDirectCleanupChild(root: string, entryPath: string): void {
  if (path.dirname(entryPath) !== root || entryPath === root) {
    throw new Error(`清理候选不是目标目录的直接子项，拒绝删除：${entryPath}`);
  }
}

function pnwAssertCleanupCanContinue(options: PnwCleanupExecutionOptions): void {
  if (options.shouldContinue?.() === false) {
    throw new Error("清理已取消；未继续删除项目。");
  }
}

function pnwAssertGitCleanupPreview(
  accepted: PnwGitForcedCleanupPreview,
  current: PnwGitForcedCleanupPreview,
): void {
  pnwAssertCleanupRootIdentity(accepted.repositoryIdentity, current.repositoryIdentity);
  if (accepted.repository !== current.repository
    || accepted.head !== current.head
    || accepted.trackedStatus !== current.trackedStatus
    || accepted.trackedDiff !== current.trackedDiff
    || accepted.trackedIndexDiff !== current.trackedIndexDiff
    || accepted.cleanDryRun !== current.cleanDryRun) {
    throw new Error("Git 仓库自确认预览后已变化，拒绝强制清理。");
  }
  pnwAssertGitCleanupTargets(accepted.cleanTargets, current.cleanTargets);
}

/** Git's -z output is authoritative for filenames; never parse human/C-quoted clean output as paths. */
async function pnwSnapshotGitCleanupTargets(repository: string, options: PnwCleanupExecutionOptions = {}): Promise<readonly PnwCleanupArtifactTarget[]> {
  const names = new Set<string>();
  for (const ignored of [false, true]) {
    pnwAssertCleanupCanContinue(options);
    const listed = await pnwGit(repository, [
      "ls-files", "--others", "--directory", "--exclude-standard", "-z",
      ...(ignored ? ["--ignored"] : []),
    ]);
    for (const name of listed.split("\0")) {
      if (!name) continue;
      const target = path.resolve(repository, name);
      const relative = path.relative(repository, target);
      if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`)
        || path.isAbsolute(relative) || relative.split(path.sep)[0]?.toLowerCase() === ".git") {
        throw new Error("Git 返回的清理目标越出仓库或指向仓库元数据，拒绝预览。");
      }
      names.add(target);
    }
  }
  const roots = [...names].sort((left, right) => left.length - right.length || left.localeCompare(right))
    .filter((target, _index, all) => !all.some((parent) => target.startsWith(`${parent}${path.sep}`)));
  const targets: PnwCleanupArtifactTarget[] = [];
  for (const target of roots.sort((left, right) => left.localeCompare(right))) {
    pnwAssertCleanupCanContinue(options);
    let ancestor = path.dirname(target);
    while (ancestor !== repository) {
      const identity = await lstat(ancestor);
      if (!identity.isDirectory() || identity.isSymbolicLink()) {
        throw new Error(`Git 清理目标的父目录不是普通目录，拒绝预览：${ancestor}`);
      }
      ancestor = path.dirname(ancestor);
    }
    const tree = await pnwSnapshotCleanupTree(target, options);
    targets.push(Object.freeze({ path: target, kind: tree[0]!.kind, tree }));
  }
  pnwAssertCleanupCanContinue(options);
  return Object.freeze(targets);
}

function pnwAssertGitCleanupTargets(
  accepted: readonly PnwCleanupArtifactTarget[] | undefined,
  current: readonly PnwCleanupArtifactTarget[],
): void {
  if (!Array.isArray(accepted)) throw new Error("Git 清理快照不含完整目标，请重新预览后确认。");
  if (accepted.length !== current.length) throw new Error("Git 清理目标自确认预览后已变化，拒绝删除。");
  for (let index = 0; index < accepted.length; index++) {
    const previous = accepted[index]!, next = current[index]!;
    if (previous.path !== next.path || previous.kind !== next.kind) {
      throw new Error("Git 清理目标自确认预览后已变化，拒绝删除。");
    }
    pnwAssertCleanupTree(previous.tree, next.tree, previous.path);
  }
}

async function pnwResolveSafeCleanupRoot(root: string): Promise<string> {
  const resolved = await realpath(path.resolve(root));
  if (pnwIsCleanupFilesystemRoot(resolved)) {
    throw new Error("不允许在文件系统根目录执行清理。");
  }
  return resolved;
}

async function pnwGit(repository: string, args: readonly string[]): Promise<string> {
  const result = await pnwExecFile("git", ["-C", repository, ...args], {
    encoding: "utf8",
    maxBuffer: PNW_CLEANUP_MAX_BUFFER,
  });
  return result.stdout;
}

function pnwNonEmptyLines(source: string): string[] {
  return source.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
}

function pnwCleanupDepth(value: string): number {
  return value.split(/[\\/]/u).length;
}

function pnwCleanupNameEquals(left: string, right: string): boolean {
  return left.toLocaleLowerCase() === right.toLocaleLowerCase();
}
