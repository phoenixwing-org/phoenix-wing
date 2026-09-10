// SPDX-License-Identifier: Apache-2.0

import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  PNW_GIT_COMMIT_GRAPH_CURSOR_VERSION,
  pnwReadGitCommitGraphPage,
  type PnwGitCommitGraphPage,
} from "./commit-graph.js";
import { pnwRunGitCommand } from "./git-runner.js";
import { pnwReadGitRepository } from "./repository.js";
import { pnwReadGitRepositorySummary } from "./repository-summary.js";

const PNW_GRAPH_TEST_TIMEOUT_MS = 30_000;
const pnwFixtureDirectories: string[] = [];
afterEach(async () => {
  // Only mkdtemp-owned fixtures are removed, never a caller's repository.
  await Promise.all(pnwFixtureDirectories.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("date-ordered Git graph pages", () => {
  it("interleaves long parallel histories on the first page and keeps same-subject OIDs distinct", async () => {
    const fixture = await pnwCreateParallelGraphFixture();
    const first = await pnwReadGitCommitGraphPage(fixture.root, { limit: 5 });
    expect(first.headOid).toBe(fixture.mainOids[7]);
    expect(first.commits.map(({ oid }) => oid)).toEqual([
      fixture.parallelOids[7], fixture.mainOids[7], fixture.parallelOids[6], fixture.mainOids[6], fixture.parallelOids[5],
    ]);
    expect(first.commits.every(({ subject }) => subject === "Same patch title")).toBe(true);
    expect(new Set(first.commits.map(({ oid }) => oid)).size).toBe(5);
    expect(first.commits[0]!.decorations).toContainEqual(expect.objectContaining({ name: "refs/heads/parallel" }));
    expect(first.commits[1]!.decorations).toContainEqual(expect.objectContaining({ name: "HEAD" }));
    expect(first.graphRows.some(({ laneCount }) => laneCount > 1)).toBe(true);

    const pages = await pnwReadAllGraphPages(fixture.root, 5);
    const whole = await pnwReadGitCommitGraphPage(fixture.root, { limit: 100 });
    expect(pages.flatMap(({ commits }) => commits)).toEqual(whole.commits);
    expect(pages.flatMap(({ graphRows }) => graphRows)).toEqual(whole.graphRows);
    expect(whole.commits).toHaveLength(17);
    expect(new Set(whole.commits.map(({ oid }) => oid)).size).toBe(17);
    const times = whole.commits.map(({ committer }) => Number(committer.date.split(" ")[0]));
    expect(times).toEqual([...times].sort((left, right) => right - left));
    pnwExpectChildrenBeforeParents(whole);
  }, PNW_GRAPH_TEST_TIMEOUT_MS);

  it("keeps pagination deterministic for equal-time parallel chains without promising a tie order", async () => {
    const fixture = await pnwCreateParallelGraphFixture(true);
    const pages = await pnwReadAllGraphPages(fixture.root, 5);
    const whole = await pnwReadGitCommitGraphPage(fixture.root, { limit: 100 });
    expect(pages.flatMap(({ commits }) => commits)).toEqual(whole.commits);
    expect(pages.flatMap(({ graphRows }) => graphRows)).toEqual(whole.graphRows);
    expect(new Set(whole.commits.map(({ oid }) => oid)).size).toBe(17);
    expect(whole.commits.filter(({ subject }) => subject === "Same patch title")).toHaveLength(16);
    pnwExpectChildrenBeforeParents(whole);
  }, PNW_GRAPH_TEST_TIMEOUT_MS);

  it("rejects a version 1 topo-order cursor instead of continuing its skip and lanes with a new ordering", async () => {
    const fixture = await pnwCreateParallelGraphFixture();
    const first = await pnwReadGitCommitGraphPage(fixture.root, { limit: 5 });
    const payload = JSON.parse(Buffer.from(first.nextBeforeCursor!, "base64url").toString("utf8"));
    expect(PNW_GIT_COMMIT_GRAPH_CURSOR_VERSION).toBe(2);
    expect(payload.version).toBe(2);
    const oldCursor = Buffer.from(JSON.stringify({ ...payload, version: 1 }), "utf8").toString("base64url");
    await expect(pnwReadGitCommitGraphPage(fixture.root, { beforeCursor: oldCursor, limit: 5 }))
      .rejects.toThrow("Invalid Git commit graph cursor");
    const next = await pnwReadGitCommitGraphPage(fixture.root, { beforeCursor: first.nextBeforeCursor, limit: 5 });
    expect(next.commits[0]!.oid).toBe(fixture.mainOids[5]);
  }, PNW_GRAPH_TEST_TIMEOUT_MS);

  it("head scope retains merged parents and shared ancestors but excludes other branch-only tips", async () => {
    const fixture = await pnwCreateParallelGraphFixture();
    // Deliberately older than both parents: topology must take priority over dates.
    await pnwRunGitCommand(["merge", "--no-ff", "--no-gpg-sign", "-m", "Merge parallel", "parallel"], {
      cwd: fixture.root,
      env: { GIT_AUTHOR_DATE: "1710000001 +0000", GIT_COMMITTER_DATE: "1710000001 +0000" },
    });
    const mergeOid = await pnwFixtureGit(fixture.root, ["rev-parse", "HEAD"]);
    await pnwFixtureGit(fixture.root, ["switch", "-c", "unmerged", fixture.baseOid]);
    const unmergedOid = await pnwCommitFixture(fixture.root, "unmerged.txt", "not in main", 1_710_000_200);
    await pnwFixtureGit(fixture.root, ["switch", "main"]);
    const page = await pnwReadGitCommitGraphPage(fixture.root, { refsScope: "head", limit: 100 });
    expect(page.refsScope).toBe("head");
    expect(page.headOid).toBe(mergeOid);
    expect(page.commits).toHaveLength(18);
    expect(page.commits[0]).toMatchObject({ oid: mergeOid, parentOids: [fixture.mainOids[7], fixture.parallelOids[7]] });
    expect(page.commits.map(({ oid }) => oid)).not.toContain(unmergedOid);
    expect(page.commits.at(-1)!.oid).toBe(fixture.baseOid);
    expect(page.graphRows[0]!.parentEdges).toHaveLength(2);
    pnwExpectChildrenBeforeParents(page);
    const all = await pnwReadGitCommitGraphPage(fixture.root, { refsScope: "local-branches", limit: 100 });
    expect(all.commits.map(({ oid }) => oid)).toContain(unmergedOid);
  }, PNW_GRAPH_TEST_TIMEOUT_MS);

  it("keeps roots, HEAD decorations, history and index status isolated across linked worktrees", async () => {
    const fixture = await pnwCreateParallelGraphFixture();
    const linked = path.join(fixture.base, "linked");
    await pnwFixtureGit(fixture.root, ["worktree", "add", linked, "parallel"]);
    const roots = await Promise.all([realpath(fixture.root), realpath(linked)]);
    const summaries = await Promise.all([
      pnwReadGitRepositorySummary(fixture.root), pnwReadGitRepositorySummary(linked),
    ]);
    expect(summaries[0]).toMatchObject({ root: roots[0], branch: "main", currentRef: "refs/heads/main", headOid: fixture.mainOids[7] });
    expect(summaries[1]).toMatchObject({ root: roots[1], branch: "parallel", currentRef: "refs/heads/parallel", headOid: fixture.parallelOids[7] });
    const mainGraph = await pnwReadGitCommitGraphPage(fixture.root, { limit: 100 });
    const linkedGraph = await pnwReadGitCommitGraphPage(linked, { limit: 100 });
    expect(mainGraph.root).toBe(roots[0]);
    expect(linkedGraph.root).toBe(roots[1]);
    expect(mainGraph.commits.map(({ oid }) => oid)).toEqual(linkedGraph.commits.map(({ oid }) => oid));
    expect(mainGraph.commits.find(({ decorations }) => decorations.some(({ kind }) => kind === "head"))?.oid).toBe(fixture.mainOids[7]);
    expect(linkedGraph.commits.find(({ decorations }) => decorations.some(({ kind }) => kind === "head"))?.oid).toBe(fixture.parallelOids[7]);
    await expect(pnwReadGitCommitGraphPage(linked, { expectedHeadOid: mainGraph.headOid }))
      .rejects.toThrow("Git HEAD changed");
    const firstMain = await pnwReadGitCommitGraphPage(fixture.root, { limit: 5 });
    await expect(pnwReadGitCommitGraphPage(linked, { beforeCursor: firstMain.nextBeforeCursor }))
      .rejects.toThrow("Git HEAD changed");

    await writeFile(path.join(fixture.root, "main.txt"), "staged in main worktree only\n", "utf8");
    await pnwFixtureGit(fixture.root, ["add", "main.txt"]);
    const [mainSnapshot, linkedSnapshot] = await Promise.all([
      pnwReadGitRepository(fixture.root), pnwReadGitRepository(linked),
    ]);
    expect(mainSnapshot).toMatchObject({ clean: false, headOid: fixture.mainOids[7], currentRef: "refs/heads/main" });
    expect(linkedSnapshot).toMatchObject({ clean: true, headOid: fixture.parallelOids[7], currentRef: "refs/heads/parallel" });
    expect(mainSnapshot.history.map(({ oid }) => oid)).toEqual([fixture.baseOid, ...fixture.mainOids]);
    expect(linkedSnapshot.history.map(({ oid }) => oid)).toEqual([fixture.baseOid, ...fixture.parallelOids]);
  }, PNW_GRAPH_TEST_TIMEOUT_MS);
});

async function pnwReadAllGraphPages(root: string, limit: number): Promise<readonly PnwGitCommitGraphPage[]> {
  const pages: PnwGitCommitGraphPage[] = [];
  let beforeCursor: string | undefined;
  do {
    const page = await pnwReadGitCommitGraphPage(root, {
      limit, ...(beforeCursor ? { beforeCursor } : {}),
    });
    pages.push(page);
    expect(pages.length).toBeLessThan(20);
    beforeCursor = page.nextBeforeCursor;
  } while (beforeCursor);
  expect(pages.at(-1)!.hasMore).toBe(false);
  return pages;
}

function pnwExpectChildrenBeforeParents(page: PnwGitCommitGraphPage): void {
  const positions = new Map(page.commits.map(({ oid }, index) => [oid, index]));
  for (const [index, commit] of page.commits.entries()) {
    for (const parentOid of commit.parentOids) {
      expect(positions.has(parentOid)).toBe(true);
      expect(index).toBeLessThan(positions.get(parentOid)!);
    }
  }
}

async function pnwCreateParallelGraphFixture(equalTimes = false) {
  const base = await mkdtemp(path.join(os.tmpdir(), "pnw-date-graph-test-"));
  pnwFixtureDirectories.push(base);
  const root = path.join(base, "main");
  await mkdir(root);
  await pnwFixtureGit(root, ["init", "-b", "main"]);
  await pnwFixtureGit(root, ["config", "user.name", "Phoenix Wing Test"]);
  await pnwFixtureGit(root, ["config", "user.email", "wing@example.com"]);
  const baseOid = await pnwCommitFixture(root, "base.txt", "base", 1_710_000_000);
  const mainOids: string[] = [];
  const parallelOids: string[] = [];
  for (let index = 0; index < 8; index++) {
    mainOids.push(await pnwCommitFixture(root, "main.txt", String(index), 1_710_000_010 + index * 2));
  }
  await pnwFixtureGit(root, ["switch", "-c", "parallel", baseOid]);
  for (let index = 0; index < 8; index++) {
    parallelOids.push(await pnwCommitFixture(root, "parallel.txt", String(index), 1_710_000_010 + index * 2 + (equalTimes ? 0 : 1)));
  }
  await pnwFixtureGit(root, ["switch", "main"]);
  return { base, root, baseOid, mainOids, parallelOids };
}

async function pnwCommitFixture(root: string, file: string, value: string, committerEpoch: number): Promise<string> {
  await writeFile(path.join(root, file), `${value}\n`, "utf8");
  await pnwFixtureGit(root, ["add", file]);
  await pnwRunGitCommand(["commit", "--no-gpg-sign", "--no-verify", "-m", file === "base.txt" ? "Base" : "Same patch title"], {
    cwd: root,
    env: { GIT_AUTHOR_DATE: "1710000500 +0000", GIT_COMMITTER_DATE: `${committerEpoch} +0000` },
  });
  return pnwFixtureGit(root, ["rev-parse", "HEAD"]);
}

async function pnwFixtureGit(root: string, args: readonly string[]): Promise<string> {
  return (await pnwRunGitCommand(args, { cwd: root })).stdout.trim();
}
