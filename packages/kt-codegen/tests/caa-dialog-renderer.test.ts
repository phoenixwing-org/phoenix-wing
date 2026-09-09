// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { KtCodegenController } from "../src/KtCodegenController.js";
import { KtCodegenItem } from "../src/KtCodegenItem.js";
import { ktCodegenReadFixture } from "./helpers.js";

function dialogController(): KtCodegenController {
  const controller = new KtCodegenController();
  controller.param.namePrefix = "Kt";
  controller.param.nameMiddle = "CourseGuard";
  const items = [
    new KtCodegenItem({
      nameSuffix: "Dlg",
      id: 1,
      paramString: "Speed_Value",
      dataType: "double",
      component: "Spinner",
      componentCount: 1,
    }),
    new KtCodegenItem({
      nameSuffix: "Dlg",
      id: 2,
      paramString: "Axis_Vector",
      dataType: "CATMathVector",
      component: "Spinner",
      componentCount: 1,
      isParamDlg: true,
    }),
    new KtCodegenItem({
      nameSuffix: "Dlg",
      id: 3,
      paramString: "Kt_Vector",
      dataType: "KtMathVector",
      component: "Spinner",
      componentCount: 1,
    }),
    new KtCodegenItem({
      nameSuffix: "Dlg",
      id: 4,
      paramString: "Enabled",
      component: "CheckButton",
      componentCount: 1,
    }),
    new KtCodegenItem({
      nameSuffix: "Dlg",
      id: 5,
      paramString: "Modes",
      component: "CheckButtonGroup",
      componentCount: 3,
    }),
    new KtCodegenItem({
      nameSuffix: "Dlg",
      id: 6,
      paramString: "Choice",
      component: "RadioButton",
      componentCount: 1,
    }),
    new KtCodegenItem({
      nameSuffix: "Dlg",
      id: 7,
      paramString: "Mode",
      component: "ComboBox",
      componentCount: 5,
    }),
    new KtCodegenItem({
      nameSuffix: "Dlg",
      id: 8,
      paramString: "Name",
      component: "Editor",
      componentCount: 1,
    }),
    new KtCodegenItem({
      nameSuffix: "Dlg",
      id: 9,
      paramString: "Dlg_Text",
      component: "Editor",
      componentCount: 2,
      isParamDlg: true,
    }),
    new KtCodegenItem({
      nameSuffix: "Dlg",
      id: 10,
      paramString: "Selector",
      component: "SelectorList",
      componentCount: 1,
    }),
    new KtCodegenItem({
      nameSuffix: "Dlg",
      id: 11,
      paramString: "NoAction",
      component: "Spinner",
      componentCount: 0,
    }),
    new KtCodegenItem({
      nameSuffix: "Dlg",
      id: 12,
      paramString: "LowerSpinner",
      component: "spinner",
      componentCount: 1,
    }),
    new KtCodegenItem({
      nameSuffix: "Dlg",
      id: 0,
      paramString: "SkippedId",
      component: "Spinner",
      componentCount: 1,
    }),
    new KtCodegenItem({
      nameSuffix: "Other",
      id: 1,
      paramString: "SkippedSuffix",
      component: "Spinner",
      componentCount: 1,
    }),
  ];
  for (const item of items) {
    if (item.dataType.length === 0) item.dataType = "int";
  }
  controller.param.items.splice(0, controller.param.items.length, ...items);
  return controller;
}

