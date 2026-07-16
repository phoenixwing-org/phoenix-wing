// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { KtCodegenCore } from "../src/KtCodegenCore.js";
import { KtCodegenItem } from "../src/KtCodegenItem.js";
import { ktCodegenReadJsonFixture } from "./helpers.js";

interface DefaultValueCase {
  readonly name: string;
  readonly item: Partial<KtCodegenItem>;
  readonly addQuotation?: boolean;
  readonly expected: string;
}

function item(initial: Partial<KtCodegenItem>): KtCodegenItem {
  return new KtCodegenItem(initial);
}

describe("KtCodegenCore legacy parameter helpers", () => {
  it("matches the archived default-value golden cases without modifying items", () => {
    const cases = ktCodegenReadJsonFixture<DefaultValueCase[]>(
      "expected/core-default-values.json",
    );

    for (const testCase of cases) {
      const source = item(testCase.item);
      const original = { ...source };
      expect(
        KtCodegenCore.formatDefaultValue(source, testCase.addQuotation ?? false),
        testCase.name,
      ).toBe(testCase.expected);
      expect(source, `${testCase.name} must not mutate the data item`).toEqual(original);
    }
  });

  it("recognizes the exact legacy point and vector type set", () => {
    for (const dataType of [
      "CATMathPoint",
      "CATMathVector",
      "CATMathPointf",
      "CATMathVectorf",
      "KtMathVector",
      "KtMathRay",
      "CATMathDirectionf",
      "CATMathDirection",
    ]) {
      expect(KtCodegenCore.isPointOrVector3DType(dataType)).toBe(true);
    }

    expect(KtCodegenCore.isPointOrVector3DType("catmathpoint")).toBe(false);
    expect(KtCodegenCore.isKtVector(item({ dataType: "KtMathVector" }))).toBe(true);
    expect(KtCodegenCore.isCaaVector(item({ dataType: "KtMathVector" }))).toBe(false);
    expect(KtCodegenCore.isCaaVector(item({ dataType: "CATMathDirection" }))).toBe(true);
  });

  it("recognizes exactly the five legacy Selector Field components", () => {
    for (const component of [
      "SelectorList",
      "MultiList",
      "QListWidget",
      "QTableWidget",
      "QTableView",
    ]) {
      const source = item({
        id: 1,
        component,
        componentCount: 0,
        dataType: "UnsupportedType",
      });
      const original = { ...source };
      expect(KtCodegenCore.isSelectorField(source), component).toBe(true);
      expect(source, `${component} must not mutate the data item`).toEqual(original);
    }

    expect(
      KtCodegenCore.isSelectorField(item({ id: 0, component: "SelectorList" })),
    ).toBe(false);
    expect(
      KtCodegenCore.isSelectorField(item({ id: 1, component: "selectorlist" })),
    ).toBe(false);
    expect(
      KtCodegenCore.isSelectorField(item({ id: 1, component: "Spinner" })),
    ).toBe(false);
  });

  it("preserves Command Field support and suggested-filter priority", () => {
    expect(
      KtCodegenCore.isCommandAutoField(
        item({ component: "SelectorList", componentCount: 1 }),
      ),
    ).toBe(true);
    expect(
      KtCodegenCore.isCommandAutoField(
        item({ component: "QListWidget", componentCount: -1 }),
      ),
    ).toBe(true);
    expect(
      KtCodegenCore.isCommandAutoField(
        item({ component: "SelectorList", componentCount: 0 }),
      ),
    ).toBe(false);
    expect(
      KtCodegenCore.isCommandAutoField(
        item({ component: "MultiList", componentCount: 1 }),
      ),
    ).toBe(false);

    expect(
      [
        "GridAxis",
        "AxisSystem",
        "Direction",
        "Support",
        "OriginPoint",
        "Line",
        "Curve",
        "Plane",
        "SurfaceFace",
        "Axis",
        "Unknown",
      ].map(KtCodegenCore.getCommandSuggestedFilter),
    ).toEqual([
      "GRID_AXIS",
      "AXIS_SYSTEM",
      "DIRECTION",
      "SUPPORT",
      "POINT",
      "LINE",
      "CURVE",
      "PLANE",
      "FACE",
      "AXIS",
      "DEFAULT",
    ]);
  });

  it("preserves the legacy IsParamSpecList decision order", () => {
    expect(
      KtCodegenCore.isParamSpecList(item({ dataType: "CATMathPoint", isList: true })),
    ).toBe(false);
    expect(KtCodegenCore.isParamSpecList(item({ dataType: "double", isList: true }))).toBe(true);
    expect(
      KtCodegenCore.isParamSpecList(item({ dataType: "Kt::SpecObjectCollect" })),
    ).toBe(true);
    expect(
      KtCodegenCore.isParamSpecList(item({ dataType: "CATListValCATISpecObject_var" })),
    ).toBe(true);
    expect(KtCodegenCore.isParamSpecList(item({ dataType: "double" }))).toBe(false);
  });

  it("returns only a standalone trailing uppercase character", () => {
    expect(KtCodegenCore.getLastStandaloneUppercase("MachineId")).toBe("");
    expect(KtCodegenCore.getLastStandaloneUppercase("AxisX")).toBe("X");
    expect(KtCodegenCore.getLastStandaloneUppercase("AX")).toBe("");
    expect(KtCodegenCore.getLastStandaloneUppercase("X")).toBe("X");
    expect(KtCodegenCore.getLastStandaloneUppercase(null)).toBe("");
  });

  it("formats CAA tree titles at isolated uppercase boundaries", () => {
    expect(KtCodegenCore.formatTreeName("MachineId")).toBe("Machine Id");
    expect(KtCodegenCore.formatTreeName("AxisX")).toBe("Axis X");
    expect(KtCodegenCore.formatTreeName("URLValue")).toBe("URLValue");
    expect(KtCodegenCore.formatTreeName("X")).toBe("X");
    expect(KtCodegenCore.formatTreeName("")).toBe("");
  });
});
