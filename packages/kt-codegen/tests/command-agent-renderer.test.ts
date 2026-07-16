// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { ktCodegenCreateCommandAgentController } from "./command-agent-fixtures.js";
import { ktCodegenReadFixture } from "./helpers.js";

const COMMAND_AGENT_LIFECYCLE_BLOCKS = [
  "CMD AGENT DECLARE",
  "CMD AGENT CONSTRUCTOR",
  "CMD AGENT DESTRUCTOR",
] as const;

describe("KtCodegenRenderer CAA Command Agent lifecycle blocks", () => {
  it("matches the three archived macro outputs without mutating shared data", () => {
    const controller = ktCodegenCreateCommandAgentController();
    const text = ktCodegenReadFixture("source/command-agent-lifecycle.cpp");
    const before = JSON.stringify(controller.param);
    const plan = controller.analyze({
      targets: ["caa.control"],
      blockKeys: COMMAND_AGENT_LIFECYCLE_BLOCKS,
      snapshot: {
        files: [{ path: "command.cpp", text, fingerprint: "fixture:agent-life" }],
      },
    });

    expect(plan.phase).toBe("preview");
    expect(plan.canApply).toBe(true);
    expect(plan.diagnostics).toEqual([]);
    expect(plan.targets).toEqual([
      {
        target: "caa.control",
        rendererId: "kt.codegen.renderer.caa",
        status: "ready",
        artifactCount: 3,
      },
    ]);

    const expected = new Map([
      [
        "CMD AGENT DECLARE",
        ktCodegenReadFixture("expected/command-agent-lifecycle/declare.txt"),
      ],
      [
        "CMD AGENT CONSTRUCTOR",
        ktCodegenReadFixture("expected/command-agent-lifecycle/constructor.txt"),
      ],
      [
        "CMD AGENT DESTRUCTOR",
        ktCodegenReadFixture("expected/command-agent-lifecycle/destructor.txt"),
      ],
    ]);
    expect(plan.artifacts).toHaveLength(expected.size);
    for (const artifact of plan.artifacts) {
      expect(artifact.content).toBe(expected.get(artifact.blockKey));
      expect(artifact.sourceParameters).toEqual(["OriginSpec", "Targets", "View"]);
    }
    expect(JSON.stringify(controller.param)).toBe(before);
  });

  it("keeps caa.control ready after all Command blocks are migrated", () => {
    const controller = ktCodegenCreateCommandAgentController();
    const text = ktCodegenReadFixture("source/command-agent-lifecycle.cpp");
    const plan = controller.analyze({
      targets: ["caa.control"],
      snapshot: {
        files: [{ path: "command.cpp", text, fingerprint: "fixture:agent-partial" }],
      },
    });

    expect(plan.targets[0]).toMatchObject({ status: "ready", artifactCount: 3 });
    expect(plan.canApply).toBe(true);
    expect(plan.diagnostics).toEqual([]);
  });
});
