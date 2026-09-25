import { afterEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { access, mkdir, mkdtemp, readFile, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, parse } from "node:path";
import { promisify } from "node:util";
import { pnwCleanPreviewedRecursiveArtifacts, pnwExecuteGitUntrackedCleanup, pnwPreviewCleanupArtifacts,
  pnwPreviewGitUntrackedCleanup, pnwPreviewRecursiveCleanupArtifacts } from "./cleanup.js";

const pnwExec = promisify(execFile);
const pnwRoots: string[] = [];
const PNW_RULES = "delete:\n  directories:\n    - build\n    - objects\n  files:\n    - '*.obj'";
async function pnwFixture(): Promise<string> {
  const root = await realpath(await mkdtemp(join(tmpdir(), "pnw-recursive-cleanup-"))); pnwRoots.push(root); return root;
}
async function pnwGit(root: string, ...args: string[]): Promise<string> {
  return (await pnwExec("git", ["-C", root, ...args], { encoding: "utf8" })).stdout;
}
async function pnwRepository(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
  await pnwGit(root, "init");
  await pnwGit(root, "config", "core.autocrlf", "false");
  await pnwGit(root, "config", "user.name", "Pnw Fixture");
  await pnwGit(root, "config", "user.email", "pnw@example.invalid");
  await writeFile(join(root, "tracked.txt"), "HEAD\n");
  await writeFile(join(root, ".gitignore"), "ignored/\n");
  await pnwGit(root, "add", "tracked.txt", ".gitignore");
  await pnwGit(root, "commit", "-m", "fixture");
}
afterEach(async () => { for (const root of pnwRoots.splice(0)) await rm(root, { recursive: true, force: true }); });

describe("cancellable cleanup previews", () => {
  it.each(["recursive", "git"] as const)("%s 在节点边界停止扫描，并拒绝末尾取消后的迟到结果", async (mode) => {
    const root = await pnwFixture(); await pnwRepository(root);
    await mkdir(join(root, "build", "deep"), { recursive: true });
    for (let index = 0; index < 8; index++) await writeFile(join(root, "build", "deep", `${index}.obj`), "keep");
    const preview = (shouldContinue: () => boolean) => mode === "recursive"
      ? pnwPreviewRecursiveCleanupArtifacts(root, PNW_RULES, { shouldContinue })
      : pnwPreviewGitUntrackedCleanup(root, { shouldContinue });
    let fullChecks = 0;
    await preview(() => { fullChecks++; return true; });
    expect(fullChecks).toBeGreaterThan(12);
    const limit = Math.floor(fullChecks / 2);
    let earlyChecks = 0;
    await expect(preview(() => ++earlyChecks < limit)).rejects.toThrow("清理已取消");
    expect(earlyChecks).toBe(limit);
    let lateChecks = 0;
    await expect(preview(() => ++lateChecks < fullChecks)).rejects.toThrow("清理已取消");
    expect(lateChecks).toBe(fullChecks);
    expect(await readFile(join(root, "build", "deep", "7.obj"), "utf8")).toBe("keep");
  });

  it("预览开始前已取消时不读取目标，保留旧的双参数/单参数调用兼容", async () => {
    const root = await pnwFixture(), missing = join(root, "not-created");
    await expect(pnwPreviewRecursiveCleanupArtifacts(missing, PNW_RULES, { shouldContinue: () => false })).rejects.toThrow("清理已取消");
    await expect(pnwPreviewGitUntrackedCleanup(missing, { shouldContinue: () => false })).rejects.toThrow("清理已取消");
    expect((await pnwPreviewRecursiveCleanupArtifacts(root, PNW_RULES)).matched).toEqual([]);
    expect((await pnwPreviewGitUntrackedCleanup(root)).repositories).toEqual([]);
  });
});

describe("explicit recursive cleanup", () => {
  it("保留直属 API 默认，只在显式递归模式处理深层 build/objects/obj", async () => {
    const root = await pnwFixture();
    await mkdir(join(root, "module", "build"), { recursive: true });
    await mkdir(join(root, "module", "objects"));
    await mkdir(join(root, ".git", "objects"), { recursive: true });
    await writeFile(join(root, "module", "build", "one.bin"), "generated");
    await writeFile(join(root, "module", "a.obj"), "generated");
    await writeFile(join(root, "module", "source.cpp"), "keep");
    await writeFile(join(root, ".git", "objects", "keep.obj"), "metadata");
    expect((await pnwPreviewCleanupArtifacts(root, PNW_RULES)).matched).toEqual([]);
    const preview = await pnwPreviewRecursiveCleanupArtifacts(root, PNW_RULES);
    expect(preview.matched).toHaveLength(3);
    const result = await pnwCleanPreviewedRecursiveArtifacts(preview);
    expect(result.deleted).toEqual(preview.matched);
    expect(await readFile(join(root, "module", "source.cpp"), "utf8")).toBe("keep");
    expect(await readFile(join(root, ".git", "objects", "keep.obj"), "utf8")).toBe("metadata");
  });

  it("跳过目录链接和嵌套 Git，不误报保留的 build 父目录已删除", async () => {
    const root = await pnwFixture(), external = await pnwFixture();
    await mkdir(join(root, "build"));
    await pnwRepository(join(root, "build", "nested-repo"));
    await writeFile(join(root, "build", "generated.bin"), "delete");
    await writeFile(join(external, "keep.obj"), "external");
    await symlink(external, join(root, "build", "linked"), process.platform === "win32" ? "junction" : "dir");
    const preview = await pnwPreviewRecursiveCleanupArtifacts(root, PNW_RULES);
    expect(preview.matched).toEqual([join(root, "build", "generated.bin")]);
    expect(preview.skippedPaths).toEqual(expect.arrayContaining([join(root, "build", "nested-repo"), join(root, "build", "linked")]));
    await pnwCleanPreviewedRecursiveArtifacts(preview);
    expect(existsSync(join(root, "build"))).toBe(true);
    expect(await readFile(join(external, "keep.obj"), "utf8")).toBe("external");
    expect(existsSync(join(root, "build", "nested-repo", ".git"))).toBe(true);
  });

  it("确认后中间祖先变为链接即拒绝，外部文件保持不变", async () => {
    const root = await pnwFixture(), external = await pnwFixture();
    await mkdir(join(root, "module"));
    await writeFile(join(root, "module", "a.obj"), "original");
    await writeFile(join(external, "a.obj"), "external");
    const preview = await pnwPreviewRecursiveCleanupArtifacts(root, PNW_RULES);
    await rename(join(root, "module"), join(root, "old-module"));
    await symlink(external, join(root, "module"), process.platform === "win32" ? "junction" : "dir");
    await expect(pnwCleanPreviewedRecursiveArtifacts(preview)).rejects.toThrow("祖先目录不是普通目录");
    expect(await readFile(join(external, "a.obj"), "utf8")).toBe("external");
  });

  it("完整目标树新增文件时在第一次删除前拒绝", async () => {
    const root = await pnwFixture();
    await mkdir(join(root, "build")); await writeFile(join(root, "build", "first.obj"), "first");
    await writeFile(join(root, "early.obj"), "first");
    const preview = await pnwPreviewRecursiveCleanupArtifacts(root, PNW_RULES);
    await writeFile(join(root, "build", "late.obj"), "late");
    await expect(pnwCleanPreviewedRecursiveArtifacts(preview)).rejects.toThrow("自确认预览后已变化");
    expect(existsSync(join(root, "early.obj"))).toBe(true);
  });

  it("只删冻结目标，预览后新命中保留；取消阻止后续项", async () => {
    const root = await pnwFixture();
    await writeFile(join(root, "a.obj"), "a"); await writeFile(join(root, "z.obj"), "z");
    const preview = await pnwPreviewRecursiveCleanupArtifacts(root, PNW_RULES);
    await writeFile(join(root, "late.obj"), "late");
    const error = await pnwCleanPreviewedRecursiveArtifacts(preview, {
      shouldContinue: () => existsSync(join(root, "a.obj")),
    }).catch((error: Error) => error);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("清理已取消");
    expect((error as Error).message).toContain("已完成 1 个目标，已删除 1 个节点");
    expect((error as Error).message).toContain(`当前目标：${join(root, "z.obj")}`);
    expect((error as Error).message).toContain(`已删除节点：\n${JSON.stringify(join(root, "a.obj"))}`);
    expect((error as Error).message).toContain("已删内容不自动回滚");
    expect(existsSync(join(root, "a.obj"))).toBe(false);
    expect(existsSync(join(root, "z.obj"))).toBe(true);
    expect(existsSync(join(root, "late.obj"))).toBe(true);
  });

  it("首项目已删除后下一项目变化，错误保留部分完成数量、路径和冻结失败原因", async () => {
    const root = await pnwFixture();
    await writeFile(join(root, "a.obj"), "a"); await writeFile(join(root, "z.obj"), "z");
    const preview = await pnwPreviewRecursiveCleanupArtifacts(root, PNW_RULES);
    let changed = false;
    const error = await pnwCleanPreviewedRecursiveArtifacts(preview, { shouldContinue: () => {
      if (!changed && !existsSync(join(root, "a.obj"))) {
        changed = true; writeFileSync(join(root, "z.obj"), "new contents after first deletion");
      }
      return true;
    } }).catch((error: Error) => error);
    expect((error as Error).message).toContain("已完成 1 个目标，已删除 1 个节点");
    expect((error as Error).message).toContain(`当前节点：${join(root, "z.obj")}`);
    expect((error as Error).message).toContain("自确认预览后已变化");
    expect((error as Error).message).toContain(JSON.stringify(join(root, "a.obj")));
    expect((error as Error).message).toContain("已删内容不自动回滚");
    expect(existsSync(join(root, "a.obj"))).toBe(false);
    expect(await readFile(join(root, "z.obj"), "utf8")).toBe("new contents after first deletion");
  });

  it("目录目标内部取消也报告实际删掉的节点，不把整个目录计为已完成", async () => {
    const root = await pnwFixture(), build = join(root, "build");
    await mkdir(build); await writeFile(join(build, "a.bin"), "a"); await writeFile(join(build, "z.bin"), "z");
    const preview = await pnwPreviewRecursiveCleanupArtifacts(root, PNW_RULES);
    const error = await pnwCleanPreviewedRecursiveArtifacts(preview, {
      shouldContinue: () => existsSync(join(build, "z.bin")),
    }).catch((error: Error) => error);
    expect((error as Error).message).toContain("已完成 0 个目标，已删除 1 个节点");
    expect((error as Error).message).toContain(`当前目标：${build}`);
    expect((error as Error).message).toContain(JSON.stringify(join(build, "z.bin")));
    expect((error as Error).message).toContain("清理已取消");
    expect(existsSync(build)).toBe(true);
    expect(existsSync(join(build, "a.bin"))).toBe(true);
    expect(existsSync(join(build, "z.bin"))).toBe(false);
  });

  it("拒绝文件系统根与递归 unlink 规则", async () => {
    await expect(pnwPreviewRecursiveCleanupArtifacts(parse(tmpdir()).root, PNW_RULES)).rejects.toThrow("文件系统根");
    await expect(pnwPreviewRecursiveCleanupArtifacts(await pnwFixture(), "unlinkDirectories:\n  - Kt*")).rejects.toThrow("不支持 unlinkDirectories");
  });

  it("拒绝相对路径快照，不会进入祖先回溯或删除原文件", async () => {
    const root = await pnwFixture(); await writeFile(join(root, "a.obj"), "a");
    const preview = await pnwPreviewRecursiveCleanupArtifacts(root, PNW_RULES);
    const malformed = { ...preview, targets: [{ ...preview.targets[0]!, path: "a.obj" }] };
    await expect(pnwCleanPreviewedRecursiveArtifacts(malformed)).rejects.toThrow("规范绝对路径");
    expect(existsSync(join(root, "a.obj"))).toBe(true);
  });

  it("正常执行完成后也不纳入预览后新增的独立目标", async () => {
    const root = await pnwFixture(); await writeFile(join(root, "a.obj"), "a");
    const preview = await pnwPreviewRecursiveCleanupArtifacts(root, PNW_RULES);
    await writeFile(join(root, "late.obj"), "late");
    expect((await pnwCleanPreviewedRecursiveArtifacts(preview)).deleted).toEqual([join(root, "a.obj")]);
    expect(existsSync(join(root, "late.obj"))).toBe(true);
  });
});

describe("Git untracked single-force cleanup", () => {
  it("递归发现多个仓库且 no reset，保留 staged/worktree 和非 Git 文件", async () => {
    const root = await pnwFixture(), one = join(root, "one"), two = join(root, "sub", "two");
    await pnwRepository(one); await pnwRepository(two);
    await writeFile(join(one, "tracked.txt"), "staged\n"); await pnwGit(one, "add", "tracked.txt");
    await writeFile(join(one, "tracked.txt"), "worktree\n");
    await writeFile(join(root, "outside.tmp"), "not a repository");
    await writeFile(join(one, "one.tmp"), "untracked"); await mkdir(join(two, "ignored"));
    await writeFile(join(two, "ignored", "two.tmp"), "ignored");
    const preview = await pnwPreviewGitUntrackedCleanup(root);
    expect(preview.repositories).toHaveLength(2);
    const beforeHead = await pnwGit(one, "rev-parse", "HEAD");
    const result = await pnwExecuteGitUntrackedCleanup(preview);
    expect(result.repositories.flatMap(({ deleted }) => deleted)).toHaveLength(2);
    expect(await pnwGit(one, "rev-parse", "HEAD")).toBe(beforeHead);
    expect(await pnwGit(one, "show", ":tracked.txt")).toBe("staged\n");
    expect(await readFile(join(one, "tracked.txt"), "utf8")).toBe("worktree\n");
    expect(existsSync(join(root, "outside.tmp"))).toBe(true);
  });

  it("单 force 保留嵌套仓库，literal pathspec 正确处理空格、中文、通配符及换行", async () => {
    const root = await pnwFixture(); await pnwRepository(root);
    const nested = join(root, "container", "nested"); await pnwRepository(nested);
    await writeFile(join(root, "container", "remove.tmp"), "remove");
    const special = process.platform === "win32" ? "中文 spaced.txt" : "中文 [ab]\n.tmp";
    await writeFile(join(root, special), "remove");
    const preview = await pnwPreviewGitUntrackedCleanup(root);
    expect(preview.repositories).toHaveLength(1);
    expect(preview.repositories[0]!.preservedRepositories).toContain(nested);
    expect(preview.repositories[0]!.untrackedAndIgnored).not.toContain("container");
    await pnwExecuteGitUntrackedCleanup(preview);
    expect(existsSync(join(nested, ".git"))).toBe(true);
    expect(existsSync(join(root, "container"))).toBe(true);
    expect(existsSync(join(root, "container", "remove.tmp"))).toBe(false);
    await expect(access(join(root, special))).rejects.toThrow();
  });

  it.each(["新增", "改写"])("ignored 目标内%s文件时冻结门禁拒绝", async (operation) => {
    const root = await pnwFixture(); await pnwRepository(root);
    await mkdir(join(root, "ignored")); await writeFile(join(root, "ignored", "first.tmp"), "first");
    const preview = await pnwPreviewGitUntrackedCleanup(root);
    await writeFile(join(root, "ignored", operation === "新增" ? "late.tmp" : "first.tmp"), "changed contents");
    await expect(pnwExecuteGitUntrackedCleanup(preview)).rejects.toThrow("自确认预览后已变化");
    expect(existsSync(join(root, "ignored", "first.tmp"))).toBe(true);
  });

  it("正常单 force 完成也保留新目标、嵌套边界及链接指向内容", async () => {
    const root = await pnwFixture(), outside = await pnwFixture(); await pnwRepository(root);
    await writeFile(join(outside, "keep.tmp"), "outside");
    await symlink(outside, join(root, "outside-link"), process.platform === "win32" ? "junction" : "dir");
    await writeFile(join(root, "a.tmp"), "a");
    const preview = await pnwPreviewGitUntrackedCleanup(root);
    await writeFile(join(root, "late.tmp"), "late");
    const result = await pnwExecuteGitUntrackedCleanup(preview);
    expect(result.repositories[0]!.deleted).toHaveLength(2);
    expect(existsSync(join(root, "late.tmp"))).toBe(true);
    expect(await readFile(join(outside, "keep.tmp"), "utf8")).toBe("outside");
  });

  it("新暂存内容使清理失效，未跟踪原文件仍保留", async () => {
    const root = await pnwFixture(); await pnwRepository(root); await writeFile(join(root, "untracked.tmp"), "keep");
    const preview = await pnwPreviewGitUntrackedCleanup(root);
    await writeFile(join(root, "tracked.txt"), "new stage"); await pnwGit(root, "add", "tracked.txt");
    await expect(pnwExecuteGitUntrackedCleanup(preview)).rejects.toThrow("暂存区自预览后已变化");
    expect(existsSync(join(root, "untracked.tmp"))).toBe(true);
  });

  it("不会清理后来新发现的仓库/未跟踪项，取消也不处理下一目标", async () => {
    const root = await pnwFixture(), first = join(root, "first"); await pnwRepository(first);
    await writeFile(join(first, "a.tmp"), "a"); await writeFile(join(first, "z.tmp"), "z");
    const preview = await pnwPreviewGitUntrackedCleanup(root);
    await pnwRepository(join(root, "late-repository")); await writeFile(join(first, "late.tmp"), "late");
    await expect(pnwExecuteGitUntrackedCleanup(preview, { shouldContinue: () => existsSync(join(first, "a.tmp")) }))
      .rejects.toThrow("已删内容不自动回滚");
    expect(existsSync(join(first, "a.tmp"))).toBe(false);
    expect(existsSync(join(first, "z.tmp"))).toBe(true);
    expect(existsSync(join(first, "late.tmp"))).toBe(true);
    expect(existsSync(join(root, "late-repository", "tracked.txt"))).toBe(true);
  });

  it("拒绝预览后仓库中间祖先换成链接", async () => {
    const root = await pnwFixture(), outside = await pnwFixture(), group = join(root, "group");
    await pnwRepository(join(group, "repo")); await writeFile(join(group, "repo", "keep.tmp"), "keep");
    await pnwRepository(join(outside, "repo")); await writeFile(join(outside, "repo", "keep.tmp"), "outside");
    const preview = await pnwPreviewGitUntrackedCleanup(root);
    await rename(group, join(root, "original-group")); await symlink(outside, group, process.platform === "win32" ? "junction" : "dir");
    await expect(pnwExecuteGitUntrackedCleanup(preview)).rejects.toThrow("祖先目录不是普通目录");
    expect(await readFile(join(outside, "repo", "keep.tmp"), "utf8")).toBe("outside");
  });
});
