import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { pnwRunGitCommand } from "./git-runner.js";
import { pnwAnalyzeGitSquash, pnwReadGitRepository } from "./repository.js";
import { pnwExecuteGitSquash, pnwUndoGitSquash } from "./squash-transaction.js";

const roots: string[] = [];
const GIT_INTEGRATION_TIMEOUT_MS = 30_000;
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Git Node adapter", () => {
  it("reads commits and rewrites a contiguous middle range in an isolated worktree", async () => {
    const root = await createRepository();
    const before = await pnwReadGitRepository(root);
    const bySubject = new Map(before.history.map((commit) => [commit.subject, commit]));
    const selected = ["B", "C", "D"].map((subject) => bySubject.get(subject)!.oid);
    const analysis = await pnwAnalyzeGitSquash(root, selected);
    expect(analysis.plan.valid).toBe(true);
    expect(analysis.plan.replayOids).toEqual([bySubject.get("E")!.oid, bySubject.get("F")!.oid]);
    const oldTree = before.history.at(-1)!.treeOid;
    const oldHead = before.headOid;
    await git(root, ["update-ref", "refs/kt-auto-code/backup/main", oldHead]);

    const result = await pnwExecuteGitSquash({
      repositoryRoot: root,
      selectedOids: selected,
      expectedHeadOid: oldHead,
      draft: { ...analysis.draft!, message: "BCD combined" },
    });

    const after = await pnwReadGitRepository(root);
    expect(after.clean).toBe(true);
    expect(after.history.map((commit) => commit.subject)).toEqual(["A", "BCD combined", "E", "F"]);
    expect(after.history.at(-1)!.treeOid).toBe(oldTree);
    expect(await readFile(path.join(root, "state.txt"), "utf8")).toBe("F\n");
    expect(result.rewritten).toHaveLength(2);
    expect(result.backupRef).toBe("refs/kt-auto-code/backup/main-2");

    await writeFile(path.join(root, "state.txt"), "dirty\n", "utf8");
    await expect(pnwUndoGitSquash(root, "refs/heads/main", result.newHeadOid, result.backupRef))
      .rejects.toThrow("undo preflight failed");
    expect((await pnwRunGitCommand(["rev-parse", result.backupRef], { cwd: root })).stdout.trim()).toBe(oldHead);
    await writeFile(path.join(root, "state.txt"), "F\n", "utf8");
    expect(await pnwUndoGitSquash(root, "refs/heads/main", result.newHeadOid, result.backupRef)).toBe(oldHead);
    const restored = await pnwReadGitRepository(root);
    expect(restored.history.map((commit) => commit.subject)).toEqual(["A", "B", "C", "D", "E", "F"]);
  }, GIT_INTEGRATION_TIMEOUT_MS);

  it("requires acknowledgement for remote history and never moves the remote ref", async () => {
    const root = await createRepository();
    const snapshot = await pnwReadGitRepository(root);
    await git(root, ["update-ref", "refs/remotes/origin/main", snapshot.headOid]);
    const selected = snapshot.history.slice(1, 3).map((commit) => commit.oid);
    const analysis = await pnwAnalyzeGitSquash(root, selected);
    expect(analysis.plan.valid).toBe(true);
    expect(analysis.plan.warnings.some((warning) => warning.code === "remote-history")).toBe(true);
    await expect(pnwExecuteGitSquash({
      repositoryRoot: root,
      selectedOids: selected,
      expectedHeadOid: snapshot.headOid,
      draft: analysis.draft!,
    })).rejects.toThrow("warnings require acknowledgement");
    const result = await pnwExecuteGitSquash({
      repositoryRoot: root,
      selectedOids: selected,
      expectedHeadOid: snapshot.headOid,
      draft: analysis.draft!,
      acknowledgedWarnings: ["remote-history"],
    });
    expect((await pnwRunGitCommand(["rev-parse", "refs/remotes/origin/main"], { cwd: root })).stdout.trim())
      .toBe(snapshot.headOid);
    expect(result.newHeadOid).not.toBe(snapshot.headOid);
  }, GIT_INTEGRATION_TIMEOUT_MS);

  it("reports another local branch as an overridable warning", async () => {
    const root = await createRepository();
    const snapshot = await pnwReadGitRepository(root);
    const bySubject = new Map(snapshot.history.map((commit) => [commit.subject, commit]));
    await git(root, ["switch", "-c", "other", bySubject.get("C")!.oid]);
    await writeFile(path.join(root, "other.txt"), "other\n", "utf8");
    await git(root, ["add", "other.txt"]);
    await git(root, ["commit", "-m", "Other branch"]);
    await git(root, ["switch", "main"]);

    const analysis = await pnwAnalyzeGitSquash(root, [bySubject.get("B")!.oid, bySubject.get("C")!.oid]);
    expect(analysis.plan.valid).toBe(true);
    expect(analysis.plan.warnings).toContainEqual(expect.objectContaining({
      code: "occupied-ref",
      refName: "refs/heads/other",
    }));
  }, GIT_INTEGRATION_TIMEOUT_MS);

  it("rejects a stale expected HEAD without moving the current branch", async () => {
    const root = await createRepository();
    const before = await pnwReadGitRepository(root);
    const selected = before.history.slice(1, 3).map((commit) => commit.oid);
    const analysis = await pnwAnalyzeGitSquash(root, selected);
    await writeFile(path.join(root, "state.txt"), "G\n", "utf8");
    await git(root, ["add", "state.txt"]);
    await git(root, ["commit", "-m", "G"]);
    const currentHead = (await pnwReadGitRepository(root)).headOid;

    await expect(pnwExecuteGitSquash({
      repositoryRoot: root,
      selectedOids: selected,
      expectedHeadOid: before.headOid,
      draft: analysis.draft!,
    })).rejects.toThrow("HEAD changed");

    const after = await pnwReadGitRepository(root);
    expect(after.headOid).toBe(currentHead);
    expect(after.clean).toBe(true);
    expect(after.history.at(-1)?.subject).toBe("G");
  }, GIT_INTEGRATION_TIMEOUT_MS);
});

async function createRepository(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "pnw-git-node-test-"));
  roots.push(root);
  await git(root, ["init", "-b", "main"]);
  await git(root, ["config", "user.name", "Phoenix Wing"]);
  await git(root, ["config", "user.email", "wing@example.com"]);
  for (const subject of ["A", "B", "C", "D", "E", "F"]) {
    await writeFile(path.join(root, "state.txt"), `${subject}\n`, "utf8");
    await git(root, ["add", "state.txt"]);
    await git(root, ["commit", "-m", subject]);
  }
  return root;
}

async function git(root: string, args: readonly string[]): Promise<void> {
  await pnwRunGitCommand(args, { cwd: root });
}
