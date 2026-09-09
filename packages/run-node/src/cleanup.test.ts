// SPDX-License-Identifier: Apache-2.0

import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, parse, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PNW_DEFAULT_CLEANUP_RULES_YAML } from "@phoenix-wing/run-core";
import {
  pnwCleanArtifacts,
  pnwCleanPreviewedArtifacts,
  pnwCleanPreviewedDirectoryContents,
  pnwExecuteGitForcedCleanup,
  pnwIsCleanupFilesystemRoot,
  pnwPreviewCleanupArtifacts,
  pnwPreviewDirectoryContents,
  pnwPreviewGitForcedCleanup,
} from "./cleanup.js";

const pnwExecFile = promisify(execFile);
const pnwCleanupTestRoots: string[] = [];

afterEach(async () => {
  await Promise.all(pnwCleanupTestRoots.splice(0).map((root) => (
    rm(root, { recursive: true, force: true })
  )));
});

async function pnwCleanupFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pnw-clean-"));
  pnwCleanupTestRoots.push(root);
  await mkdir(join(root, ".git", "objects"), { recursive: true });
  await mkdir(join(root, "nested", "build"), { recursive: true });
  await mkdir(join(root, "objects"), { recursive: true });
  await writeFile(join(root, "nested", "keep.obj"), "nested");
  await writeFile(join(root, ".git", "objects", "keep.obj"), "git");
  return root;
}

async function pnwGitFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pnw-git-clean-"));
  pnwCleanupTestRoots.push(root);
  await pnwExecFile("git", ["init", root]);
  await pnwExecFile("git", ["-C", root, "config", "user.name", "Pnw Test"]);
  await pnwExecFile("git", ["-C", root, "config", "user.email", "pnw@example.invalid"]);
  await writeFile(join(root, ".gitignore"), "ignored/\n");
  await writeFile(join(root, "tracked.txt"), "original\n");
  await pnwExecFile("git", ["-C", root, "add", ".gitignore", "tracked.txt"]);
  await pnwExecFile("git", ["-C", root, "commit", "-m", "fixture"]);
  return root;
}

