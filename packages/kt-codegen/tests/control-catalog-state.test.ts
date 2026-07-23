// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { ktCodegenBlockKeysForPreset, type KtCodegenBlockKey } from "../src/index.js";
import {
  ktCodegenControlCatalogBlocks,
  ktCodegenControlVisibleSelectionState,
  ktCodegenFilterControlCatalogBlocks,
  ktCodegenGroupControlCatalogBlocks,
  ktCodegenNextControlSelection,
  ktCodegenNextControlVisibleSelection,
} from "../src/ui/KtCodegenControlCatalogState.js";
import type { KtCodegenControlUiModel } from "../src/ui/KtCodegenUiContracts.js";

function model(selectedBlockKeys: readonly KtCodegenBlockKey[]): KtCodegenControlUiModel {
  const selected = new Set(selectedBlockKeys);
  return {
    kind: "kt.codegen.control-ui-model",
    schemaVersion: 1,
    documentId: "PNXWidgetParam.json",
    fileName: "PNXWidgetParam.json",
    selectedBlockKeys,
    blocks: ktCodegenBlockKeysForPreset("all").map((key, index) => ({
      key,
      status: !selected.has(key) ? "unselected" : index === 10 ? "hit" : index === 19 ? "missing" : "pending",
      hitCount: index === 10 ? 2 : 0,
      artifactCount: index === 10 ? 2 : 0,
    })),
    unclosed: [],
  };
}

describe("KtCodegen shared Control Catalog state", () => {
  it("joins Host state with canonical plugin titles and platforms", () => {
    const blocks = ktCodegenControlCatalogBlocks(model(ktCodegenBlockKeysForPreset("all")));
    expect(blocks).toHaveLength(32);
    expect(blocks[0]).toMatchObject({ legacyId: 0, platform: "caa", title: "CATALOG Param define", controlWords: "CATALOG PARAMS" });
    expect(blocks[10]).toMatchObject({ legacyId: 10, platform: "cpp", status: "hit", hitCount: 2 });
  });

  it("restores the fixed C++/Qt/CAA tree without changing canonical row order", () => {
    const groups = ktCodegenGroupControlCatalogBlocks(
      ktCodegenControlCatalogBlocks(model(ktCodegenBlockKeysForPreset("all"))),
    );
    expect(groups.map((group) => group.label)).toEqual(["C++", "Qt", "CAA"]);
    expect(groups[0]?.blocks.map((block) => block.legacyId)).toEqual([10, 11, 12, 13]);
    expect(groups[1]?.blocks.map((block) => block.legacyId)).toEqual([17, 18]);
  });

  it("combines the plugin status and type filters as display-only state", () => {
    const selected = ktCodegenBlockKeysForPreset("all");
    const blocks = ktCodegenControlCatalogBlocks(model(selected));
    expect(ktCodegenFilterControlCatalogBlocks(blocks, selected, {
      status: "hit",
      scope: "cpp-only",
    }).map((block) => block.legacyId)).toEqual([10]);
    expect(ktCodegenFilterControlCatalogBlocks(blocks, selected, {
      status: "missing",
      scope: "field-code",
    }).map((block) => block.legacyId)).toEqual([19]);
  });

  it("projects group checkbox state and updates only visible keys", () => {
    expect(ktCodegenControlVisibleSelectionState(
      ["PARAM CONSTRUCTOR", "PARAM DECLARATION"],
      ["PARAM CONSTRUCTOR"],
    )).toMatchObject({ checked: false, indeterminate: true, selectedCount: 1, visibleCount: 2 });
    const next = ktCodegenNextControlVisibleSelection(
      { blockKeys: ["CATALOG PARAMS"], singleMode: true },
      ["PARAM CONSTRUCTOR", "PARAM DECLARATION"],
      true,
      ktCodegenBlockKeysForPreset("all"),
    );
    expect(next.blockKeys).toEqual(["CATALOG PARAMS", "PARAM CONSTRUCTOR", "PARAM DECLARATION"]);
    expect(next.singleMode).toBe(false);
  });

  it("keeps single-selection semantics in the shared state transition", () => {
    expect(ktCodegenNextControlSelection(
      { blockKeys: ["CATALOG PARAMS"], singleMode: true },
      "PARAM DECLARATION",
      true,
      ktCodegenBlockKeysForPreset("all"),
    )).toEqual({ blockKeys: ["PARAM DECLARATION"], singleMode: true });
  });
});
