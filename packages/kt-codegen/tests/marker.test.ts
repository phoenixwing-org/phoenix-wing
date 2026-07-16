// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { KtCodegenBlockKey } from "../src/blocks/index.js";
import { KtCodegenController } from "../src/KtCodegenController.js";
import { ktCodegenReadFixture } from "./helpers.js";

const PARAM_DECLARATION: KtCodegenBlockKey = "PARAM DECLARATION";
const QT_UPDATE_DIALOG: KtCodegenBlockKey = "QT UPDATE DIALOG";

function loadedController(): KtCodegenController {
  const controller = new KtCodegenController();
  expect(controller.readJson(ktCodegenReadFixture("legacy-v4/basic.json")).ok).toBe(true);
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

  it("rejects an unrequested block nested inside a requested replacement region", () => {
    const controller = loadedController();
    const marker = controller.core.marker;
    const declarationStart = marker.createStart(
      controller.param,
      "Item",
      PARAM_DECLARATION,
    );
    const declarationEnd = marker.createEnd(controller.param, "Item", PARAM_DECLARATION);
    const qtStart = marker.createStart(controller.param, "Item", QT_UPDATE_DIALOG);
    const qtEnd = marker.createEnd(controller.param, "Item", QT_UPDATE_DIALOG);
    const text = [declarationStart, qtStart, qtEnd, declarationEnd, ""].join("\n");
    const result = marker.scan(controller.param, snapshot(text), [PARAM_DECLARATION]);

    expect(result.regions).toEqual([]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "marker.nested-start",
      "marker.mismatched-end",
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
});
