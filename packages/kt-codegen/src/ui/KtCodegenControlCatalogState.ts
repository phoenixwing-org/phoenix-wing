// SPDX-License-Identifier: Apache-2.0

import {
  KT_CODEGEN_BLOCK_PRESENTATIONS,
  ktCodegenBlockKeysForPreset,
} from "../KtCodegenBlockPresentation.js";
import {
  KT_CODEGEN_LEGACY_BLOCKS,
  type KtCodegenBlockKey,
} from "../blocks/legacy-blocks.js";
import type {
  KtCodegenControlBlockStateUiModel,
  KtCodegenControlUiModel,
} from "./KtCodegenUiContracts.js";

export type KtCodegenControlCatalogStatusFilter =
  | "hit"
  | "unclosed"
  | "missing"
  | "selected"
  | "all";

export type KtCodegenControlCatalogScopeFilter = "all" | "cpp-only" | "field-code";

export interface KtCodegenControlCatalogFilter {
  readonly status: KtCodegenControlCatalogStatusFilter;
  readonly scope: KtCodegenControlCatalogScopeFilter;
}

export type KtCodegenControlCatalogGroupId = "cpp" | "qt" | "caa";

export const KT_CODEGEN_CONTROL_CATALOG_GROUPS = [
  { id: "cpp", label: "C++" },
  { id: "qt", label: "Qt" },
  { id: "caa", label: "CAA" },
] as const satisfies readonly {
  readonly id: KtCodegenControlCatalogGroupId;
  readonly label: string;
}[];

export interface KtCodegenControlCatalogBlockUiModel extends KtCodegenControlBlockStateUiModel {
  readonly legacyId: number;
  readonly platform: KtCodegenControlCatalogGroupId;
  readonly legacyState: "active" | "legacy-deprecated";
  readonly title: string;
  readonly controlWords: string;
  readonly notes: string;
}

export interface KtCodegenControlCatalogGroup {
  readonly id: KtCodegenControlCatalogGroupId;
  readonly label: string;
  readonly blocks: readonly KtCodegenControlCatalogBlockUiModel[];
}

export interface KtCodegenControlVisibleSelectionState {
  readonly checked: boolean;
  readonly indeterminate: boolean;
  readonly disabled: boolean;
  readonly selectedCount: number;
  readonly visibleCount: number;
}

export interface KtCodegenControlCatalogSelection {
  readonly blockKeys: readonly KtCodegenBlockKey[];
  readonly singleMode: boolean;
}

const legacyByKey = new Map(KT_CODEGEN_LEGACY_BLOCKS.map((block) => [block.key, block]));

/** 把 Host 状态与 Wing 的稳定控制符元数据合成唯一的目录行模型。 */
export function ktCodegenControlCatalogBlocks(
  model: KtCodegenControlUiModel,
): readonly KtCodegenControlCatalogBlockUiModel[] {
  const stateByKey = new Map(model.blocks.map((block) => [block.key, block]));
  return KT_CODEGEN_BLOCK_PRESENTATIONS.flatMap((presentation) => {
    const legacy = legacyByKey.get(presentation.key);
    const state = stateByKey.get(presentation.key);
    if (!legacy || !state) return [];
    return [{
      ...state,
      legacyId: presentation.legacyId,
      platform: legacy.platform,
      legacyState: legacy.legacyState,
      title: presentation.title,
      controlWords: presentation.controlWords,
      notes: presentation.notes,
    }];
  });
}

/** 显示筛选不改变真正参与 Preflight/Apply 的选择。 */
export function ktCodegenFilterControlCatalogBlocks(
  blocks: readonly KtCodegenControlCatalogBlockUiModel[],
  selectedBlockKeys: readonly KtCodegenBlockKey[],
  filter: KtCodegenControlCatalogFilter,
): readonly KtCodegenControlCatalogBlockUiModel[] {
  const selected = new Set(selectedBlockKeys);
  const scoped = filter.scope === "all"
    ? undefined
    : new Set(ktCodegenBlockKeysForPreset(filter.scope));
  return blocks.filter((block) => {
    if (scoped && !scoped.has(block.key)) return false;
    if (filter.status === "all") return true;
    if (filter.status === "selected") return selected.has(block.key);
    return block.status === filter.status;
  });
}

/** 目录只采用插件既有的一层 C++/Qt/CAA 分组，组内保持 legacyId 顺序。 */
export function ktCodegenGroupControlCatalogBlocks(
  blocks: readonly KtCodegenControlCatalogBlockUiModel[],
): readonly KtCodegenControlCatalogGroup[] {
  const canonical = [...blocks].sort((left, right) => left.legacyId - right.legacyId);
  return KT_CODEGEN_CONTROL_CATALOG_GROUPS.map((group) => ({
    ...group,
    blocks: canonical.filter((block) => block.platform === group.id),
  }));
}

export function ktCodegenControlVisibleSelectionState(
  visibleBlockKeys: readonly KtCodegenBlockKey[],
  selectedBlockKeys: readonly KtCodegenBlockKey[],
): KtCodegenControlVisibleSelectionState {
  const visible = new Set(visibleBlockKeys);
  const selected = new Set(selectedBlockKeys);
  let selectedCount = 0;
  for (const key of visible) if (selected.has(key)) selectedCount += 1;
  const visibleCount = visible.size;
  return {
    checked: visibleCount > 0 && selectedCount === visibleCount,
    indeterminate: selectedCount > 0 && selectedCount < visibleCount,
    disabled: visibleCount === 0,
    selectedCount,
    visibleCount,
  };
}

/** 组 checkbox 只修改当前组合筛选可见项，结果恢复 canonical 顺序。 */
export function ktCodegenNextControlVisibleSelection(
  current: KtCodegenControlCatalogSelection,
  visibleBlockKeys: readonly KtCodegenBlockKey[],
  checked: boolean,
  canonicalBlockKeys: readonly KtCodegenBlockKey[],
): KtCodegenControlCatalogSelection {
  const selected = new Set(current.blockKeys);
  for (const key of visibleBlockKeys) {
    if (checked) selected.add(key);
    else selected.delete(key);
  }
  return {
    blockKeys: canonicalBlockKeys.filter((key) => selected.has(key)),
    singleMode: checked ? false : current.singleMode,
  };
}

export function ktCodegenNextControlSelection(
  current: KtCodegenControlCatalogSelection,
  blockKey: KtCodegenBlockKey,
  checked: boolean,
  canonicalBlockKeys: readonly KtCodegenBlockKey[],
): KtCodegenControlCatalogSelection {
  const selected = new Set(current.blockKeys);
  if (checked && current.singleMode) selected.clear();
  if (checked) selected.add(blockKey);
  else selected.delete(blockKey);
  return {
    blockKeys: canonicalBlockKeys.filter((key) => selected.has(key)),
    singleMode: current.singleMode,
  };
}
