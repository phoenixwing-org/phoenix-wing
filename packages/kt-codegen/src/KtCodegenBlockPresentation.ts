// SPDX-License-Identifier: Apache-2.0

import {
  KT_CODEGEN_LEGACY_BLOCKS,
  type KtCodegenBlockKey,
} from "./blocks/legacy-blocks.js";

/** 旧 VB `KevinControlTitle` 的32个用户可读标题，顺序与 legacyId 一致。 */
const KT_CODEGEN_LEGACY_BLOCK_TITLES = [
  "CATALOG Param define",
  "Param on Tree",
  "Implement CPP Get",
  "Implement CPP Set",
  "Implement HEAD Get",
  "Implement HEAD Set",
  "Implement PARAM Get",
  "Implement PARAM Set",
  "Interface HEAD Get",
  "Interface HEAD Set",
  "PARAM Initial",
  "PARAM define",
  "PARAM destructor",
  "PARAM equal",
  "Dialog Change Notify",
  "Update CAA Dialog",
  "Update CAA param",
  "Update QT Dialog",
  "Update QT param",
  "Dlg Define Field Type",
  "Dlg Set Active Field",
  "Dlg Get Selector List",
  "Cmd Agent Declare",
  "Cmd Agent Constructor",
  "Cmd Agent Destructor",
  "Cmd Agent Build Graph",
  "Cmd Agent Update State",
  "Cmd Agent fia Clear",
  "Cmd Action Pda",
  "Cmd Action Fia",
  "Cmd Element Selected",
  "Cmd Set Active Field",
] as const;

export interface KtCodegenBlockPresentation {
  readonly key: KtCodegenBlockKey;
  readonly legacyId: number;
  readonly title: string;
  readonly controlWords: string;
  readonly notes: string;
}

/** 跨 VS Code/Desk Tools 复用的控制符表格展示数据。 */
export const KT_CODEGEN_BLOCK_PRESENTATIONS: readonly KtCodegenBlockPresentation[] =
  KT_CODEGEN_LEGACY_BLOCKS.map((block) => ({
    key: block.key,
    legacyId: block.legacyId,
    title: KT_CODEGEN_LEGACY_BLOCK_TITLES[block.legacyId] ?? block.key,
    controlWords: block.key,
    notes: block.legacyCall,
  }));

export type KtCodegenBlockPreset = "all" | "none" | "cpp-only" | "field-code";

/** 复现旧 VB 的全选、全不选、C++ only 与 Field Code 选择规则。 */
export function ktCodegenBlockKeysForPreset(
  preset: KtCodegenBlockPreset,
): KtCodegenBlockKey[] {
  if (preset === "none") return [];
  return KT_CODEGEN_LEGACY_BLOCKS
    .filter((block) => preset === "all"
      || (preset === "cpp-only" && block.legacyId >= 10 && block.legacyId <= 13)
      || (preset === "field-code" && block.legacyId >= 19 && block.legacyId <= 31))
    .map((block) => block.key);
}
