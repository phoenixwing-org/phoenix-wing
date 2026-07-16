// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { KtCodegenController } from "../src/KtCodegenController.js";
import { KtCodegenOptions } from "../src/KtCodegenOptions.js";
import { KtCodegenParam } from "../src/KtCodegenParam.js";
import { ktCodegenReadFixture, ktCodegenReadJsonFixture } from "./helpers.js";

function ktCodegenSerializableData(data: KtCodegenParam): Record<string, unknown> {
  return {
    kind: data.kind,
    schemaVersion: data.schemaVersion,
    source: data.source,
    namePrefix: data.namePrefix,
    nameMiddle: data.nameMiddle,
    nameSpace: data.nameSpace,
    appendFunction: data.appendFunction,
    items: data.items,
  };
}

describe("KtCodegenParam", () => {
  it("is a public-field data class without I/O or validation methods", () => {
    const param = new KtCodegenParam();

    expect(param.items).toEqual([]);
    expect("readJson" in param).toBe(false);
    expect("writeJson" in param).toBe(false);
    expect("validate" in param).toBe(false);
    expect("clear" in param).toBe(false);
  });

  it("reads legacy v4 JSON into one shared MVC-C data instance through Controller", () => {
    const controller = new KtCodegenController();
    const sharedItems = controller.param.items;
    const sharedSource = controller.param.source;
    const sharedHeaders = controller.param.source.headers;
    const sharedExtensions = controller.param.source.extensions;
    const result = controller.readJson(ktCodegenReadFixture("legacy-v4/basic.json"));

    expect(result.ok).toBe(true);
    expect(result.value).toBe(controller.param);
    expect(controller.param.items).toBe(sharedItems);
    expect(controller.param.source).toBe(sharedSource);
    expect(controller.param.source.headers).toBe(sharedHeaders);
    expect(controller.param.source.extensions).toBe(sharedExtensions);
    expect(ktCodegenSerializableData(controller.param)).toEqual(
      ktCodegenReadJsonFixture("expected/basic-normalized.json"),
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "legacy.value-coerced-to-string",
    );
  });

  it("writes the current public members back to C++ compatible v4 JSON", () => {
    const controller = new KtCodegenController();
    expect(controller.readJson(ktCodegenReadFixture("legacy-v4/basic.json")).ok).toBe(true);

    controller.param.items[0]!.defaultValue = "42";
    const written = controller.writeJson();
    const json = JSON.parse(written.value ?? "{}") as {
      headers?: string[];
      data?: unknown[][];
    };

    expect(written.ok).toBe(true);
    expect(json.headers?.[11]).toBe("ComponentCount");
    expect(json.data?.[0]?.[6]).toBe("42");
  });

  it("reads old 17-column CSV and converts it through the same data class", () => {
    const controller = new KtCodegenController();
    const result = controller.readCsv(ktCodegenReadFixture("legacy-csv/basic.csv"));

    expect(result.ok).toBe(true);
    expect(controller.param.source.format).toBe("legacy-17-column-csv");
    expect(controller.param.namePrefix).toBe("Kt");
    expect(controller.param.items).toHaveLength(2);
    expect(controller.param.items[1]).toMatchObject({
      paramString: "GuardLength",
      isList: true,
      component: "QDoubleSpinBox",
      unit: "mm",
    });

    const json = controller.writeJson();
    expect(json.value).toContain('"version": "4.0"');
    expect(json.value).toContain('"ParamString"');
  });

  it("writes and reads the old Qt-simple CSV dialect", () => {
    const source = new KtCodegenController();
    expect(source.readJson(ktCodegenReadFixture("legacy-v4/basic.json")).ok).toBe(true);
    const written = source.writeCsv({ dialect: "qt-simple", eol: "\r\n" });

    const target = new KtCodegenController();
    expect(target.readCsv(written.value ?? "").ok).toBe(true);
    expect(target.param.items.map((item) => item.paramString)).toEqual([
      "MachineId",
      "GuardLength",
    ]);
  });

  it("keeps the previous shared data when a new JSON load fails", () => {
    const controller = new KtCodegenController();
    expect(controller.readJson(ktCodegenReadFixture("legacy-v4/basic.json")).ok).toBe(true);
    const firstItem = controller.param.items[0];

    const result = controller.readJson("{ invalid json");

    expect(result.ok).toBe(false);
    expect(controller.param.items[0]).toBe(firstItem);
    expect(result.diagnostics[0]?.code).toBe("legacy.invalid-json");
  });

  it("validates direct public-member changes at the write boundary", () => {
    const controller = new KtCodegenController();
    expect(controller.readJson(ktCodegenReadFixture("legacy-v4/basic.json")).ok).toBe(true);

    controller.param.items[0]!.componentCount = -1;
    const written = controller.writeJson();

    expect(written.ok).toBe(false);
    expect(written.value).toBeNull();
    expect(written.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "model.invalid-component-count",
    );
  });

  it("preserves unknown Combo strings until the UI changes them", () => {
    const controller = new KtCodegenController();
    expect(controller.readJson(ktCodegenReadFixture("legacy-v4/basic.json")).ok).toBe(true);

    const item = controller.param.items[0]!;
    expect(item.tcKind).toBe("Integer");
    expect(item.catAttrInOut).toBe("In");
    expect(KtCodegenOptions.hasTcKind(item.tcKind)).toBe(false);
    expect(KtCodegenOptions.hasCatAttrInOut(item.catAttrInOut)).toBe(false);

    const written = controller.writeJson();
    expect(written.value).toContain('"Integer"');
    expect(written.value).toContain('"In"');
  });
});
