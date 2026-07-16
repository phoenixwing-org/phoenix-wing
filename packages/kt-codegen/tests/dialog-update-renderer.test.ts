// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { ktCodegenCreateDialogUpdateController } from "./dialog-update-fixtures.js";
import { ktCodegenReadFixture } from "./helpers.js";

describe("KtCodegenRenderer CAA/Qt dialog update blocks", () => {
  it("matches four legacy update goldens without mutating shared data", () => {
    const controller = ktCodegenCreateDialogUpdateController();
    const text = ktCodegenReadFixture("source/dialog-updates.cpp");
    const before = JSON.stringify(controller.param);
    const plan = controller.analyze({
      targets: ["caa.dialog", "qt.dialog", "qt.parameter"],
      blockKeys: [
        "UPDATE DIALOG",
        "UPDATE INFORS",
        "QT UPDATE DIALOG",
        "QT UPDATE INFORS",
      ],
      snapshot: {
        files: [
          {
            path: "dialog-updates.cpp",
            text,
            fingerprint: "fixture:dialog-updates",
          },
        ],
      },
    });

    expect(plan.phase).toBe("preview");
    expect(plan.canApply).toBe(true);
    expect(plan.diagnostics).toEqual([]);
    expect(plan.targets).toEqual([
      {
        target: "caa.dialog",
        rendererId: "kt.codegen.renderer.caa",
        status: "ready",
        artifactCount: 2,
      },
      {
        target: "qt.dialog",
        rendererId: "kt.codegen.renderer.qt",
        status: "ready",
        artifactCount: 1,
      },
      {
        target: "qt.parameter",
        rendererId: "kt.codegen.renderer.qt",
        status: "ready",
        artifactCount: 1,
      },
    ]);

    const expected = new Map([
      [
        "UPDATE DIALOG",
        ktCodegenReadFixture("expected/dialog-updates/caa-update-dialog.txt"),
      ],
      [
        "UPDATE INFORS",
        ktCodegenReadFixture("expected/dialog-updates/caa-update-infors.txt"),
      ],
      [
        "QT UPDATE DIALOG",
        ktCodegenReadFixture("expected/dialog-updates/qt-update-dialog.txt"),
      ],
      [
        "QT UPDATE INFORS",
        ktCodegenReadFixture("expected/dialog-updates/qt-update-infors.txt"),
      ],
    ]);
    expect(plan.artifacts).toHaveLength(expected.size);
    for (const artifact of plan.artifacts) {
      expect(artifact.content).toBe(expected.get(artifact.blockKey));
      expect(artifact.regionId).not.toBe("");
      const suffix = artifact.blockKey.startsWith("QT ") ? "Qt" : "Caa";
      expect(artifact.sourceParameters).toEqual(
        controller.param.items
          .filter((item) => item.nameSuffix === suffix && item.id >= 1)
          .map((item) => item.paramString),
      );
    }

    const caaRadio = controller.param.items.find(
      (item) => item.nameSuffix === "Caa" && item.paramString === "Mode",
    );
    const qtRadio = controller.param.items.find(
      (item) => item.nameSuffix === "Qt" && item.paramString === "Mode",
    );
    expect(caaRadio?.componentCount).toBe(1);
    expect(qtRadio?.componentCount).toBe(1);
    expect(JSON.stringify(controller.param)).toBe(before);
  });

  it("preserves audited legacy asymmetries and visible generator defects", () => {
    const controller = ktCodegenCreateDialogUpdateController();
    const text = ktCodegenReadFixture("source/dialog-updates.cpp");
    const plan = controller.analyze({
      targets: ["qt.dialog", "qt.parameter"],
      snapshot: {
        files: [
          {
            path: "dialog-updates.cpp",
            text,
            fingerprint: "fixture:legacy-asymmetry",
          },
        ],
      },
    });
    const updateDialog = plan.artifacts.find(
      (artifact) => artifact.blockKey === "QT UPDATE DIALOG",
    )?.content;
    const updateInfors = plan.artifacts.find(
      (artifact) => artifact.blockKey === "QT UPDATE INFORS",
    )?.content;

    expect(plan.targets.every((target) => target.status === "ready")).toBe(true);
    expect(updateDialog).toContain(
      "legacy asymmetric listData type is not suitable for auto code.",
    );
    expect(updateInfors).toContain(
      "parameter->Float_Values[0] = ui->doubleSpinBoxFloatValues0->value();",
    );
    expect(updateDialog).toContain(
      "QString::fromLocal8Bit({strParamSame}.str())",
    );
    expect(updateInfors).toContain("parameter->Mode = (GuardMode)1;}");
  });
});
