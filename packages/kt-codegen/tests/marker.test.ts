// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { KtCodegenBlockKey } from "../src/blocks/index.js";
import { KtCodegenController } from "../src/KtCodegenController.js";
import { ktCodegenReadFixture } from "./helpers.js";

const PARAM_DECLARATION: KtCodegenBlockKey = "PARAM DECLARATION";
const PARAM_EQUAL: KtCodegenBlockKey = "PARAM EQUAL";
const QT_UPDATE_DIALOG: KtCodegenBlockKey = "QT UPDATE DIALOG";
const COMMAND_RECOVERY_BLOCKS = [
  "CMD ACTION FIA",
  "CMD ACTION PDA",
  "CMD AGENT FIA CLEAR",
  "CMD AGENT UPDATE STATE",
  "CMD SET ACTIVE FIELD",
] as const satisfies readonly KtCodegenBlockKey[];

function loadedController(): KtCodegenController {
  const controller = new KtCodegenController();
  expect(controller.readJson(ktCodegenReadFixture("legacy-v4/basic.json")).ok).toBe(true);
  return controller;
}

function bomAnalysisController(): KtCodegenController {
  const controller = new KtCodegenController();
  expect(
    controller.readJson(ktCodegenReadFixture("legacy-v4/bom-analysis.json")).ok,
  ).toBe(true);
  return controller;
}

function snapshot(text: string, path = "sample.cpp") {
  return {
    files: [{ path, text, fingerprint: `fixture:${text.length}` }],
  } as const;
}