describe("Pnw cleanup node capability", () => {
  it("预览直属产物并只删除已冻结目标", async () => {
    const root = await pnwCleanupFixture();
    const canonicalRoot = await realpath(root);
    await writeFile(join(root, "module.obj"), "obj");
    await writeFile(join(root, "other.lib"), "lib");

    const preview = await pnwPreviewCleanupArtifacts(root, PNW_DEFAULT_CLEANUP_RULES_YAML);
    expect(preview.matched).toEqual([
      join(canonicalRoot, "module.obj"),
      join(canonicalRoot, "objects"),
    ].sort((left, right) => left.localeCompare(right)));

    const result = await pnwCleanPreviewedArtifacts(preview);
    expect(result.deleted).toEqual(preview.matched);
    await expect(access(join(root, "module.obj"))).rejects.toThrow();
    await expect(access(join(root, "objects"))).rejects.toThrow();
    expect(await readFile(join(root, "nested", "keep.obj"), "utf8")).toBe("nested");
    expect(await readFile(join(root, ".git", "objects", "keep.obj"), "utf8")).toBe("git");
    expect(await readFile(join(root, "other.lib"), "utf8")).toBe("lib");
  });

  it("不删除确认预览后才创建的匹配文件", async () => {
    const root = await pnwCleanupFixture();
    const canonicalRoot = await realpath(root);
    const confirmed = join(root, "KtConfirmed.obj");
    const late = join(root, "KtLate.obj");
    await writeFile(confirmed, "confirmed");
    const preview = await pnwPreviewCleanupArtifacts(root, "- Kt*");
    await writeFile(late, "late");

    expect((await pnwCleanPreviewedArtifacts(preview)).deleted).toEqual([
      join(canonicalRoot, "KtConfirmed.obj"),
    ]);
    await expect(access(confirmed)).rejects.toThrow();
    expect(await readFile(late, "utf8")).toBe("late");
  });

  it("候选身份或根目录身份变化时拒绝删除", async () => {
    const root = await pnwCleanupFixture();
    const candidate = join(root, "KtGenerated.obj");
    await writeFile(candidate, "first");
    const changedCandidate = await pnwPreviewCleanupArtifacts(root, "- Kt*");
    await writeFile(candidate, "replacement identity");
    await expect(pnwCleanPreviewedArtifacts(changedCandidate)).rejects.toThrow("已变化");

    const stablePreview = await pnwPreviewCleanupArtifacts(root, "- Kt*");
    const originalRoot = `${root}-original`;
    pnwCleanupTestRoots.push(originalRoot);
    await rename(root, originalRoot);
    await mkdir(root);
    await writeFile(join(root, "KtGenerated.obj"), "replacement root");
    await expect(pnwCleanPreviewedArtifacts(stablePreview)).rejects.toThrow("根目录自确认预览后已变化");
  });

  it("完整冻结目录树且不跟随目录链接", async () => {
    const root = await pnwCleanupFixture();
    const linkedRoot = await mkdtemp(join(tmpdir(), "pnw-clean-link-source-"));
    pnwCleanupTestRoots.push(linkedRoot);
    const target = join(root, "build");
    await mkdir(join(target, "nested"), { recursive: true });
    await writeFile(join(target, "nested", "artifact.obj"), "artifact");
    await writeFile(join(linkedRoot, "keep.txt"), "keep");
    await symlink(linkedRoot, join(target, "external"), process.platform === "win32" ? "junction" : "dir");

    const preview = await pnwPreviewCleanupArtifacts(
      root,
      "delete:\n  directories:\n    - build\n  files: []",
    );
    expect(preview.targets[0]?.tree.some(({ kind }) => kind === "directory-link")).toBe(true);
    await pnwCleanPreviewedArtifacts(preview);
    await expect(access(target)).rejects.toThrow();
    expect(await readFile(join(linkedRoot, "keep.txt"), "utf8")).toBe("keep");
  });

  it("可冻结并清空目录内容，同时保留目录和嵌套 Git 元数据", async () => {
    const root = await pnwCleanupFixture();
    await writeFile(join(root, "top.txt"), "top");

    const preview = await pnwPreviewDirectoryContents(root);
    expect(preview.matched).toEqual(expect.arrayContaining([
      join(await realpath(root), "nested"),
      join(await realpath(root), "objects"),
      join(await realpath(root), "top.txt"),
    ]));
    expect(preview.matched.some((target) => target.includes(`${join(root, ".git")}`))).toBe(false);

    await pnwCleanPreviewedDirectoryContents(preview);
    expect(await realpath(root)).toBe(await realpath(root));
    expect(await readFile(join(root, ".git", "objects", "keep.obj"), "utf8")).toBe("git");
    await expect(access(join(root, "top.txt"))).rejects.toThrow();
    await expect(access(join(root, "nested"))).rejects.toThrow();
    await expect(access(join(root, "objects"))).rejects.toThrow();
  });

  it("支持 Host 在删除前协作取消", async () => {
    const root = await pnwCleanupFixture();
    const target = join(root, "KtGenerated.obj");
    await writeFile(target, "keep");
    const preview = await pnwPreviewCleanupArtifacts(root, "- Kt*");
    const shouldContinue = vi.fn(() => false);

    await expect(pnwCleanPreviewedArtifacts(preview, { shouldContinue }))
      .rejects.toThrow("清理已取消");
    expect(shouldContinue).toHaveBeenCalledTimes(1);
    expect(await readFile(target, "utf8")).toBe("keep");
  });

  it("拒绝文件系统根目录", async () => {
    const root = parse(resolve(tmpdir())).root;
    expect(pnwIsCleanupFilesystemRoot(root)).toBe(true);
    expect(pnwIsCleanupFilesystemRoot("C:\\")).toBe(true);
    expect(pnwIsCleanupFilesystemRoot("C:\\work")).toBe(false);
    await expect(pnwCleanArtifacts(root, "- Kt*")).rejects.toThrow("文件系统根目录");
  });

  it("Git 强制清理在执行前复验并运行 reset --hard 与 clean -ffdx", async () => {
    const root = await pnwGitFixture();
    await writeFile(join(root, "tracked.txt"), "modified\n");
    await writeFile(join(root, "untracked.txt"), "untracked\n");
    await mkdir(join(root, "ignored"));
    await writeFile(join(root, "ignored", "artifact.obj"), "ignored\n");

    const preview = await pnwPreviewGitForcedCleanup(root);
    expect(preview.trackedChanges.join("\n")).toContain("tracked.txt");
    expect(preview.untrackedAndIgnored).toEqual(expect.arrayContaining([
      "ignored/",
      "untracked.txt",
    ]));

    const result = await pnwExecuteGitForcedCleanup(preview);
    expect(result.repository).toBe(await realpath(root));
    expect(await readFile(join(root, "tracked.txt"), "utf8")).toBe("original\n");
    await expect(access(join(root, "untracked.txt"))).rejects.toThrow();
    await expect(access(join(root, "ignored"))).rejects.toThrow();
  });

  it("Git 强制清理拒绝预览后发生的仓库变化和非顶层目标", async () => {
    const root = await pnwGitFixture();
    await writeFile(join(root, "first.tmp"), "first");
    const preview = await pnwPreviewGitForcedCleanup(root);
    await writeFile(join(root, "late.tmp"), "late");

    await expect(pnwExecuteGitForcedCleanup(preview)).rejects.toThrow("自确认预览后已变化");
    expect(await readFile(join(root, "first.tmp"), "utf8")).toBe("first");
    expect(await readFile(join(root, "late.tmp"), "utf8")).toBe("late");
    await mkdir(join(root, "nested"));
    await expect(pnwPreviewGitForcedCleanup(join(root, "nested")))
      .rejects.toThrow("必须是 Git 仓库顶层");
  });

  it("Git tracked 状态字符不变但内容变化时仍拒绝执行", async () => {
    const root = await pnwGitFixture();
    await writeFile(join(root, "tracked.txt"), "first change\n");
    const preview = await pnwPreviewGitForcedCleanup(root);
    await writeFile(join(root, "tracked.txt"), "second change\n");

    await expect(pnwExecuteGitForcedCleanup(preview)).rejects.toThrow("自确认预览后已变化");
    expect(await readFile(join(root, "tracked.txt"), "utf8")).toBe("second change\n");
  });

  it("Git 双 force 预览包含会被清理的嵌套仓库", async () => {
    const root = await pnwGitFixture();
    const nested = join(root, "nested-repository");
    await pnwExecFile("git", ["init", nested]);
    await writeFile(join(nested, "keep-until-confirmed.txt"), "nested");
    const preview = await pnwPreviewGitForcedCleanup(root);
    expect(preview.untrackedAndIgnored).toContain("nested-repository/");
    expect(preview.cleanTargets.some((target) => target.path === join(preview.repository, "nested-repository"))).toBe(true);
    await pnwExecuteGitForcedCleanup(preview);
    await expect(access(nested)).rejects.toThrow();
  });

  it.each(["untracked.txt", "ignored/artifact.obj"])("Git 拒绝同名未跟踪/ignored文件内容变化：%s", async (name) => {
    const root = await pnwGitFixture();
    await mkdir(join(root, "ignored"));
    await writeFile(join(root, name), "first");
    await writeFile(join(root, "tracked.txt"), "keep this tracked edit");
    const preview = await pnwPreviewGitForcedCleanup(root);
    await writeFile(join(root, name), "later content");
    await expect(pnwExecuteGitForcedCleanup(preview)).rejects.toThrow("已变化");
    expect(await readFile(join(root, name), "utf8")).toBe("later content");
    expect(await readFile(join(root, "tracked.txt"), "utf8")).toBe("keep this tracked edit");
  });

  it("Git 拒绝既有 ignored 目录内新增文件，即使 dry-run 仍只显示目录名", async () => {
    const root = await pnwGitFixture();
    await mkdir(join(root, "ignored"));
    await writeFile(join(root, "ignored", "first.obj"), "first");
    const preview = await pnwPreviewGitForcedCleanup(root);
    await writeFile(join(root, "ignored", "late.obj"), "late");
    expect((await pnwPreviewGitForcedCleanup(root)).cleanDryRun).toBe(preview.cleanDryRun);
    await expect(pnwExecuteGitForcedCleanup(preview)).rejects.toThrow("已变化");
    expect(await readFile(join(root, "ignored", "late.obj"), "utf8")).toBe("late");
  });

  it("Git 目标使用 NUL 列表冻结，支持中文、空格、引号与换行文件名", async () => {
    const root = await pnwGitFixture();
    const names = ["中文 文件.obj", " name with spaces .obj", "quote\"file.obj", "line\nbreak.obj"];
    for (const name of names) await writeFile(join(root, name), "temporary");
    const preview = await pnwPreviewGitForcedCleanup(root);
    expect(preview.cleanTargets.map((target) => target.path).sort()).toEqual(names.map((name) => join(preview.repository, name)).sort());
    await pnwExecuteGitForcedCleanup(preview);
    for (const name of names) await expect(access(join(root, name))).rejects.toThrow();
  });

  it("Git 清理未跟踪目录链接不跟随到仓库外", async () => {
    const root = await pnwGitFixture();
    const outside = await mkdtemp(join(tmpdir(), "pnw-git-clean-outside-"));
    pnwCleanupTestRoots.push(outside);
    await writeFile(join(outside, "keep.txt"), "outside");
    await symlink(outside, join(root, "external"), process.platform === "win32" ? "junction" : "dir");
    const preview = await pnwPreviewGitForcedCleanup(root);
    expect(preview.cleanTargets[0]?.tree).toHaveLength(1);
    await pnwExecuteGitForcedCleanup(preview);
    expect(await readFile(join(outside, "keep.txt"), "utf8")).toBe("outside");
  });

  it("Git 旧版无完整目标快照必须重新预览，不能先 reset", async () => {
    const root = await pnwGitFixture();
    await writeFile(join(root, "tracked.txt"), "keep tracked edit");
    const preview = await pnwPreviewGitForcedCleanup(root);
    const { cleanTargets: _removed, ...legacy } = preview;
    await expect(pnwExecuteGitForcedCleanup(legacy as typeof preview)).rejects.toThrow("重新预览");
    expect(await readFile(join(root, "tracked.txt"), "utf8")).toBe("keep tracked edit");
  });

  it("Git 取消可在 reset 前保护改动，或在 reset 后停止 clean", async () => {
    const root = await pnwGitFixture();
    await writeFile(join(root, "tracked.txt"), "modified");
    await writeFile(join(root, "untracked.txt"), "keep untracked");
    const preview = await pnwPreviewGitForcedCleanup(root);
    await expect(pnwExecuteGitForcedCleanup(preview, { shouldContinue: () => false }))
      .rejects.toThrow("清理已取消");
    expect(await readFile(join(root, "tracked.txt"), "utf8")).toBe("modified");

    const shouldContinue = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    await expect(pnwExecuteGitForcedCleanup(preview, { shouldContinue })).rejects.toThrow("Git reset --hard 已完成；未继续 clean");
    expect(shouldContinue).toHaveBeenCalledTimes(2);
    expect(await readFile(join(root, "tracked.txt"), "utf8")).toBe("original\n");
    expect(await readFile(join(root, "untracked.txt"), "utf8")).toBe("keep untracked");
  });

  it("Git 冻结并删除空的未跟踪目录和 ignored 目录", async () => {
    const root = await pnwGitFixture();
    await mkdir(join(root, "empty"));
    await mkdir(join(root, "ignored"));
    const preview = await pnwPreviewGitForcedCleanup(root);
    expect(preview.cleanTargets).toHaveLength(2);
    await pnwExecuteGitForcedCleanup(preview);
    await expect(access(join(root, "empty"))).rejects.toThrow();
    await expect(access(join(root, "ignored"))).rejects.toThrow();
  });

  it("Git 拒绝仅暂存区内容变化，即使工作树和 status 不变", async () => {
    const root = await pnwGitFixture();
    const tracked = join(root, "tracked.txt");
    await writeFile(tracked, "index one");
    await pnwExecFile("git", ["-C", root, "add", "tracked.txt"]);
    await writeFile(tracked, "worktree unchanged");
    const preview = await pnwPreviewGitForcedCleanup(root);
    await writeFile(tracked, "index two");
    await pnwExecFile("git", ["-C", root, "add", "tracked.txt"]);
    await writeFile(tracked, "worktree unchanged");
    const current = await pnwPreviewGitForcedCleanup(root);
    expect(current.trackedDiff).toBe(preview.trackedDiff);
    expect(current.trackedStatus).toBe(preview.trackedStatus);
    expect(current.trackedIndexDiff).not.toBe(preview.trackedIndexDiff);
    await expect(pnwExecuteGitForcedCleanup(preview)).rejects.toThrow("自确认预览后已变化");
    expect((await pnwExecFile("git", ["-C", root, "show", ":tracked.txt"])).stdout).toBe("index two");
    expect(await readFile(tracked, "utf8")).toBe("worktree unchanged");
  });
});
