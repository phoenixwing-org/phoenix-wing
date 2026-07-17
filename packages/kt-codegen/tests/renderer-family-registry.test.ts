// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { KT_CODEGEN_LEGACY_BLOCKS } from "../src/blocks/legacy-blocks.js";
import { KT_CODEGEN_CAA_FAMILIES } from "../src/renderer/caa-renderer.js";
import { KT_CODEGEN_CPP_PARAMETER_FAMILIES } from "../src/renderer/cpp-parameter-family.js";
import type { KtCodegenRendererFamily } from "../src/renderer/family-registry.js";
import { ktCodegenCreateRendererFamilyRegistry } from "../src/renderer/family-registry.js";
import { KT_CODEGEN_QT_FAMILIES } from "../src/renderer/qt-dialog-family.js";

function family(
  id: string,
  blockKey: "PARAM CONSTRUCTOR",
): KtCodegenRendererFamily<undefined> {
  return {
    id,
    blockKeys: [blockKey],
    renderRegion() {
      return { items: [], lines: [] };
    },
  };
}

describe("KtCodegen renderer family registry", () => {
  it("maps a block to one family and rejects ambiguous ownership", () => {
    const cpp = family("cpp.parameter", "PARAM CONSTRUCTOR");
    expect(ktCodegenCreateRendererFamilyRegistry([cpp]).get("PARAM CONSTRUCTOR")).toBe(cpp);
    expect(() => ktCodegenCreateRendererFamilyRegistry([
      cpp,
      family("cpp.duplicate", "PARAM CONSTRUCTOR"),
    ])).toThrow(
      "Renderer block PARAM CONSTRUCTOR is registered by both cpp.parameter and cpp.duplicate.",
    );
  });

  it("assigns every migrated legacy block to exactly one named family", () => {
    const families = [
      ...KT_CODEGEN_CPP_PARAMETER_FAMILIES,
      ...KT_CODEGEN_CAA_FAMILIES,
      ...KT_CODEGEN_QT_FAMILIES,
    ];
    const registrations = families.flatMap((entry) =>
      entry.blockKeys.map((blockKey) => ({ blockKey, familyId: entry.id })),
    );
    const expected = KT_CODEGEN_LEGACY_BLOCKS
      .filter((block) => block.migrationStatus === "migrated")
      .map((block) => block.key)
      .sort();

    expect(registrations).toHaveLength(32);
    expect(new Set(registrations.map((entry) => entry.blockKey)).size).toBe(32);
    expect(registrations.map((entry) => entry.blockKey).sort()).toEqual(expected);
    expect(new Set(registrations.map((entry) => entry.familyId))).toEqual(new Set([
      "cpp.parameter",
      "caa.feature-io",
      "caa.catalog",
      "caa.factory-tree",
      "caa.dialog",
      "caa.dialog-field",
      "caa.command-agent-lifecycle",
      "caa.command-graph-state",
      "caa.command-action",
      "qt.dialog",
    ]));
  });
});
