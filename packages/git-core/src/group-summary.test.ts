import { describe, expect, it } from "vitest";
import { pnwFormatGitGroupSummaries, pnwFormatGitGroupSummary, pnwShortestUniqueGitOid } from "./group-summary.js";
import type { PnwGitCommitRecord } from "./types.js";

const commit: PnwGitCommitRecord = {
  oid: "4b4622df4580439c1b93876a87565c2420a4f253",
  parentOids: ["8f8f40e4ddff2ae6f790801c31004c7da50851e7"],
  treeOid: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  author: { name: "Phoenix Wing", email: "3301647@qq.com", date: "2026-07-18T14:55:00+08:00" },
  committer: { name: "Phoenix Wing", email: "3301647@qq.com", date: "2026-07-18T14:55:00+08:00" },
  subject: "修复：补齐曲线分割命令构造控制符 审查：Kevin",
  body: "",
  hasSignature: false,
  extraHeaders: [],
};

describe("Git group summary", () => {
  it("formats the agreed group message and ++ code-updated marker", () => {
    expect(pnwFormatGitGroupSummary({ repositoryName: "PNXCaaStudy", upstream: "origin/sort", commit })).toEqual({
      text: "PNXCaaStudy origin/sort **Commit:** 4b4622d ++\n修复：补齐曲线分割命令构造控制符 审查：@Kevin",
      shortOid: "4b4622d",
      referenceLabel: "origin/sort",
      reviewer: "Kevin",
    });
  });

  it("uses Reviewed-by trailer and local branch fallback", () => {
    const result = pnwFormatGitGroupSummary({
      repositoryName: "repo",
      branch: "feature",
      commit: { ...commit, subject: "修复：边界", body: "Reviewed-by: Alice <alice@example.com>" },
    });
    expect(result.text).toContain("repo local/feature **Commit:** 4b4622d ++");
    expect(result.text).toContain("修复：边界 审查：@Alice");
  });

  it("extends colliding short object ids", () => {
    expect(pnwShortestUniqueGitOid("4b4622df00", ["4b4622da00"])).toBe("4b4622df");
  });

  it("does not put local repository directory names into the summary and can toggle @", () => {
    const withoutContext = pnwFormatGitGroupSummary({
      repositoryName: "PNXCaaStudy",
      upstream: "origin/sort",
      commit: { ...commit, subject: "新排序", body: "" },
      includeRepositoryContext: false,
      mentionReviewer: true,
      fallbackReviewer: "@张三",
    });
    expect(withoutContext.text).toBe("origin/sort **Commit:** 4b4622d ++\n新排序 审查：@张三");
    expect(withoutContext.reviewer).toBe("张三");

    const withoutMention = pnwFormatGitGroupSummary({
      repositoryName: "PNXCaaStudy",
      upstream: "origin/sort",
      commit,
      mentionReviewer: false,
      fallbackReviewer: "张三",
    });
    expect(withoutMention.text).toContain("审查：Kevin");
    expect(withoutMention.text).not.toContain("审查：@Kevin");
  });

  it("can append the committer time at minute precision", () => {
    const result = pnwFormatGitGroupSummary({
      repositoryName: "PNXCaaStudy",
      upstream: "origin/sort",
      commit,
      includeCommitTime: true,
    });
    expect(result.text).toContain("**Commit:** 4b4622d ++ · 2026-07-18 14:55");
  });

  it("formats multiple commits with one optional remote URL and no repeated directory name", () => {
    const result = pnwFormatGitGroupSummaries({
      repositoryName: "PNXCaaStudy",
      upstream: "origin/sort",
      remoteUrl: "https://gitee.com/PhoenixWing321/PNXCaaStudy.git",
      includeRemoteUrl: true,
      includeCommitTime: true,
      commits: [
        { ...commit, subject: "修复：补齐曲线分割命令构造控制符", body: "" },
        { ...commit, oid: "eea15a1000000000000000000000000000000000", subject: "函数拼写错误", body: "" },
      ],
      fallbackReviewer: "ymp",
    });
    expect(result.text).toBe([
      "https://gitee.com/PhoenixWing321/PNXCaaStudy.git",
      "origin/sort **Commit:** 4b4622d ++ · 2026-07-18 14:55",
      "修复：补齐曲线分割命令构造控制符 审查：@ymp",
      "origin/sort **Commit:** eea15a1 ++ · 2026-07-18 14:55",
      "函数拼写错误 审查：@ymp",
    ].join("\n"));
  });
});
