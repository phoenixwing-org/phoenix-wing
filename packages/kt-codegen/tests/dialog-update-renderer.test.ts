// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { KtCodegenController, KtCodegenItem } from "../src/index.js";
import { ktCodegenCreateDialogUpdateController } from "./dialog-update-fixtures.js";
import { ktCodegenReadFixture } from "./helpers.js";

describe("KtCodegenRenderer CAA/Qt dialog update blocks", () => {
  it("matches targeted Combo-note corrections and unchanged CAA/Qt update goldens without mutating shared data", () => {
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

  it.each([
    ["int", "MyType", 42, "整数选择", "SetSelect"],
    ["double", "Scale_Value", 17, "比例数值", "SetField"],
    ["CATUnicodeString", "Label", 91, "显示文字", "SetField"],
  ] as const)("UPDATE DIALOG %s Combo after NO ACTION emits its own metadata exactly once", (dataType, paramString, id, notes, method) => {
    for (const isParamDlg of [false, true]) {
      const controller = new KtCodegenController();
      controller.param.namePrefix = "Kt";
      controller.param.nameMiddle = "CourseGuard";
      controller.param.items.splice(0, controller.param.items.length,
        new KtCodegenItem({ nameSuffix: "Caa", id: 5, paramString: "FinishCalc", dataType: "int", componentCount: 0 }),
        new KtCodegenItem({ nameSuffix: "Caa", id, paramString, dataType, notes, component: "ComboBox", componentCount: 1, isParamDlg }));
      const before = JSON.stringify(controller.param);
      const text = "  // START KEVIN CAA WIZARD SECTION KtCourseGuardCaa UPDATE DIALOG\n  stale\n  // END KEVIN CAA WIZARD SECTION KtCourseGuardCaa UPDATE DIALOG";
      const plan = controller.analyze({ targets: ["caa.dialog"], blockKeys: ["UPDATE DIALOG"],
        snapshot: { files: [{ path: "memory-combo.cpp", text, fingerprint: "fixture:combo-notes" }] } });
      expect(plan.canApply).toBe(true);
      expect(plan.diagnostics).toEqual([]);
      const content = plan.artifacts[0]!.content;
      const note = `  // ${id},${paramString},${notes}`;
      const assignment = `  ${isParamDlg ? "dialogMore->" : ""}_Combo${paramString.replaceAll("_", "")}->${method}( parameter->${paramString}${method === "SetSelect" ? ", 0" : ""});`;
      expect(content).toContain(`  // 5,FinishCalc,,NO ACTION,,0\n\n${note}\n${assignment}`);
      expect(content.split(note)).toHaveLength(2);
      expect(content.split(assignment)).toHaveLength(2);
      expect(plan.artifacts[0]!.sourceParameters).toEqual(["FinishCalc", paramString]);
      expect(JSON.stringify(controller.param)).toBe(before);
    }
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
