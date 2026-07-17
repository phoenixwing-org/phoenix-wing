import { describe, expect, it } from "vitest";
import {
  KT_CODEGEN_BLOCK_PRESENTATIONS,
  ktCodegenBlockKeysForPreset,
} from "../src/index.js";

describe("KtCodegenBlockPresentation", () => {
  it("保留 VB 的32个标题、控制词和分派说明", () => {
    expect(KT_CODEGEN_BLOCK_PRESENTATIONS).toHaveLength(32);
    expect(KT_CODEGEN_BLOCK_PRESENTATIONS[0]).toMatchObject({
      legacyId: 0,
      title: "CATALOG Param define",
      controlWords: "CATALOG PARAMS",
      notes: "CreateCAACatalogParam()",
    });
    expect(KT_CODEGEN_BLOCK_PRESENTATIONS[31]?.title).toBe("Cmd Set Active Field");
  });

  it("共享旧 VB 的选择预设", () => {
    expect(ktCodegenBlockKeysForPreset("none")).toEqual([]);
    expect(ktCodegenBlockKeysForPreset("all")).toHaveLength(32);
    expect(ktCodegenBlockKeysForPreset("cpp-only")).toEqual([
      "PARAM CONSTRUCTOR",
      "PARAM DECLARATION",
      "PARAM DESTRUCTOR",
      "PARAM EQUAL",
    ]);
    expect(ktCodegenBlockKeysForPreset("field-code")).toHaveLength(13);
  });
});
