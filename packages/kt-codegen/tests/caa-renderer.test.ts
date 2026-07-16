// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { KtCodegenBlockKey } from "../src/blocks/index.js";
import { KtCodegenController } from "../src/KtCodegenController.js";
import { KtCodegenItem } from "../src/KtCodegenItem.js";
import { ktCodegenReadFixture } from "./helpers.js";

const CAA_INTERFACE_BLOCKS = [
  "IMPLEMENTS HEAD GET",
  "IMPLEMENTS HEAD SET",
  "INTERFACES HEAD GET",
  "INTERFACES HEAD SET",
] as const satisfies readonly KtCodegenBlockKey[];

const CAA_INTERFACE_GOLDENS: Readonly<Partial<Record<KtCodegenBlockKey, string>>> = {
  "IMPLEMENTS HEAD GET": "expected/caa-interface/implements-head-get.txt",
  "IMPLEMENTS HEAD SET": "expected/caa-interface/implements-head-set.txt",
  "INTERFACES HEAD GET": "expected/caa-interface/interfaces-head-get.txt",
  "INTERFACES HEAD SET": "expected/caa-interface/interfaces-head-set.txt",
};

function loadedController(): KtCodegenController {
  const controller = new KtCodegenController();
  expect(controller.readJson(ktCodegenReadFixture("legacy-v4/basic.json")).ok).toBe(true);
  return controller;
}

describe("KtCodegenRenderer CAA interface header blocks", () => {
  it("matches implementation and pure virtual Get/Set golden blocks", () => {
    const controller = loadedController();
    const text = ktCodegenReadFixture("source/caa-interface-heads.hpp");
    const originalParam = JSON.stringify(controller.param);
    const plan = controller.analyze({
      targets: ["caa.core", "caa.model"],
      blockKeys: CAA_INTERFACE_BLOCKS,
      snapshot: {
        files: [
          {
            path: "caa-interface-heads.hpp",
            text,
            fingerprint: "fixture:caa-interface",
            eol: "lf",
          },
        ],
      },
    });

    expect(plan.phase).toBe("preview");
    expect(plan.targets.map((target) => target.status)).toEqual(["ready", "ready"]);
    expect(plan.targets.map((target) => target.artifactCount)).toEqual([2, 2]);
    expect(plan.artifacts).toHaveLength(4);
    expect(plan.canApply).toBe(true);
    expect(plan.diagnostics).toEqual([]);

    const regions = new Set(plan.markerRegions.map((region) => region.id));
    for (const artifact of plan.artifacts) {
      const goldenPath = CAA_INTERFACE_GOLDENS[artifact.blockKey];
      expect(goldenPath).toBeDefined();
      expect(artifact.content, artifact.blockKey).toBe(ktCodegenReadFixture(goldenPath!));
      expect(regions.has(artifact.regionId)).toBe(true);
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

  it("keeps caa.model ready when all model blocks are migrated", () => {
    const controller = loadedController();
    const text = ktCodegenReadFixture("source/caa-interface-heads.hpp");
    const plan = controller.analyze({
      targets: ["caa.model"],
      snapshot: {
        files: [{ path: "model.hpp", text, fingerprint: "fixture:partial-model" }],
      },
    });

    expect(plan.targets[0]).toMatchObject({ status: "ready", artifactCount: 2 });
    expect(plan.canApply).toBe(true);
    expect(plan.diagnostics).toEqual([]);
  });

  it("preserves legacy ID filtering and list classification order", () => {
    const controller = loadedController();
    controller.param.items.splice(
      0,
      controller.param.items.length,
      new KtCodegenItem({
        nameSuffix: "Filter",
        id: 0,
        name: "Zero",
        paramString: "Zero",
        dataType: "int",
      }),
      new KtCodegenItem({
        nameSuffix: "Filter",
        id: -1,
        paramString: "MinusOne",
        dataType: "int",
      }),
      new KtCodegenItem({
        nameSuffix: "Filter",
        id: 100,
        paramString: "ReservedStart",
        dataType: "int",
      }),
      new KtCodegenItem({
        nameSuffix: "Filter",
        id: 199,
        paramString: "ReservedEnd",
        dataType: "int",
      }),
      new KtCodegenItem({
        nameSuffix: "Filter",
        id: 200,
        name: "Point",
        paramString: "Point",
        dataType: "CATMathPoint",
        isList: true,
      }),
      new KtCodegenItem({
        nameSuffix: "Filter",
        id: 201,
        name: "List",
        paramString: "List",
        dataType: "double",
        isList: true,
      }),
      new KtCodegenItem({
        nameSuffix: "Other",
        id: 1,
        paramString: "OtherSuffix",
        dataType: "int",
      }),
    );
    const marker = controller.core.marker;
    const text = [
      marker.createStart(controller.param, "Filter", "IMPLEMENTS HEAD GET"),
      "stale",
      marker.createEnd(controller.param, "Filter", "IMPLEMENTS HEAD GET"),
      marker.createStart(controller.param, "Filter", "IMPLEMENTS HEAD SET"),
      "stale",
      marker.createEnd(controller.param, "Filter", "IMPLEMENTS HEAD SET"),
      "",
    ].join("\n");
    const plan = controller.analyze({
      targets: ["caa.core"],
      blockKeys: ["IMPLEMENTS HEAD GET", "IMPLEMENTS HEAD SET"],
      snapshot: { files: [{ path: "filter.hpp", text, fingerprint: "fixture:filter" }] },
    });
    const get = plan.artifacts.find(
      (artifact) => artifact.blockKey === "IMPLEMENTS HEAD GET",
    )!;
    const set = plan.artifacts.find(
      (artifact) => artifact.blockKey === "IMPLEMENTS HEAD SET",
    )!;

    expect(get.sourceParameters).toEqual(["Zero", "Point", "List"]);
    expect(get.content).toContain("int GetZero() const;");
    expect(get.content).toContain("CATMathPoint GetPoint() const;");
    expect(get.content).toContain("HRESULT GetList(double& value) const;");
    expect(set.sourceParameters).toEqual(["Zero", "Point", "List"]);
    expect(get.content).not.toContain("MinusOne");
    expect(get.content).not.toContain("Reserved");
    expect(get.content).not.toContain("OtherSuffix");
  });
});
