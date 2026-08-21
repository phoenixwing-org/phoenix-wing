// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  pnwProjectGitCommitGraphRows,
  type PnwGitCommitGraphCommit,
} from "./commit-graph.js";

const OIDS = Array.from({ length: 7 }, (_, index) => `${index + 1}`.repeat(40));

function commit(index: number, parents: readonly number[]): PnwGitCommitGraphCommit {
  return {
    oid: OIDS[index]!,
    parentOids: parents.map((parent) => OIDS[parent]!),
    subject: `commit-${index}`,
    author: { name: "Phoenix Wing", email: "wing@example.com", date: "1 +0000" },
    committer: { name: "Phoenix Wing", email: "wing@example.com", date: "1 +0000" },
    decorations: [],
  };
}

describe("pnwProjectGitCommitGraphRows", () => {
  it("projects merge parents and keeps lane continuation across pages", () => {
    const first = pnwProjectGitCommitGraphRows([
      commit(0, [1, 2]),
      commit(1, [3]),
    ]);

    expect(first.rows[0]).toEqual(expect.objectContaining({
      commitOid: OIDS[0],
      lane: 0,
      lanesBefore: [OIDS[0]],
      lanesAfter: [OIDS[1], OIDS[2]],
      parentEdges: [
        { parentOid: OIDS[1], fromLane: 0, toLane: 0, kind: "first-parent" },
        { parentOid: OIDS[2], fromLane: 0, toLane: 1, kind: "merge-parent" },
      ],
    }));
    expect(first.nextLaneOids).toEqual([OIDS[3], OIDS[2]]);

    const second = pnwProjectGitCommitGraphRows([
      commit(2, [3]),
      commit(3, []),
    ], first.nextLaneOids);
    expect(second.rows[0]).toEqual(expect.objectContaining({
      lane: 1,
      lanesBefore: [OIDS[3], OIDS[2]],
      lanesAfter: [OIDS[3]],
    }));
    expect(second.nextLaneOids).toEqual([]);
  });

  it("adds disconnected local branch tips without shifting live lanes", () => {
    const projected = pnwProjectGitCommitGraphRows([
      commit(0, [1]),
      commit(4, [5]),
    ]);
    expect(projected.rows[1]).toEqual(expect.objectContaining({
      lane: 1,
      lanesBefore: [OIDS[1], OIDS[4]],
      lanesAfter: [OIDS[1], OIDS[5]],
    }));
  });

  it("rejects duplicate commit and lane identities", () => {
    expect(() => pnwProjectGitCommitGraphRows([commit(0, []), commit(0, [])]))
      .toThrow("Duplicate Git graph commit OID");
    expect(() => pnwProjectGitCommitGraphRows([], [OIDS[0]!, OIDS[0]!]))
      .toThrow("Duplicate Git graph initial lane OID");
  });
});
