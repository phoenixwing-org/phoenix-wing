// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { KtCodegenBlockKey } from "../src/blocks/index.js";
import { KtCodegenController } from "../src/KtCodegenController.js";
import { KtCodegenItem } from "../src/KtCodegenItem.js";
import { ktCodegenReadFixture } from "./helpers.js";

function loadedController(): KtCodegenController {
  const controller = new KtCodegenController();
  expect(controller.readJson(ktCodegenReadFixture("legacy-v4/basic.json")).ok).toBe(true);
  return controller;
}

function markerSource(
  controller: KtCodegenController,
  nameSuffix: string,
  blockKey: KtCodegenBlockKey,
  prefix = "  ",
): string {
  const marker = controller.core.marker;
  return [
    marker.createStart(controller.param, nameSuffix, blockKey, prefix),
    `${prefix}stale`,
    marker.createEnd(controller.param, nameSuffix, blockKey, prefix),
    "",
  ].join("\n");
}

describe("KtCodegenRenderer CAA Catalog and Factory blocks", () => {
  it("matches Catalog/Factory golden and completes model/feature targets", () => {
    const controller = loadedController();
    const text = ktCodegenReadFixture("source/caa-catalog-factory.cpp");
    const plan = controller.analyze({
      targets: ["caa.feature-io", "caa.model"],
      snapshot: {
        files: [
          {
            path: "caa-catalog-factory.cpp",
            text,
            fingerprint: "fixture:caa-catalog-factory",
          },
        ],
      },
    });

    expect(plan.targets.map((target) => target.status)).toEqual(["ready", "ready"]);
    expect(plan.targets.map((target) => target.artifactCount)).toEqual([1, 1]);
    expect(plan.canApply).toBe(true);
    expect(plan.diagnostics).toEqual([]);
    expect(
      plan.artifacts.find((artifact) => artifact.blockKey === "CATALOG PARAMS")!.content,
    ).toBe(ktCodegenReadFixture("expected/caa-catalog-factory/catalog-params.txt"));
    expect(
      plan.artifacts.find((artifact) => artifact.blockKey === "FACTRY ON TREE")!.content,
    ).toBe(ktCodegenReadFixture("expected/caa-catalog-factory/factry-on-tree.txt"));
  });

  it("preserves Catalog ID filtering and point/vector list registration", () => {
    const controller = loadedController();
    controller.param.items.splice(
      0,
      controller.param.items.length,
      ...[
        { id: -1, paramString: "Negative", dataType: "int" },
        { id: 0, paramString: "Point", dataType: "CATMathPoint" },
        { id: 100, paramString: "ReservedStart", dataType: "int" },
        { id: 199, paramString: "ReservedEnd", dataType: "int" },
        { id: 200, paramString: "TwoHundred", dataType: "int" },
      ].map(
        (item) =>
          new KtCodegenItem({
            nameSuffix: "Catalog",
            tcKind: "LegacyKind",
            catAttrInOut: "LegacyDirection",
            ...item,
          }),
      ),
      new KtCodegenItem({
        nameSuffix: "Other",
        id: 1,
        paramString: "OtherSuffix",
        dataType: "int",
      }),
    );
    const text = markerSource(controller, "Catalog", "CATALOG PARAMS");
    const plan = controller.analyze({
      targets: ["caa.feature-io"],
      blockKeys: ["CATALOG PARAMS"],
      snapshot: { files: [{ path: "catalog.cpp", text, fingerprint: "fixture:catalog" }] },
    });
    const artifact = plan.artifacts[0]!;

    expect(artifact.sourceParameters).toEqual(["Negative", "Point", "TwoHundred"]);
    expect(artifact.content).toContain(
      'item.SetTKListValue("Point", LegacyKind, LegacyDirection);',
    );
    expect(artifact.content).toContain(
      'item.SetValue("TwoHundred", LegacyKind, LegacyDirection);',
    );
    expect(artifact.content).not.toContain("Reserved");
    expect(artifact.content).not.toContain("OtherSuffix");
  });

  it("preserves Factory selection, type mapping and inline legacy errors", () => {
    const controller = loadedController();
    const treeItems = [
      new KtCodegenItem({
        nameSuffix: "Tree",
        id: -2,
        paramString: "BelowTemp",
        dataType: "int",
        tcKind: "tk_specobject",
        isOnTree: true,
      }),
      new KtCodegenItem({
        nameSuffix: "Tree",
        id: -1,
        paramString: "Temp",
        dataType: "int",
        tcKind: "tk_specobject",
      }),
      new KtCodegenItem({
        nameSuffix: "Tree",
        id: 1,
        paramString: "GuardLength",
        dataType: "double",
        unit: "MM",
        tcKind: "tk_specobject",
        isOnTree: true,
      }),
      new KtCodegenItem({
        nameSuffix: "Tree",
        id: 2,
        paramString: "GuardAngle",
        dataType: "double",
        unit: "Degree",
        tcKind: "tk_specobject",
        isOnTree: true,
      }),
      new KtCodegenItem({
        nameSuffix: "Tree",
        id: 3,
        paramString: "BadLength",
        dataType: "Double",
        unit: "mm",
        tcKind: "tk_specobject",
        isOnTree: true,
      }),
      ...[
        { id: 4, paramString: "Count", dataType: "int", tcKind: "wrong" },
        { id: 5, paramString: "Ratio", dataType: "double" },
        { id: 6, paramString: "Enabled", dataType: "CATBoolean" },
        { id: 7, paramString: "Label", dataType: "CATUnicodeString" },
        { id: 8, paramString: "URLValue", dataType: "UnknownType" },
      ].map(
        (item) =>
          new KtCodegenItem({
            nameSuffix: "Tree",
            tcKind: "tk_specobject",
            isOnTree: true,
            ...item,
          }),
      ),
      new KtCodegenItem({
        nameSuffix: "Tree",
        id: 9,
        paramString: "Hidden",
        dataType: "int",
        tcKind: "tk_specobject",
        isOnTree: false,
      }),
    ];
    controller.param.items.splice(0, controller.param.items.length, ...treeItems);
    const text = markerSource(controller, "Tree", "FACTRY ON TREE");
    const plan = controller.analyze({
      targets: ["caa.model"],
      blockKeys: ["FACTRY ON TREE"],
      snapshot: { files: [{ path: "factory.cpp", text, fingerprint: "fixture:factory" }] },
    });
    const artifact = plan.artifacts[0]!;

    expect(artifact.sourceParameters).toEqual([
      "Temp",
      "GuardLength",
      "GuardAngle",
      "BadLength",
      "Count",
      "Ratio",
      "Enabled",
      "Label",
      "URLValue",
    ]);
    expect(artifact.content).toContain('CreateInteger("Temp Spec", 0)');
    expect(artifact.content).toContain('CreateLength("Guard Length"');
    expect(artifact.content).toContain('CreateAngle("Guard Angle"');
    expect(artifact.content).toContain("发现错误,DataType应该是double");
    expect(artifact.content).toContain('CreateInteger("Count"');
    expect(artifact.content).toContain('CreateReal("Ratio"');
    expect(artifact.content).toContain('CreateBoolean("Enabled"');
    expect(artifact.content).toContain('CreateString("Label"');
    expect(artifact.content).toContain(
      '没有处理此类型<UnknownType>请告知杨海华("URLValue"',
    );
    expect(artifact.content).toContain("发现错误,TCKKind应该是tk_specobject");
    expect(artifact.content).toContain("ListOnTree.Append(false);");
    expect(artifact.content).not.toContain("BelowTemp");
    expect(artifact.content).not.toContain("Hidden");
  });
});
