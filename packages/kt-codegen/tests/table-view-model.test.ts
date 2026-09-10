// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { KtCodegenItem } from "../src/KtCodegenItem.js";
import { KT_CODEGEN_TABLE_COLUMNS } from "../src/KtCodegenTableColumns.js";
import {
  KT_CODEGEN_TABLE_ACTIONS,
  ktCodegenFitTableColumnWidths,
  ktCodegenNormalizeTableLayout,
  ktCodegenTableColumnWidth,
  ktCodegenTableCountLabel,
  ktCodegenTableDisabledActions,
  ktCodegenTableDisclosure,
  ktCodegenTableSelectOptions,
} from "../src/table/KtCodegenTableViewModel.js";

describe("KtCodegenTable ViewModel", () => {
  it("九个默认业务按钮使用简短纯文字，保留动作顺序与完整提示", () => {
    expect(KT_CODEGEN_TABLE_ACTIONS).toEqual([
      ["autoFit", "自适应", "根据当前内容调整列宽"],
      ["sort", "排序", "按旧 Qt 规则规范 Suffix 和 ID"],
      ["copy", "复制", "复制当前行"],
      ["paste", "粘贴", "用复制内容替换当前行"],
      ["insert", "插入", "在当前行后插入"],
      ["duplicate", "副本", "在当前行后创建副本"],
      ["moveUp", "上移", "上移"],
      ["moveDown", "下移", "下移"],
      ["delete", "删除", "删除当前行"],
    ]);
  });

  it("归一化 contained/page，并让 collapsed 只在允许折叠时生效", () => {
    expect(ktCodegenNormalizeTableLayout(undefined)).toBe("contained");
    expect(ktCodegenNormalizeTableLayout("contained")).toBe("contained");
    expect(ktCodegenNormalizeTableLayout("page")).toBe("page");
    expect(ktCodegenNormalizeTableLayout("viewport")).toBe("contained");

    expect(ktCodegenTableDisclosure({ collapsible: false, collapsed: true })).toEqual({
      hidden: false,
      disabled: true,
      expanded: true,
      indicator: "▾",
      label: "参数表",
    });
    expect(ktCodegenTableDisclosure({ collapsible: true, collapsed: false })).toEqual({
      hidden: false,
      disabled: false,
      expanded: true,
      indicator: "▾",
      label: "收起参数表",
    });
    expect(ktCodegenTableDisclosure({ collapsible: true, collapsed: true })).toEqual({
      hidden: true,
      disabled: false,
      expanded: false,
      indicator: "▸",
      label: "展开参数表",
    });
  });

  it("集中空表、未选择、首行和末行动作可用性", () => {
    expect([...ktCodegenTableDisabledActions({
      itemCount: 0,
      selectedRow: null,
      hasClipboard: false,
    })]).toEqual(["sort", "copy", "paste", "duplicate", "delete", "moveUp", "moveDown"]);

    const first = ktCodegenTableDisabledActions({ itemCount: 2, selectedRow: 0, hasClipboard: false });
    expect(first.has("moveUp")).toBe(true);
    expect(first.has("moveDown")).toBe(false);
    expect(first.has("paste")).toBe(true);

    const last = ktCodegenTableDisabledActions({ itemCount: 2, selectedRow: 1, hasClipboard: true });
    expect(last.has("moveDown")).toBe(true);
    expect(last.has("moveUp")).toBe(false);
    expect(last.has("paste")).toBe(false);
  });

  it("Combo 保留未知当前值、空候选与旧分隔项语义", () => {
    const componentColumn = KT_CODEGEN_TABLE_COLUMNS.find((column) => column.field === "component")!;
    expect(ktCodegenTableSelectOptions(componentColumn, "PrivateWidget", {
      tcKind: [],
      catAttrInOut: [],
      component: ["", "-Qt-", "QLineEdit"],
    })).toEqual([
      { value: "PrivateWidget", label: "PrivateWidget（未知，保持原值）", disabled: false, unknown: true },
      { value: "", label: "（空）", disabled: false, unknown: false },
      { value: "-Qt-", label: "-Qt-", disabled: true, unknown: false },
      { value: "QLineEdit", label: "QLineEdit", disabled: false, unknown: false },
    ]);
  });

  it("列宽拟合保持 72/360 边界、布尔宽度和 Unicode 字符计数", () => {
    const items = [new KtCodegenItem({ name: "泵体", notes: "x".repeat(100), isList: true })];
    const widths = ktCodegenFitTableColumnWidths(KT_CODEGEN_TABLE_COLUMNS, items);
    const title = KT_CODEGEN_TABLE_COLUMNS.find((column) => column.field === "name")!;
    const notes = KT_CODEGEN_TABLE_COLUMNS.find((column) => column.field === "notes")!;
    const isList = KT_CODEGEN_TABLE_COLUMNS.find((column) => column.field === "isList")!;
    expect(widths.get(title.field)).toBe(72);
    expect(widths.get(notes.field)).toBe(360);
    expect(widths.get(isList.field)).toBe(76);
    expect(ktCodegenTableColumnWidth(title, new Map())).toBe(title.width);
  });

  it("稳定投影状态栏计数文案", () => {
    expect(ktCodegenTableCountLabel(3, 17)).toBe("3 行 · 17 列");
  });
});
