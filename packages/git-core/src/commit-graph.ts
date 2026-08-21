// SPDX-License-Identifier: Apache-2.0

import type { PnwGitIdentity } from "./types.js";

export type PnwGitCommitGraphDecorationKind = "head" | "local-branch" | "tag";

export interface PnwGitCommitGraphDecoration {
  /** Canonical Git identity: HEAD, refs/heads/* or refs/tags/*. */
  readonly name: string;
  readonly displayName: string;
  readonly kind: PnwGitCommitGraphDecorationKind;
}

/** Lightweight commit fields required by Git Graph-like views. */
export interface PnwGitCommitGraphCommit {
  readonly oid: string;
  readonly parentOids: readonly string[];
  readonly subject: string;
  readonly author: PnwGitIdentity;
  readonly committer: PnwGitIdentity;
  readonly decorations: readonly PnwGitCommitGraphDecoration[];
}

export type PnwGitCommitGraphParentEdgeKind = "first-parent" | "merge-parent";

export interface PnwGitCommitGraphParentEdge {
  readonly parentOid: string;
  readonly fromLane: number;
  readonly toLane: number;
  readonly kind: PnwGitCommitGraphParentEdgeKind;
}

/**
 * Pure lane projection for one newest-first, topological page.
 *
 * lanesBefore/lanesAfter deliberately expose OIDs rather than colors or SVG paths;
 * renderers can choose their own palette while retaining page-to-page continuity.
 */
export interface PnwGitCommitGraphRow {
  readonly commitOid: string;
  readonly lane: number;
  readonly laneCount: number;
  readonly lanesBefore: readonly string[];
  readonly lanesAfter: readonly string[];
  readonly parentEdges: readonly PnwGitCommitGraphParentEdge[];
}

export interface PnwGitCommitGraphProjection {
  readonly rows: readonly PnwGitCommitGraphRow[];
  /** Opaque continuation state for the next page; consumers normally use the Node cursor instead. */
  readonly nextLaneOids: readonly string[];
}

export function pnwProjectGitCommitGraphRows(
  commits: readonly PnwGitCommitGraphCommit[],
  initialLaneOids: readonly string[] = [],
): PnwGitCommitGraphProjection {
  pnwAssertUniqueGraphOids(initialLaneOids, "initial lane");
  const lanes = [...initialLaneOids];
  const seenCommitOids = new Set<string>();
  const rows: PnwGitCommitGraphRow[] = [];

  for (const commit of commits) {
    pnwAssertGraphOid(commit.oid, "commit");
    pnwAssertUniqueGraphOids(commit.parentOids, `parents of ${commit.oid}`);
    if (seenCommitOids.has(commit.oid)) {
      throw new Error(`Duplicate Git graph commit OID: ${commit.oid}`);
    }
    seenCommitOids.add(commit.oid);

    let lane = lanes.indexOf(commit.oid);
    if (lane < 0) {
      lane = lanes.length;
      lanes.push(commit.oid);
    }
    const lanesBefore = [...lanes];
    lanes.splice(lane, 1);

    let insertionIndex = Math.min(lane, lanes.length);
    for (const parentOid of commit.parentOids) {
      pnwAssertGraphOid(parentOid, `parent of ${commit.oid}`);
      if (lanes.includes(parentOid)) continue;
      lanes.splice(insertionIndex, 0, parentOid);
      insertionIndex += 1;
    }

    const lanesAfter = [...lanes];
    const parentEdges = commit.parentOids.map((parentOid, index) => ({
      parentOid,
      fromLane: lane,
      toLane: lanesAfter.indexOf(parentOid),
      kind: index === 0 ? "first-parent" as const : "merge-parent" as const,
    }));
    rows.push({
      commitOid: commit.oid,
      lane,
      laneCount: Math.max(1, lanesBefore.length, lanesAfter.length),
      lanesBefore,
      lanesAfter,
      parentEdges,
    });
  }

  return { rows, nextLaneOids: [...lanes] };
}

function pnwAssertUniqueGraphOids(oids: readonly string[], context: string): void {
  const seen = new Set<string>();
  for (const oid of oids) {
    pnwAssertGraphOid(oid, context);
    if (seen.has(oid)) throw new Error(`Duplicate Git graph ${context} OID: ${oid}`);
    seen.add(oid);
  }
}

function pnwAssertGraphOid(oid: string, context: string): void {
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(oid)) {
    throw new Error(`Invalid Git graph ${context} OID: ${oid}`);
  }
}
