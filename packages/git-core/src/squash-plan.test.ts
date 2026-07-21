import { describe, expect, it } from "vitest";
import { pnwCreateGitSquashDraft, pnwPlanGitSquash } from "./squash-plan.js";
import type { PnwGitCommitRecord } from "./types.js";

function record(oid: string, parentOid: string, subject = oid): PnwGitCommitRecord {
  return {
    oid,
    parentOids: [parentOid],
    treeOid: `tree-${oid}`,
    author: { name: `author-${oid}`, email: `${oid}@example.com`, date: "2026-07-18T10:00:00+08:00" },
    committer: { name: `committer-${oid}`, email: `${oid}@example.com`, date: "2026-07-18T11:00:00+08:00" },
    subject,
    body: "",
    hasSignature: false,
    extraHeaders: [],
  };
}

const history = [
  record("a000000", "base000"),
  record("b000000", "a000000", "B"),
  record("c000000", "b000000", "C"),
  record("d000000", "c000000", "D"),
  record("e000000", "d000000", "E"),
  record("f000000", "e000000", "F"),
];

describe("Git squash plan", () => {
  it("allows a contiguous middle range and identifies descendants to replay", () => {
    const plan = pnwPlanGitSquash({
      history,
      selectedOids: ["b000000", "c000000", "d000000"],
      currentRef: "refs/heads/main",
      detached: false,
      clean: true,
      operationState: "idle",
    });
    expect(plan.valid).toBe(true);
    expect(plan.baseParentOid).toBe("a000000");
    expect(plan.selectedOids).toEqual(["b000000", "c000000", "d000000"]);
    expect(plan.replayOids).toEqual(["e000000", "f000000"]);
    expect(plan.oldHeadOid).toBe("f000000");
  });

  it("blocks unsafe topology and signatures while reporting shared-history warnings", () => {
    const signed = history.map((commit) => commit.oid === "c000000" ? { ...commit, hasSignature: true } : commit);
    const plan = pnwPlanGitSquash({
      history: signed,
      selectedOids: ["b000000", "d000000"],
      currentRef: "refs/heads/main",
      detached: false,
      clean: true,
      operationState: "idle",
      remoteReachableOids: ["e000000"],
      refTargets: [{ name: "refs/tags/release", oid: "f000000" }],
    });
    expect(plan.valid).toBe(false);
    expect(plan.blockers.map((blocker) => blocker.code)).toEqual(expect.arrayContaining([
      "selection-not-contiguous",
      "signed-commit",
    ]));
    expect(plan.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining([
      "remote-history",
      "occupied-ref",
    ]));
  });

  it("allows shared history after callers explicitly acknowledge its warnings", () => {
    const plan = pnwPlanGitSquash({
      history,
      selectedOids: ["b000000", "c000000"],
      currentRef: "refs/heads/main",
      detached: false,
      clean: true,
      operationState: "idle",
      remoteReachableOids: ["e000000"],
      refTargets: [{ name: "refs/heads/other", oid: "f000000" }],
    });
    expect(plan.valid).toBe(true);
    expect(plan.blockers).toEqual([]);
    expect(plan.warnings.map((warning) => warning.code)).toEqual(["remote-history", "occupied-ref"]);
  });

  it("defaults message, people and time to the selected tip", () => {
    const draft = pnwCreateGitSquashDraft(history, ["b000000", "c000000", "d000000"]);
    expect(draft.message).toBe("B\n\nC\n\nD");
    expect(draft.author.name).toBe("author-d000000");
    expect(draft.committer.name).toBe("committer-d000000");
  });
});
