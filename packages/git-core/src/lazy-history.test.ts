import { describe, expect, it } from "vitest";
import {
  PNW_GIT_LAZY_HISTORY_DEFAULT_EXPANDED,
  pnwApplyGitLazyHistoryPage,
  pnwCreateGitLazyHistoryState,
  pnwFailGitLazyHistoryRequest,
  pnwRequestGitLazyHistoryPage,
  pnwSetGitLazyHistoryExpanded,
} from "./lazy-history.js";
import type { PnwGitCommitSummary } from "./types.js";

const OIDS = ["a", "b", "c", "d", "e", "f"].map((value) => value.repeat(40));

function commit(index: number): PnwGitCommitSummary {
  return {
    oid: OIDS[index]!,
    author: { name: "Phoenix Wing", email: "wing@example.com", date: "1786161600 +0800" },
    committer: { name: "Phoenix Wing", email: "wing@example.com", date: "1786161600 +0800" },
    subject: `commit ${index}`,
    body: "",
  };
}

describe("lazy Git commit history", () => {
  it("stays collapsed without planning a page read, then requests one older commit on expansion", () => {
    const initial = pnwCreateGitLazyHistoryState({ expectedHeadOid: OIDS[0]!, latestCommit: commit(0) });
    expect(PNW_GIT_LAZY_HISTORY_DEFAULT_EXPANDED).toBe(false);
    expect(initial).toEqual(expect.objectContaining({ expanded: false, loading: false }));
    expect(pnwSetGitLazyHistoryExpanded(initial, false)).toEqual({ state: initial });

    const expanded = pnwSetGitLazyHistoryExpanded(initial, true);
    expect(expanded.state).toEqual(expect.objectContaining({ expanded: true, loading: true }));
    expect(expanded.request).toEqual({
      expectedHeadOid: OIDS[0],
      beforeOid: OIDS[0],
      limit: 1,
    });
    expect(pnwSetGitLazyHistoryExpanded(expanded.state, true)).toEqual({ state: expanded.state });
  });

  it("loads the next commit again after collapse and re-expansion, then supports next-five", () => {
    const initial = pnwCreateGitLazyHistoryState({ expectedHeadOid: OIDS[0]!, latestCommit: commit(0) });
    const expanded = pnwSetGitLazyHistoryExpanded(initial, true);
    const afterFirstPage = pnwApplyGitLazyHistoryPage(expanded.state, {
      headOid: OIDS[0]!,
      commits: [commit(1)],
      hasMore: true,
      nextBeforeOid: OIDS[1],
    });
    expect(afterFirstPage.commits.map(({ oid }) => oid)).toEqual([OIDS[0], OIDS[1]]);

    const collapsed = pnwSetGitLazyHistoryExpanded(afterFirstPage, false);
    expect(collapsed.request).toBeUndefined();
    const reopened = pnwSetGitLazyHistoryExpanded(collapsed.state, true);
    expect(reopened.request).toEqual({ expectedHeadOid: OIDS[0], beforeOid: OIDS[1], limit: 1 });
    const afterSecondPage = pnwApplyGitLazyHistoryPage(reopened.state, {
      headOid: OIDS[0]!,
      commits: [commit(2)],
      hasMore: true,
      nextBeforeOid: OIDS[2],
    });
    const nextFive = pnwRequestGitLazyHistoryPage(afterSecondPage, 5);
    expect(nextFive.request).toEqual({ expectedHeadOid: OIDS[0], beforeOid: OIDS[2], limit: 5 });
  });

  it("rejects stale pages and duplicate commits", () => {
    const initial = pnwCreateGitLazyHistoryState({ expectedHeadOid: OIDS[0]!, latestCommit: commit(0) });
    const expanded = pnwSetGitLazyHistoryExpanded(initial, true);
    expect(() => pnwApplyGitLazyHistoryPage(expanded.state, {
      headOid: OIDS[5]!, commits: [commit(1)], hasMore: false,
    })).toThrow("Git HEAD changed");
    expect(() => pnwApplyGitLazyHistoryPage(expanded.state, {
      headOid: OIDS[0]!, commits: [commit(0)], hasMore: false,
    })).toThrow("Duplicate Git commit");
  });

  it("does not plan while collapsed, loading or complete and preserves the cursor after a failure", () => {
    const initial = pnwCreateGitLazyHistoryState({ expectedHeadOid: OIDS[0]!, latestCommit: commit(0) });
    expect(pnwRequestGitLazyHistoryPage(initial, 5)).toEqual({ state: initial });
    const expanded = pnwSetGitLazyHistoryExpanded(initial, true);
    expect(pnwRequestGitLazyHistoryPage(expanded.state, 5)).toEqual({ state: expanded.state });
    const retryable = pnwFailGitLazyHistoryRequest(expanded.state);
    expect(retryable).toEqual(expect.objectContaining({ loading: false, nextBeforeOid: OIDS[0] }));
    expect(pnwRequestGitLazyHistoryPage(retryable, 5).request?.limit).toBe(5);

    const complete = pnwApplyGitLazyHistoryPage(
      pnwRequestGitLazyHistoryPage(retryable, 1).state,
      { headOid: OIDS[0]!, commits: [], hasMore: false },
    );
    expect(complete.nextBeforeOid).toBeUndefined();
    expect(pnwRequestGitLazyHistoryPage(complete, 1)).toEqual({ state: complete });
    const completeCollapsed = pnwSetGitLazyHistoryExpanded(complete, false).state;
    const completeReopened = pnwSetGitLazyHistoryExpanded(completeCollapsed, true);
    expect(completeReopened.request).toBeUndefined();
    expect(completeReopened.state).toEqual(expect.objectContaining({ expanded: true, hasMore: false }));
  });

  it("requires the summary latest commit to match expected HEAD", () => {
    expect(() => pnwCreateGitLazyHistoryState({
      expectedHeadOid: OIDS[0]!,
      latestCommit: commit(1),
    })).toThrow("Latest Git commit must match expected HEAD");
  });
});
