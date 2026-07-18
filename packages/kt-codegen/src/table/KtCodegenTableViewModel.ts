// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenItem } from "../KtCodegenItem.js";
import type {
  KtCodegenTableColumn,
  KtCodegenTableItemField,
} from "../KtCodegenTableColumns.js";

/** 表格 Combo 候选项；未知当前值始终会额外保留。 */
export interface KtCodegenTableOptions {
  readonly tcKind: readonly string[];
  readonly catAttrInOut: readonly string[];
  readonly component: readonly string[];
}

/** 表格的宿主布局责任。contained 保持组件内滚动，page 交给页面自然排版。 */
export type KtCodegenTableLayout = "contained" | "page";

export interface KtCodegenTableDisclosureState {
  readonly collapsible: boolean;
  readonly collapsed: boolean;
}

/** Header disclosure button 所需的纯状态投影。 */
export interface KtCodegenTableDisclosureViewModel {
  readonly hidden: boolean;
  readonly disabled: boolean;
  readonly expanded: boolean;
  readonly indicator: "▸" | "▾";
  readonly label: string;
}

export type KtCodegenTableAction =
  | "autoFit"
  | "sort"
  | "copy"
  | "paste"
  | "insert"
  | "duplicate"
  | "moveUp"
  | "moveDown"
  | "delete";

export interface KtCodegenTableActionState {
  readonly itemCount: number;
  readonly selectedRow: number | null;
  readonly hasClipboard: boolean;
}

export interface KtCodegenTableSelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled: boolean;
  readonly unknown: boolean;
}

export const KT_CODEGEN_TABLE_ACTIONS = [
  ["autoFit", "自适应", "根据当前内容调整列宽"],
  ["sort", "排序", "按旧 Qt 规则规范 Suffix 和 ID"],
  ["copy", "复制", "复制当前行"],
  ["paste", "粘贴", "用复制内容替换当前行"],
  ["insert", "＋ 插入", "在当前行后插入"],
  ["duplicate", "⧉ 副本", "在当前行后创建副本"],
  ["moveUp", "↑", "上移"],
  ["moveDown", "↓", "下移"],
  ["delete", "− 删除", "删除当前行"],
] as const satisfies readonly (readonly [KtCodegenTableAction, string, string])[];

/** 属性、attribute 与未知 JavaScript 输入共用的布局归一化边界。 */
export function ktCodegenNormalizeTableLayout(value: unknown): KtCodegenTableLayout {
  return value === "page" ? "page" : "contained";
}

/** collapsed 只在显式允许折叠时生效，避免只写 collapsed 的宿主失去内容。 */
export function ktCodegenTableDisclosure(
  state: KtCodegenTableDisclosureState,
): KtCodegenTableDisclosureViewModel {
  const hidden = state.collapsible && state.collapsed;
  const disabled = !state.collapsible;
  return {
    hidden,
    disabled,
    expanded: !hidden,
    indicator: hidden ? "▸" : "▾",
    label: disabled ? "参数表" : hidden ? "展开参数表" : "收起参数表",
  };
}

export function ktCodegenTableDisabledActions(
  state: KtCodegenTableActionState,
): ReadonlySet<KtCodegenTableAction> {
  const disabled = new Set<KtCodegenTableAction>();
  const row = state.selectedRow;
  const hasSelection = row !== null && row >= 0 && row < state.itemCount;
  if (state.itemCount === 0) disabled.add("sort");
  if (!hasSelection) {
    disabled.add("copy");
    disabled.add("paste");
    disabled.add("duplicate");
    disabled.add("delete");
    disabled.add("moveUp");
    disabled.add("moveDown");
    return disabled;
  }
  if (!state.hasClipboard) disabled.add("paste");
  if (row === 0) disabled.add("moveUp");
  if (row === state.itemCount - 1) disabled.add("moveDown");
  return disabled;
}

export function ktCodegenTableSelectOptions(
  column: KtCodegenTableColumn,
  current: string,
  options: KtCodegenTableOptions,
): readonly KtCodegenTableSelectOption[] | undefined {
  const candidates = column.kind === "tcKind"
    ? options.tcKind
    : column.kind === "catAttrInOut"
      ? options.catAttrInOut
      : column.kind === "component"
        ? options.component
        : undefined;
  if (!candidates) return undefined;

  const rows: KtCodegenTableSelectOption[] = [];
  if (current && !candidates.includes(current)) {
    rows.push({
      value: current,
      label: `${current}（未知，保持原值）`,
      disabled: false,
      unknown: true,
    });
  }
  for (const candidate of candidates) {
    rows.push({
      value: candidate,
      label: candidate || "（空）",
      disabled: /^-.*-$/u.test(candidate),
      unknown: false,
    });
  }
  return rows;
}

export function ktCodegenFitTableColumnWidths(
  columns: readonly KtCodegenTableColumn[],
  items: readonly KtCodegenItem[],
): ReadonlyMap<KtCodegenTableItemField, number> {
  const widths = new Map<KtCodegenTableItemField, number>();
  for (const column of columns) {
    const longest = items.reduce((length, item) => {
      const value = column.kind === "boolean" ? "true" : String(item[column.field] ?? "");
      return Math.max(length, [...value].length);
    }, [...column.title].length);
    const checkboxWidth = column.kind === "boolean" ? 72 : 0;
    widths.set(
      column.field,
      Math.max(checkboxWidth, Math.min(360, Math.max(72, longest * 8 + 28))),
    );
  }
  return widths;
}

export function ktCodegenTableColumnWidth(
  column: KtCodegenTableColumn,
  fittedWidths: ReadonlyMap<KtCodegenTableItemField, number>,
): number {
  return fittedWidths.get(column.field) ?? column.width;
}

export function ktCodegenTableCountLabel(itemCount: number, columnCount: number): string {
  return `${itemCount} 行 · ${columnCount} 列`;
}