describe("KtCodegenRenderer CAA Dialog Notify block", () => {
  it("matches the corrected Combo notification and unchanged non-Combo branches without mutating shared items", () => {
    const controller = dialogController();
    const text = ktCodegenReadFixture("source/caa-dialog-notify.cpp");
    const before = JSON.stringify(controller.param);
    const radio = controller.param.items.find((item) => item.paramString === "Choice")!;
    const plan = controller.analyze({
      targets: ["caa.dialog"],
      blockKeys: ["DIALOG NOTIFY"],
      snapshot: {
        files: [{ path: "dialog.cpp", text, fingerprint: "fixture:dialog-notify" }],
      },
    });

    expect(plan.targets[0]).toMatchObject({ status: "ready", artifactCount: 1 });
    expect(plan.canApply).toBe(true);
    expect(plan.artifacts[0]!.content).toBe(
      ktCodegenReadFixture("expected/caa-dialog/dialog-notify.txt"),
    );
    expect(plan.artifacts[0]!.sourceParameters).toEqual([
      "Speed_Value",
      "Axis_Vector",
      "Kt_Vector",
      "Enabled",
      "Modes",
      "Choice",
      "Mode",
      "Name",
      "Dlg_Text",
      "Selector",
      "NoAction",
      "LowerSpinner",
    ]);
    expect(radio.componentCount).toBe(1);
    expect(JSON.stringify(controller.param)).toBe(before);
  });

  it.each([
    ["Combo", false, 1],
    ["Combo", true, 5],
    ["ComboBox", false, 5],
    ["ComboBox", true, 1],
    ["ComboCustom", false, 2],
    ["ComboCustom", true, 2],
  ] as const)("pairs %s index selection with unchanged silent refill/read (More=%s, count=%s)", (component, isParamDlg, componentCount) => {
    const controller = new KtCodegenController();
    controller.param.namePrefix = "Kt";
    controller.param.nameMiddle = "CourseGuard";
    controller.param.items.push(new KtCodegenItem({
      nameSuffix: "Dlg",
      id: 1,
      paramString: "Part_Count",
      dataType: "int",
      component,
      componentCount,
      isParamDlg,
    }));
    const before = JSON.stringify(controller.param);
    const blockKeys = ["DIALOG NOTIFY", "UPDATE DIALOG", "UPDATE INFORS"] as const;
    const text = blockKeys.map(block => [
      `  // START KEVIN CAA WIZARD SECTION KtCourseGuardDlg ${block}`,
      "  stale generated code",
      `  // END KEVIN CAA WIZARD SECTION KtCourseGuardDlg ${block}`,
    ].join("\n")).join("\n\n");
    const plan = controller.analyze({
      targets: ["caa.dialog"],
      blockKeys,
      snapshot: { files: [{ path: "combo-index.cpp", text, fingerprint: "fixture:combo-index" }] },
    });
    expect(plan.canApply).toBe(true);
    expect(plan.diagnostics).toEqual([]);
    expect(plan.artifacts).toHaveLength(3);
    const artifacts = new Map(plan.artifacts.map(artifact => [artifact.blockKey, artifact.content]));
    const control = `${isParamDlg ? "dialogMore->" : ""}_ComboPartCount`;
    const notify = artifacts.get("DIALOG NOTIFY")!;
    expect(notify).toContain(`ipDialogAgent->AcceptOnNotify(${control}, ${control}->GetComboSelectNotification());`);
    expect(notify.match(/AcceptOnNotify/g)).toHaveLength(1);
    expect(notify).not.toContain("GetComboModifyNotification");
    expect(notify).not.toContain("GetEditModifyNotification");
    expect(artifacts.get("UPDATE DIALOG")).toContain(`${control}->SetSelect( parameter->Part_Count, 0);`);
    expect(artifacts.get("UPDATE INFORS")).toContain(`parameter->Part_Count = ${control}->GetSelect();`);
    expect(artifacts.get("UPDATE DIALOG")).not.toContain("SetField");
    expect(artifacts.get("UPDATE INFORS")).not.toContain("GetField");
    expect(JSON.stringify(controller.param)).toBe(before);
  });

  it("does not add a notification for disabled Combo or change other component matching", () => {
    const controller = dialogController();
    const combo = controller.param.items.find(item => item.paramString === "Mode")!;
    combo.componentCount = 0;
    controller.param.items.push(new KtCodegenItem({ nameSuffix: "Dlg", id: 13, paramString: "QtMode", component: "QComboBox", componentCount: 1 }));
    controller.param.items.push(new KtCodegenItem({ nameSuffix: "Dlg", id: 14, paramString: "LowerMode", component: "combo", componentCount: 1 }));
    const plan = controller.analyze({
      targets: ["caa.dialog"],
      blockKeys: ["DIALOG NOTIFY"],
      snapshot: { files: [{ path: "dialog.cpp", text: ktCodegenReadFixture("source/caa-dialog-notify.cpp"), fingerprint: "fixture:combo-disabled" }] },
    });
    const content = plan.artifacts[0]!.content;
    expect(content).toContain("// 7, Mode, NO ACTION, ComboBox, 0");
    expect(content).toContain("// 13, QtMode, NOT SUPPORT, QComboBox, 1");
    expect(content).toContain("// 14, LowerMode, NOT SUPPORT, combo, 1");
    expect(content).not.toContain("GetComboSelectNotification");
    expect(content).not.toContain("GetComboModifyNotification");
    expect(content).toContain("_EditorName->GetEditModifyNotification()");
    expect(content).toContain("_SpinnerSpeedValue->GetSpinnerModifyNotification()");
    expect(content).toContain("_CheckButtonEnabled->GetChkBModifyNotification()");
    expect(content).toContain("_RadioButtonChoice0->GetRadBModifyNotification()");
  });

  it("reports caa.dialog ready after all six dialog blocks are migrated", () => {
    const controller = dialogController();
    const text = ktCodegenReadFixture("source/caa-dialog-notify.cpp");
    const plan = controller.analyze({
      targets: ["caa.dialog"],
      snapshot: {
        files: [{ path: "dialog.cpp", text, fingerprint: "fixture:partial-dialog" }],
      },
    });

    expect(plan.targets[0]).toMatchObject({ status: "ready", artifactCount: 1 });
    expect(plan.canApply).toBe(true);
    expect(plan.diagnostics).toEqual([]);
  });
});
