// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { KtCodegenBlockKey } from "../src/blocks/index.js";
import { KtCodegenController } from "../src/KtCodegenController.js";
import { KtCodegenItem } from "../src/KtCodegenItem.js";
import { ktCodegenReadFixture } from "./helpers.js";

const CAA_FEATURE_IO_BLOCKS = [
  "IMPLEMENTS CPP GET",
  "IMPLEMENTS CPP SET",
  "IMPLEMENTS PARAM GET",
  "IMPLEMENTS PARAM SET",
] as const satisfies readonly KtCodegenBlockKey[];

const CAA_FEATURE_IO_GOLDENS: Readonly<Partial<Record<KtCodegenBlockKey, string>>> = {
  "IMPLEMENTS CPP GET": "expected/caa-feature-io/implements-cpp-get.txt",
  "IMPLEMENTS CPP SET": "expected/caa-feature-io/implements-cpp-set.txt",
  "IMPLEMENTS PARAM GET": "expected/caa-feature-io/implements-param-get.txt",
  "IMPLEMENTS PARAM SET": "expected/caa-feature-io/implements-param-set.txt",
};

function loadedController(): KtCodegenController {
  const controller = new KtCodegenController();
  expect(controller.readJson(ktCodegenReadFixture("legacy-v4/basic.json")).ok).toBe(true);
  return controller;
}

function markerSource(
  controller: KtCodegenController,
  nameSuffix: string,
  blockKeys: readonly KtCodegenBlockKey[],
): string {
  const marker = controller.core.marker;
  return [
    ...blockKeys.flatMap((blockKey) => [
      marker.createStart(controller.param, nameSuffix, blockKey, "  "),
      "  stale",
      marker.createEnd(controller.param, nameSuffix, blockKey, "  "),
    ]),
    "",
  ].join("\n");
}

