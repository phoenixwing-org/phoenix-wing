import type { PnwGitCommitSummary } from "./types.js";

/** Git 历史子 Block 默认保持收缩，避免首屏产生第二次分页读取。 */
export const PNW_GIT_LAZY_HISTORY_DEFAULT_EXPANDED = false;

/** 公共交互只提供“下一条”和“下 5 条”两种有界增量。 */
export const PNW_GIT_LAZY_HISTORY_LOAD_LIMITS = [1, 5] as const;

export type PnwGitLazyHistoryLoadLimit = (typeof PNW_GIT_LAZY_HISTORY_LOAD_LIMITS)[number];

export interface PnwGitLazyHistoryCreateInput {
  /** pnwReadGitRepositorySummary 返回并固定本次浏览会话的 HEAD。 */
  readonly expectedHeadOid: string;
  /** 首屏已经读取的最新一条 commit；必须就是 expected HEAD。 */
  readonly latestCommit: PnwGitCommitSummary;
}

export interface PnwGitLazyHistoryState {
  readonly expectedHeadOid: string;
  readonly expanded: boolean;
  readonly loading: boolean;
  /** newest-first；第一项始终是 summary 已经读取的最新 commit。 */
  readonly commits: readonly PnwGitCommitSummary[];
  readonly hasMore: boolean;
  /** 下一次 OID-exclusive page 的 beforeOid。 */
  readonly nextBeforeOid?: string;
}

/** 可直接传给 pnwReadGitCommitPage 的无 Node 依赖请求字段。 */
export interface PnwGitLazyHistoryRequest {
  readonly expectedHeadOid: string;
  readonly beforeOid: string;
  readonly limit: PnwGitLazyHistoryLoadLimit;
}

/** 与 git-node PnwGitCommitPage 结构兼容的纯 Core 页结果。 */
export interface PnwGitLazyHistoryPage {
  readonly headOid: string;
  readonly commits: readonly PnwGitCommitSummary[];
  readonly nextBeforeOid?: string;
  readonly hasMore: boolean;
}

export interface PnwGitLazyHistoryTransition {
  readonly state: PnwGitLazyHistoryState;
  readonly request?: PnwGitLazyHistoryRequest;
}

export function pnwCreateGitLazyHistoryState(
  input: PnwGitLazyHistoryCreateInput,
): PnwGitLazyHistoryState {
  const expectedHeadOid = pnwNormalizeGitLazyHistoryOid(input.expectedHeadOid, "expectedHeadOid");
  const latestOid = pnwNormalizeGitLazyHistoryOid(input.latestCommit.oid, "latestCommit.oid");
  if (latestOid !== expectedHeadOid) {
    throw new Error(`Latest Git commit must match expected HEAD: ${latestOid} != ${expectedHeadOid}`);
  }
  return Object.freeze({
    expectedHeadOid,
    expanded: PNW_GIT_LAZY_HISTORY_DEFAULT_EXPANDED,
    loading: false,
    commits: Object.freeze([input.latestCommit]),
    hasMore: true,
    nextBeforeOid: latestOid,
  });
}

/**
 * 更新受控展开态。每次从收缩切到展开时规划下一条；保持当前状态不会重复请求。
 */
export function pnwSetGitLazyHistoryExpanded(
  state: PnwGitLazyHistoryState,
  expanded: boolean,
): PnwGitLazyHistoryTransition {
  if (state.expanded === expanded) return { state };
  const nextState = Object.freeze({ ...state, expanded });
  if (!expanded) return { state: nextState };
  return pnwRequestGitLazyHistoryPage(nextState, 1);
}

/** 用户显式请求“下一条”或“下 5 条”；收缩、加载中或已到底时不产生 I/O 请求。 */
export function pnwRequestGitLazyHistoryPage(
  state: PnwGitLazyHistoryState,
  limit: PnwGitLazyHistoryLoadLimit,
): PnwGitLazyHistoryTransition {
  if (!PNW_GIT_LAZY_HISTORY_LOAD_LIMITS.includes(limit)) {
    throw new Error(`Unsupported lazy Git history limit: ${limit}`);
  }
  if (!state.expanded || state.loading || !state.hasMore || !state.nextBeforeOid) {
    return { state };
  }
  const request = Object.freeze({
    expectedHeadOid: state.expectedHeadOid,
    beforeOid: state.nextBeforeOid,
    limit,
  });
  return {
    state: Object.freeze({ ...state, loading: true }),
    request,
  };
}

/** 合并 newest-first OID 页；stale HEAD 或任何重复 commit 都直接拒绝。 */
export function pnwApplyGitLazyHistoryPage(
  state: PnwGitLazyHistoryState,
  page: PnwGitLazyHistoryPage,
): PnwGitLazyHistoryState {
  if (!state.loading) throw new Error("No lazy Git history request is pending");
  const pageHeadOid = pnwNormalizeGitLazyHistoryOid(page.headOid, "page.headOid");
  if (pageHeadOid !== state.expectedHeadOid) {
    throw new Error(`Git HEAD changed: expected ${state.expectedHeadOid}, got ${pageHeadOid}`);
  }

  const visibleOids = new Set(state.commits.map((commit) => commit.oid.toLowerCase()));
  for (const commit of page.commits) {
    const oid = pnwNormalizeGitLazyHistoryOid(commit.oid, "page commit oid");
    if (visibleOids.has(oid)) throw new Error(`Duplicate Git commit in lazy history page: ${oid}`);
    visibleOids.add(oid);
  }

  const nextBeforeOid = page.nextBeforeOid === undefined
    ? undefined
    : pnwNormalizeGitLazyHistoryOid(page.nextBeforeOid, "page.nextBeforeOid");
  if (page.hasMore && !nextBeforeOid) {
    throw new Error("Lazy Git history page must provide nextBeforeOid when hasMore is true");
  }
  return Object.freeze({
    ...state,
    loading: false,
    commits: Object.freeze([...state.commits, ...page.commits]),
    hasMore: page.hasMore,
    ...(page.hasMore && nextBeforeOid ? { nextBeforeOid } : { nextBeforeOid: undefined }),
  });
}

/** 读取失败后保留原游标，允许 Host 显式重试；错误展示与 stale HEAD 刷新策略归 Host。 */
export function pnwFailGitLazyHistoryRequest(
  state: PnwGitLazyHistoryState,
): PnwGitLazyHistoryState {
  return state.loading ? Object.freeze({ ...state, loading: false }) : state;
}

function pnwNormalizeGitLazyHistoryOid(value: string, field: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(normalized)) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
  return normalized;
}
