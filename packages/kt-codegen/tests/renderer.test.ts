// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { KtCodegenBlockKey } from "../src/blocks/index.js";
import { KtCodegenController } from "../src/KtCodegenController.js";
import { KtCodegenItem } from "../src/KtCodegenItem.js";
import { ktCodegenReadFixture } from "./helpers.js";

const CPP_PARAMETER_BLOCKS = [
  "PARAM DECLARATION",
  "PARAM CONSTRUCTOR",
  "PARAM DESTRUCTOR",
  "PARAM EQUAL",
] as const satisfies readonly KtCodegenBlockKey[];

const CPP_PARAMETER_GOLDENS: Readonly<Partial<Record<KtCodegenBlockKey, string>>> = {
  "PARAM CONSTRUCTOR": "expected/cpp-parameter/param-constructor.txt",
  "PARAM DECLARATION": "expected/cpp-parameter/param-declaration.txt",
  "PARAM DESTRUCTOR": "expected/cpp-parameter/param-destructor.txt",
  "PARAM EQUAL": "expected/cpp-parameter/param-equal.txt",
};

function loadedController(): KtCodegenController {
  const controller = new KtCodegenController();
  expect(controller.readJson(ktCodegenReadFixture("legacy-v4/basic.json")).ok).toBe(true);
  return controller;
}

describe("KtCodegenRenderer C++ Parameter blocks", () => {
  it("matches the four archived VB blocks and links every artifact to a safe region", () => {
    const controller = loadedController();
    const text = ktCodegenReadFixture("source/cpp-parameter-blocks.hpp");
    const originalParam = JSON.stringify(controller.param);
    const plan = controller.analyze({
      targets: ["cpp.parameter"],
      blockKeys: CPP_PARAMETER_BLOCKS,
      snapshot: {
        files: [
          {
            path: "cpp-parameter-blocks.hpp",
            text,
            fingerprint: "fixture:cpp-parameter",
            eol: "lf",
          },
        ],
      },
    });

    expect(plan.phase).toBe("preview");
    expect(plan.targets).toEqual([
      {
        target: "cpp.parameter",
        rendererId: "kt.codegen.renderer.cpp",
        status: "ready",
        artifactCount: 4,
      },
    ]);
    expect(plan.markerRegions).toHaveLength(4);
    expect(plan.artifacts).toHaveLength(4);
    expect(plan.hasChanges).toBe(true);
    expect(plan.canApply).toBe(true);

    const regionIds = new Set(plan.markerRegions.map((region) => region.id));
    for (const artifact of plan.artifacts) {
      const goldenPath = CPP_PARAMETER_GOLDENS[artifact.blockKey];
      expect(goldenPath).toBeDefined();
      expect(artifact.content, artifact.blockKey).toBe(ktCodegenReadFixture(goldenPath!));
      expect(regionIds.has(artifact.regionId)).toBe(true);
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
    expect(text.startsWith("// outside-before")).toBe(true);
    expect(text.endsWith("// outside-after\n")).toBe(true);
  });

  it("preserves CRLF and the source region final newline", () => {
    const controller = loadedController();
    const marker = controller.core.marker;
    const start = marker.createStart(controller.param, "Item", "PARAM EQUAL");
    const end = marker.createEnd(controller.param, "Item", "PARAM EQUAL");
    const text = `${start}\r\nstale\r\n${end}\r\n`;
    const plan = controller.analyze({
      targets: ["cpp.parameter"],
      blockKeys: ["PARAM EQUAL"],
      snapshot: {
        files: [{ path: "crlf.hpp", text, fingerprint: "fixture:crlf", eol: "crlf" }],
      },
    });

    expect(plan.canApply).toBe(true);
    expect(plan.artifacts[0]!.content.endsWith("\r\n")).toBe(true);
    expect(plan.artifacts[0]!.content.replaceAll("\r\n", "")).not.toContain("\n");
  });

  it("preserves legacy pointer decisions in Equal and Destructor", () => {
    const controller = loadedController();
    controller.param.items.splice(
      0,
      controller.param.items.length,
      new KtCodegenItem({
        nameSuffix: "Ptr",
        id: 1,
        paramString: "Raw",
        dataType: "Widget*",
      }),
      new KtCodegenItem({
        nameSuffix: "Ptr",
        id: 2,
        paramString: "Spec",
        dataType: "catispecobject_VAR",
      }),
      new KtCodegenItem({
        nameSuffix: "Ptr",
        id: 3,
        paramString: "StarFirst",
        dataType: "*Odd",
      }),
      new KtCodegenItem({
        nameSuffix: "Ptr",
        id: 0,
        paramString: "Ignored",
        dataType: "int",
      }),
    );
    const marker = controller.core.marker;
    const text = [
      marker.createStart(controller.param, "Ptr", "PARAM DESTRUCTOR"),
      "stale",
      marker.createEnd(controller.param, "Ptr", "PARAM DESTRUCTOR"),
      marker.createStart(controller.param, "Ptr", "PARAM EQUAL"),
      "stale",
      marker.createEnd(controller.param, "Ptr", "PARAM EQUAL"),
      "",
    ].join("\n");
    const plan = controller.analyze({
      targets: ["cpp.parameter"],
      blockKeys: ["PARAM DESTRUCTOR", "PARAM EQUAL"],
      snapshot: { files: [{ path: "pointer.hpp", text, fingerprint: "fixture:pointer" }] },
    });
    const destructor = plan.artifacts.find(
      (artifact) => artifact.blockKey === "PARAM DESTRUCTOR",
    )!;
    const equal = plan.artifacts.find((artifact) => artifact.blockKey === "PARAM EQUAL")!;

    expect(destructor.content).toContain("Raw = NULL; // 1");
    expect(destructor.content).toContain("Spec = NULL_var; // 2");
    expect(destructor.content).toContain("StarFirst = NULL; // 3");
    expect(equal.content).toContain("// Raw = iOriginal.Raw; // 1");
    expect(equal.content).toContain("Spec = iOriginal.Spec; // 2");
    expect(equal.content).toContain("\nStarFirst = iOriginal.StarFirst; // 3");
    expect(destructor.content).not.toContain("Ignored");
    expect(equal.content).not.toContain("Ignored");
  });
});