describe("KtCodegenRenderer CAA Feature I/O blocks", () => {
  it("matches the four archived CPP and Param bridge golden blocks", () => {
    const controller = loadedController();
    const text = ktCodegenReadFixture("source/caa-feature-io.cpp");
    const originalParam = JSON.stringify(controller.param);
    const plan = controller.analyze({
      targets: ["caa.feature-io"],
      blockKeys: CAA_FEATURE_IO_BLOCKS,
      snapshot: {
        files: [
          {
            path: "caa-feature-io.cpp",
            text,
            fingerprint: "fixture:caa-feature-io",
            eol: "lf",
          },
        ],
      },
    });

    expect(plan.phase).toBe("preview");
    expect(plan.targets[0]).toMatchObject({ status: "ready", artifactCount: 4 });
    expect(plan.artifacts).toHaveLength(4);
    expect(plan.canApply).toBe(true);
    expect(plan.diagnostics).toEqual([]);
    for (const artifact of plan.artifacts) {
      const goldenPath = CAA_FEATURE_IO_GOLDENS[artifact.blockKey];
      expect(goldenPath).toBeDefined();
      expect(artifact.content, artifact.blockKey).toBe(ktCodegenReadFixture(goldenPath!));
      expect(artifact.sourceParameters).toEqual(["MachineId", "GuardLength"]);
    }
    let preview = text;
    const replacements = plan.artifacts
      .map((artifact) => ({
        artifact,
        region: plan.markerRegions.find((region) => region.id === artifact.regionId)!,
      }))
      .sort((left, right) => right.region.replaceStartOffset - left.region.replaceStartOffset);
    for (const { artifact, region } of replacements) {
      preview =
        preview.slice(0, region.replaceStartOffset) +
        artifact.content +
        preview.slice(region.replaceEndOffset);
    }
    expect(preview.startsWith("// outside-before\n")).toBe(true);
    expect(preview.endsWith("// outside-after\n")).toBe(true);
    expect(preview).not.toContain("stale ");
    expect(JSON.stringify(controller.param)).toBe(originalParam);
  });

  it("preserves enum, spec-object and ordered collection branches", () => {
    const controller = loadedController();
    controller.param.items.splice(
      0,
      controller.param.items.length,
      new KtCodegenItem({
        nameSuffix: "Special",
        id: 1,
        paramString: "Mode",
        dataType: "MyEnum",
        tcKind: "tk_integer",
        defaultValue: "7",
      }),
      new KtCodegenItem({
        nameSuffix: "Special",
        id: 2,
        paramString: "Spec",
        dataType: "CATISpecObject_var",
        tcKind: "TK_SPECOBJECT",
      }),
      new KtCodegenItem({
        nameSuffix: "Special",
        id: 3,
        paramString: "AxisX",
        dataType: "Kt::SpecObjectCollect",
      }),
      new KtCodegenItem({
        nameSuffix: "Special",
        id: 4,
        paramString: "Values",
        dataType: "double",
        isList: true,
      }),
      new KtCodegenItem({
        nameSuffix: "Special",
        id: 5,
        paramString: "CaseInteger",
        dataType: "MyEnum",
        tcKind: "TK_INTEGER",
        defaultValue: "1",
      }),
    );
    const text = markerSource(controller, "Special", [
      "IMPLEMENTS CPP GET",
      "IMPLEMENTS CPP SET",
    ]);
    const plan = controller.analyze({
      targets: ["caa.feature-io"],
      blockKeys: ["IMPLEMENTS CPP GET", "IMPLEMENTS CPP SET"],
      snapshot: { files: [{ path: "special.cpp", text, fingerprint: "fixture:special" }] },
    });
    const get = plan.artifacts.find(
      (artifact) => artifact.blockKey === "IMPLEMENTS CPP GET",
    )!;
    const set = plan.artifacts.find(
      (artifact) => artifact.blockKey === "IMPLEMENTS CPP SET",
    )!;

    expect(get.content).toContain("int value = (int)(7);");
    expect(get.content).toContain("return (MyEnum)value;");
    expect(get.content).toContain('ktcSpecRW.GetSpecValue("Spec", value);');
    expect(get.content).toContain("value.RemoveAll();");
    expect(get.content).toContain("value.SetIsOrderBySerial(GetIsOrderBySerialX());");
    expect(get.content).toContain('\n    return ktcSpecRW.GetListValue("AxisX", value);');
    expect(get.content).toContain("MyEnum value(1);");
    expect(set.content).toContain("int valueInput = (int)value;");
    expect(set.content).toContain('ktcSpecRW.SetSpecValue("Spec", value, checkExist);');
    expect(set.content).toContain('ktcSpecRW.SetListValue("AxisX", value, checkExist);');
    expect(set.content).toContain('ktcSpecRW.SetValue("CaseInteger", value, checkExist);');
  });

  it("keeps distinct CPP and Param bridge ID boundaries", () => {
    const controller = loadedController();
    controller.param.items.splice(
      0,
      controller.param.items.length,
      ...[
        { id: -1, paramString: "MinusOne" },
        { id: 0, paramString: "Zero" },
        { id: 99, paramString: "NinetyNine" },
        { id: 100, paramString: "OneHundred" },
        { id: 199, paramString: "OneNinetyNine" },
        { id: 200, paramString: "TwoHundred" },
      ].map(
        (item) =>
          new KtCodegenItem({
            nameSuffix: "Boundary",
            dataType: "int",
            ...item,
          }),
      ),
    );
    const text = markerSource(controller, "Boundary", CAA_FEATURE_IO_BLOCKS);
    const plan = controller.analyze({
      targets: ["caa.feature-io"],
      blockKeys: CAA_FEATURE_IO_BLOCKS,
      snapshot: { files: [{ path: "boundary.cpp", text, fingerprint: "fixture:boundary" }] },
    });
    const cppGet = plan.artifacts.find(
      (artifact) => artifact.blockKey === "IMPLEMENTS CPP GET",
    )!;
    const paramGet = plan.artifacts.find(
      (artifact) => artifact.blockKey === "IMPLEMENTS PARAM GET",
    )!;
    const paramSet = plan.artifacts.find(
      (artifact) => artifact.blockKey === "IMPLEMENTS PARAM SET",
    )!;

    expect(cppGet.sourceParameters).toEqual(["Zero", "NinetyNine", "TwoHundred"]);
    expect(paramGet.sourceParameters).toEqual(["NinetyNine"]);
    expect(paramSet.sourceParameters).toEqual(["NinetyNine"]);
  });

  it("keeps feature-io ready when all feature blocks are migrated", () => {
    const controller = loadedController();
    const text = ktCodegenReadFixture("source/caa-feature-io.cpp");
    const plan = controller.analyze({
      targets: ["caa.feature-io"],
      snapshot: {
        files: [{ path: "feature.cpp", text, fingerprint: "fixture:partial-feature" }],
      },
    });

    expect(plan.targets[0]).toMatchObject({ status: "ready", artifactCount: 4 });
    expect(plan.canApply).toBe(true);
    expect(plan.diagnostics).toEqual([]);
  });
});
