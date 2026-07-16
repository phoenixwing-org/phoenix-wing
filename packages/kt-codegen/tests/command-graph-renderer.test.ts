// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { ktCodegenCreateCommandGraphController } from "./command-graph-fixtures.js";
import { ktCodegenReadFixture } from "./helpers.js";

const COMMAND_GRAPH_STATE_BLOCKS = [
  "CMD AGENT BUILD GRAPH",
  "CMD AGENT UPDATE STATE",
  "CMD AGENT FIA CLEAR",
] as const;

describe("KtCodegenRenderer CAA Command Graph and State blocks", () => {
  it("matches three archived outputs and keeps unsupported reasons visible", () => {
    const controller = ktCodegenCreateCommandGraphController();
    const text = ktCodegenReadFixture("source/command-graph-state.cpp");
    const before = JSON.stringify(controller.param);
    const plan = controller.analyze({
      targets: ["caa.control"],
      blockKeys: COMMAND_GRAPH_STATE_BLOCKS,
      snapshot: {
        files: [{ path: "command.cpp", text, fingerprint: "fixture:graph-state" }],
      },
    });

    expect(plan.phase).toBe("preview");
    expect(plan.canApply).toBe(true);
    expect(plan.diagnostics).toEqual([]);
    expect(plan.targets[0]).toMatchObject({ status: "ready", artifactCount: 3 });

    const expected = new Map([
      [
        "CMD AGENT BUILD GRAPH",
        ktCodegenReadFixture("expected/command-graph-state/build-graph.txt"),
      ],
      [
        "CMD AGENT UPDATE STATE",
        ktCodegenReadFixture("expected/command-graph-state/update-state.txt"),
      ],
      [
        "CMD AGENT FIA CLEAR",
        ktCodegenReadFixture("expected/command-graph-state/fia-clear.txt"),
      ],
    ]);
    for (const artifact of plan.artifacts) {
      expect(artifact.content).toBe(expected.get(artifact.blockKey));
      expect(artifact.sourceParameters).toEqual([
        "GridAxis",
        "OriginPoint",
        "Targets",
        "View",
      ]);
    }
    expect(JSON.stringify(controller.param)).toBe(before);
  });

  it("keeps caa.control ready when no deprecated Action marker is present", () => {
    const controller = ktCodegenCreateCommandGraphController();
    const text = ktCodegenReadFixture("source/command-graph-state.cpp");
    const plan = controller.analyze({
      targets: ["caa.control"],
      snapshot: {
        files: [{ path: "command.cpp", text, fingerprint: "fixture:graph-partial" }],
      },
    });

    expect(plan.targets[0]).toMatchObject({ status: "ready", artifactCount: 3 });
    expect(plan.canApply).toBe(true);
    expect(plan.diagnostics).toEqual([]);
  });
});