describe("KtCodegenMarker", () => {
  it("creates the exact legacy Start/End protocol with an explicit line prefix", () => {
    const controller = loadedController();
    const marker = controller.core.marker;

    expect(marker.createClassId(controller.param, "Item")).toBe("KtCourseGuardItem");
    expect(marker.createStart(controller.param, "Item", PARAM_DECLARATION, "  ")).toBe(
      "  // START KEVIN CAA WIZARD SECTION KtCourseGuardItem PARAM DECLARATION",
    );
    expect(marker.createEnd(controller.param, "Item", PARAM_DECLARATION, "  ")).toBe(
      "  // END KEVIN CAA WIZARD SECTION KtCourseGuardItem PARAM DECLARATION",
    );
  });

  it("scans multiple legacy regions with precise offsets and without mutation", () => {
    const controller = loadedController();
    const text = ktCodegenReadFixture("source/legacy-markers.cpp");
    const before = JSON.stringify(controller.param);
    const result = controller.core.marker.scan(
      controller.param,
      snapshot(text, "legacy-markers.cpp"),
      [PARAM_DECLARATION, QT_UPDATE_DIALOG],
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.regions).toHaveLength(2);
    expect(result.regions.map((region) => region.blockKey)).toEqual([
      PARAM_DECLARATION,
      QT_UPDATE_DIALOG,
    ]);
    expect(result.regions.map((region) => region.start.linePrefix)).toEqual(["  ", "\t"]);
    expect(
      text.slice(result.regions[0]!.bodyStartOffset, result.regions[0]!.bodyEndOffset),
    ).toBe("  int oldMachineId;\n  double oldGuardLength;\n");
    expect(
      text.slice(
        result.regions[1]!.replaceStartOffset,
        result.regions[1]!.replaceEndOffset,
      ),
    ).toContain("END KEVIN CAA WIZARD SECTION KtCourseGuardItem QT UPDATE DIALOG");
    expect(JSON.stringify(controller.param)).toBe(before);
  });

  it("keeps CRLF offsets exact", () => {
    const controller = loadedController();
    const marker = controller.core.marker;
    const start = marker.createStart(controller.param, "Item", PARAM_DECLARATION);
    const end = marker.createEnd(controller.param, "Item", PARAM_DECLARATION);
    const text = `before\r\n${start}\r\nold();\r\n${end}\r\nafter\r\n`;
    const result = marker.scan(controller.param, snapshot(text), [PARAM_DECLARATION]);
    const region = result.regions[0]!;

    expect(result.diagnostics).toEqual([]);
    expect(text.slice(region.bodyStartOffset, region.bodyEndOffset)).toBe("old();\r\n");
    expect(text.slice(region.replaceStartOffset, region.replaceEndOffset)).toBe(
      `${start}\r\nold();\r\n${end}\r\n`,
    );
  });

  it("diagnoses orphan and missing End markers instead of producing unsafe regions", () => {
    const controller = loadedController();
    const marker = controller.core.marker;
    const start = marker.createStart(controller.param, "Item", PARAM_DECLARATION);
    const end = marker.createEnd(controller.param, "Item", PARAM_DECLARATION);

    const orphan = marker.scan(controller.param, snapshot(`${end}\n`), [PARAM_DECLARATION]);
    expect(orphan.regions).toEqual([]);
    expect(orphan.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "marker.orphan-end",
    ]);

    const missing = marker.scan(controller.param, snapshot(`${start}\nold();\n`), [
      PARAM_DECLARATION,
    ]);
    expect(missing.regions).toEqual([]);
    expect(missing.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "marker.missing-end",
    ]);
  });

  it("recovers all five complete command blocks after a missing constructor End", () => {
    const controller = loadedController();
    const marker = controller.core.marker;
    const missingStart = marker.createStart(
      controller.param,
      "Item",
      "CMD AGENT CONSTRUCTOR",
    );
    const text = [
      missingStart,
      "KT_AUTO_CMD_AGENT_CONSTRUCTOR_COMMON();",
      ...COMMAND_RECOVERY_BLOCKS.flatMap((blockKey) => [
        marker.createStart(controller.param, "Item", blockKey),
        `generated body for ${blockKey}`,
        marker.createEnd(controller.param, "Item", blockKey),
      ]),
      "",
    ].join("\n");
    const result = marker.scan(controller.param, snapshot(text), [
      "CMD AGENT CONSTRUCTOR",
      ...COMMAND_RECOVERY_BLOCKS,
    ]);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "marker.missing-end",
      path: expect.objectContaining({ row: 0 }),
    });
    expect(result.regions.map((region) => region.blockKey)).toEqual([
      ...COMMAND_RECOVERY_BLOCKS,
    ]);
    expect(result.regions).toHaveLength(5);
  });

  it("characterizes BomAnalysis: two missing Ends do not poison five sibling blocks", () => {
    const controller = bomAnalysisController();
    const text = ktCodegenReadFixture(
      "source/bom-analysis-two-missing-ends.cpp",
    );
    const blockKeys = [
      "CMD AGENT CONSTRUCTOR",
      "CMD AGENT DESTRUCTOR",
      ...COMMAND_RECOVERY_BLOCKS,
    ] as const satisfies readonly KtCodegenBlockKey[];
    const result = controller.core.marker.scan(
      controller.param,
      snapshot(text, "PNXBomAnalysisCmd.cpp"),
      blockKeys,
    );

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "marker.missing-end",
        message:
          "Start marker PNXBomAnalysis CMD AGENT CONSTRUCTOR has no matching End marker before Start marker at line 15.",
        path: expect.objectContaining({
          source: "source",
          file: "PNXBomAnalysisCmd.cpp",
          row: 3,
        }),
      }),
      expect.objectContaining({
        code: "marker.missing-end",
        message:
          "Start marker PNXBomAnalysis CMD AGENT DESTRUCTOR has no matching End marker before Start marker at line 25.",
        path: expect.objectContaining({
          source: "source",
          file: "PNXBomAnalysisCmd.cpp",
          row: 14,
        }),
      }),
    ]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "marker.nested-start",
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "marker.mismatched-end",
    );
    expect(result.regions.map((region) => region.blockKey)).toEqual([
      ...COMMAND_RECOVERY_BLOCKS,
    ]);
    expect(
      result.regions.map((region) =>
        text.slice(region.replaceStartOffset, region.replaceEndOffset),
      ),
    ).not.toContainEqual(expect.stringContaining("CMD AGENT CONSTRUCTOR"));
    expect(
      result.regions.map((region) =>
        text.slice(region.replaceStartOffset, region.replaceEndOffset),
      ),
    ).not.toContainEqual(expect.stringContaining("CMD AGENT DESTRUCTOR"));

    const plan = controller.analyze({
      targets: ["caa.control"],
      blockKeys,
      snapshot: snapshot(text, "PNXBomAnalysisCmd.cpp"),
    });
    expect(plan.markerRegions).toHaveLength(5);
    expect(plan.artifacts).toHaveLength(5);
    expect(plan.canApply).toBe(false);
  });

  it("recovers across an unrequested block and still scans the next requested block", () => {
    const controller = loadedController();
    const marker = controller.core.marker;
    const declarationStart = marker.createStart(
      controller.param,
      "Item",
      PARAM_DECLARATION,
    );
    const qtStart = marker.createStart(controller.param, "Item", QT_UPDATE_DIALOG);
    const qtEnd = marker.createEnd(controller.param, "Item", QT_UPDATE_DIALOG);
    const equalStart = marker.createStart(controller.param, "Item", PARAM_EQUAL);
    const equalEnd = marker.createEnd(controller.param, "Item", PARAM_EQUAL);
    const text = [
      declarationStart,
      qtStart,
      qtEnd,
      equalStart,
      "return *this;",
      equalEnd,
      "",
    ].join("\n");
    const result = marker.scan(controller.param, snapshot(text), [
      PARAM_DECLARATION,
      PARAM_EQUAL,
    ]);

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "marker.missing-end",
    ]);
    expect(result.regions.map((region) => region.blockKey)).toEqual([PARAM_EQUAL]);
  });

  it("ends an open block at a wrong End and recovers the following complete sibling", () => {
    const controller = loadedController();
    const marker = controller.core.marker;
    const declarationStart = marker.createStart(
      controller.param,
      "Item",
      PARAM_DECLARATION,
    );
    const mismatchedEnd = marker.createEnd(controller.param, "Item", PARAM_EQUAL);
    const equalStart = marker.createStart(controller.param, "Item", PARAM_EQUAL);
    const equalEnd = marker.createEnd(controller.param, "Item", PARAM_EQUAL);
    const result = marker.scan(
      controller.param,
      snapshot(
        [
          declarationStart,
          "int handwrittenDeclaration;",
          mismatchedEnd,
          equalStart,
          "return *this;",
          equalEnd,
          "",
        ].join("\n"),
      ),
      [PARAM_DECLARATION, PARAM_EQUAL],
    );

    expect(result.regions.map((region) => region.blockKey)).toEqual([PARAM_EQUAL]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "marker.missing-end",
      "marker.orphan-end",
    ]);
    expect(result.diagnostics[0]).toMatchObject({
      message:
        "Start marker KtCourseGuardItem PARAM DECLARATION has no matching End marker before End marker at line 3.",
      path: expect.objectContaining({ row: 0 }),
    });
    expect(result.diagnostics[1]).toMatchObject({
      code: "marker.orphan-end",
      path: expect.objectContaining({ row: 2 }),
    });
    expect(
      result.regions.map((region) =>
        [region.replaceStartOffset, region.replaceEndOffset] as const,
      ),
    ).toEqual([
      [
        [declarationStart, "int handwrittenDeclaration;", mismatchedEnd, ""].join(
          "\n",
        ).length,
        [
          declarationStart,
          "int handwrittenDeclaration;",
          mismatchedEnd,
          equalStart,
          "return *this;",
          equalEnd,
          "",
        ].join("\n").length,
      ],
    ]);
  });

  it("ignores valid markers belonging to another class when no current block is open", () => {
    const controller = loadedController();
    const text = [
      "// START KEVIN CAA WIZARD SECTION OtherClass PARAM DECLARATION",
      "old();",
      "// END KEVIN CAA WIZARD SECTION OtherClass PARAM DECLARATION",
      "",
    ].join("\n");
    const result = controller.core.marker.scan(controller.param, snapshot(text), [
      PARAM_DECLARATION,
    ]);

    expect(result).toEqual({ regions: [], diagnostics: [] });
  });

  it("silently preserves a paired Kevin block outside the 32 generated block keys", () => {
    const controller = loadedController();
    const text = [
      "// START KEVIN CAA WIZARD SECTION KtCourseGuardItem IID_INTERFACE_CPP",
      "IID IID_KtCourseGuardItem = {};",
      "// END KEVIN CAA WIZARD SECTION KtCourseGuardItem IID_INTERFACE_CPP",
      "",
    ].join("\n");
    const result = controller.core.marker.scan(controller.param, snapshot(text), [
      PARAM_DECLARATION,
    ]);

    expect(result).toEqual({ regions: [], diagnostics: [] });
  });
});
