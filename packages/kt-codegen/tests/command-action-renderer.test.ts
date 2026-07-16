// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { ktCodegenCreateCommandActionController } from "./command-action-fixtures.js";
import { ktCodegenReadFixture } from "./helpers.js";

const COMMAND_ACTION_BLOCKS = [
  "CMD ACTION PDA",
  "CMD ACTION FIA",
  "CMD ELEMENT SELECTED",
  "CMD SET ACTIVE FIELD",
] as const;

describe("KtCodegenRenderer CAA Command Action blocks", () => {
  it("matches four archived outputs and warns for deprecated compatibility", () => {
    const controller = ktCodegenCreateCommandActionController();
    const text = ktCodegenReadFixture("source/command-actions.cpp");
    const before = JSON.stringify(controller.param);
    const plan = controller.analyze({
      targets: ["caa.control"],
      blockKeys: COMMAND_ACTION_BLOCKS,
      snapshot: {
        files: [{ path: "command.cpp", text, fingerprint: "fixture:actions" }],
      },
    });

    expect(plan.phase).toBe("preview");
    expect(plan.canApply).toBe(true);
    expect(plan.targets[0]).toMatchObject({ status: "ready", artifactCount: 4 });
    expect(plan.diagnostics).toEqual([
      {
        code: "renderer.legacy-deprecated-block",
        severity: "warning",
        message:
          "CMD ELEMENT SELECTED is retained for compatibility; its archived VB method is marked discarded.",
        path: {
          source: "renderer",
          file: "command.cpp",
          field: "CMD ELEMENT SELECTED",
        },
      },
    ]);

    const expected = new Map([
      [
        "CMD ACTION PDA",
        ktCodegenReadFixture("expected/command-actions/action-pda.txt"),
      ],
      [
        "CMD ACTION FIA",
        ktCodegenReadFixture("expected/command-actions/action-fia.txt"),
      ],
      [
        "CMD ELEMENT SELECTED",
        ktCodegenReadFixture("expected/command-actions/element-selected.txt"),
      ],
      [
        "CMD SET ACTIVE FIELD",
        ktCodegenReadFixture("expected/command-actions/set-active-field.txt"),
      ],
    ]);
    expect(plan.artifacts).toHaveLength(expected.size);
    for (const artifact of plan.artifacts) {
      expect(artifact.content).toBe(expected.get(artifact.blockKey));
      expect(artifact.sourceParameters).toEqual(["Origin", "Targets", "Multi", "View"]);
    }
    expect(JSON.stringify(controller.param)).toBe(before);
  });

  it("lets a host exclude the deprecated block without warnings", () => {
    const controller = ktCodegenCreateCommandActionController();
    const text = ktCodegenReadFixture("source/command-actions.cpp");
    const plan = controller.analyze({
      targets: ["caa.control"],
      blockKeys: ["CMD ACTION PDA", "CMD ACTION FIA", "CMD SET ACTIVE FIELD"],
      snapshot: {
        files: [{ path: "command.cpp", text, fingerprint: "fixture:no-deprecated" }],
      },
    });

    expect(plan.targets[0]).toMatchObject({ status: "ready", artifactCount: 3 });
    expect(plan.canApply).toBe(true);
    expect(plan.diagnostics).toEqual([]);
    expect(plan.artifacts.map((artifact) => artifact.blockKey)).not.toContain(
      "CMD ELEMENT SELECTED",
    );
  });
});
