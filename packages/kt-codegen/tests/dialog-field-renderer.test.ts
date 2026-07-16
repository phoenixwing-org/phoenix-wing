// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { ktCodegenCreateDialogFieldController } from "./dialog-field-fixtures.js";
import { ktCodegenReadFixture } from "./helpers.js";

const DIALOG_FIELD_BLOCKS = [
  "DLG DEFINE FIELD TYPE",
  "DLG SET ACTIVE FIELD",
  "DLG GET SELECTOR LIST",
] as const;

describe("KtCodegenRenderer CAA Dialog Field blocks", () => {
  it("matches the three archived VB outputs without mutating shared data", () => {
    const controller = ktCodegenCreateDialogFieldController();
    const text = ktCodegenReadFixture("source/dialog-fields.cpp");
    const before = JSON.stringify(controller.param);
    const plan = controller.analyze({
      targets: ["caa.dialog"],
      blockKeys: DIALOG_FIELD_BLOCKS,
      snapshot: {
        files: [{ path: "dialog-fields.cpp", text, fingerprint: "fixture:fields" }],
      },
    });

    expect(plan.phase).toBe("preview");
    expect(plan.canApply).toBe(true);
    expect(plan.targets).toEqual([
      {
        target: "caa.dialog",
        rendererId: "kt.codegen.renderer.caa",
        status: "ready",
        artifactCount: 3,
      },
    ]);
    expect(plan.diagnostics).toEqual([
      {
        code: "renderer.legacy-deprecated-block",
        severity: "warning",
        message:
          "DLG SET ACTIVE FIELD is retained for compatibility; its archived VB method is marked discarded.",
        path: {
          source: "renderer",
          file: "dialog-fields.cpp",
          field: "DLG SET ACTIVE FIELD",
        },
      },
      {
        code: "renderer.legacy-deprecated-block",
        severity: "warning",
        message:
          "DLG GET SELECTOR LIST is retained for compatibility; its archived VB method is marked discarded.",
        path: {
          source: "renderer",
          file: "dialog-fields.cpp",
          field: "DLG GET SELECTOR LIST",
        },
      },
    ]);

    const expected = new Map([
      [
        "DLG DEFINE FIELD TYPE",
        ktCodegenReadFixture("expected/dialog-fields/define-field-type.txt"),
      ],
      [
        "DLG SET ACTIVE FIELD",
        ktCodegenReadFixture("expected/dialog-fields/set-active-field.txt"),
      ],
      [
        "DLG GET SELECTOR LIST",
        ktCodegenReadFixture("expected/dialog-fields/get-selector-list.txt"),
      ],
    ]);
    expect(plan.artifacts).toHaveLength(expected.size);
    for (const artifact of plan.artifacts) {
      expect(artifact.content).toBe(expected.get(artifact.blockKey));
      expect(artifact.sourceParameters).toEqual([
        "OriginSpec",
        "Targets",
        "QtList",
        "Table",
        "View",
      ]);
    }
    expect(JSON.stringify(controller.param)).toBe(before);
  });

  it("keeps the archived empty GetSelectorList fallback", () => {
    const controller = ktCodegenCreateDialogFieldController();
    const nonField = controller.param.items.find(
      (item) => item.paramString === "NotField",
    )!;
    controller.param.items.splice(0, controller.param.items.length, nonField);
    const text = ktCodegenReadFixture("source/dialog-fields.cpp");
    const plan = controller.analyze({
      targets: ["caa.dialog"],
      blockKeys: ["DLG GET SELECTOR LIST"],
      snapshot: {
        files: [
          { path: "dialog-fields.cpp", text, fingerprint: "fixture:empty-fields" },
        ],
      },
    });

    expect(plan.targets[0]).toMatchObject({ status: "ready", artifactCount: 1 });
    expect(plan.canApply).toBe(true);
    expect(plan.artifacts[0]?.sourceParameters).toEqual([]);
    expect(plan.artifacts[0]?.content).toContain(
      "  // Field count = 0\n  return NULL;",
    );
    expect(plan.diagnostics).toEqual([
      expect.objectContaining({
        code: "renderer.legacy-deprecated-block",
        severity: "warning",
      }),
    ]);
  });
});
