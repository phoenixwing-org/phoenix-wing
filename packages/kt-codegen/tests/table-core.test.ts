// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  KT_CODEGEN_TABLE_COLUMNS,
  KtCodegenItem,
  KtCodegenParam,
  KtCodegenTableCore,
} from "../src/index.js";

describe("KtCodegenTableCore", () => {
  it("保存旧快照时保留新草稿、选择和数组身份，还原只回到实际已保存内容", () => {
    const param = new KtCodegenParam({ items: [new KtCodegenItem({ name: "Saved" })] });
    const core = new KtCodegenTableCore(param);
    const snapshot = core.getData();
    const items = param.items;
    core.updateCell(0, "name", "Newer");
    core.select(0);
    core.markCheckpoint(2, snapshot.items);
    expect(core.dirty).toBe(true);
    expect(core.documentRevision).toBe(2);
    expect(core.selectedRow).toBe(0);
    expect(param.items).toBe(items);
    expect(param.items[0]!.name).toBe("Newer");
    core.revertToCheckpoint();
    expect(param.items[0]!.name).toBe("Saved");
    expect(core.dirty).toBe(false);
    core.markCheckpoint(3, core.getData().items);
    expect(core.dirty).toBe(false);
  });
  it("保持旧 Qt 表格的17列顺序", () => {
    expect(KT_CODEGEN_TABLE_COLUMNS.map((column) => column.field)).toEqual([
      "nameSuffix", "id", "name", "paramString", "dataType", "tcKind", "defaultValue",
      "catAttrInOut", "isList", "isOnTree", "component", "componentCount", "isParamDlg",
      "unit", "author", "createDate", "notes",
    ]);
  });

  it("按字段类型更新，并保留未知 Combo 字符串", () => {
    const param = new KtCodegenParam({ items: [new KtCodegenItem()] });
    const core = new KtCodegenTableCore(param);

    expect(core.updateCell(0, "id", "23")).toBe(true);
    expect(core.updateCell(0, "isList", "true")).toBe(true);
    expect(core.updateCell(0, "component", "PrivateWidget")).toBe(true);
    expect(param.items[0]).toMatchObject({ id: 23, isList: true, component: "PrivateWidget" });
    expect(core.dirty).toBe(true);
  });

  it("插入、复制、粘贴、移动和删除都原地维护 items 数组", () => {
    const param = new KtCodegenParam({
      items: [
        new KtCodegenItem({ id: 1, paramString: "first" }),
        new KtCodegenItem({ id: 2, paramString: "second" }),
      ],
    });
    const items = param.items;
    const core = new KtCodegenTableCore(param);

    core.select(0);
    expect(core.insert()).toBe(1);
    expect(param.items[1]?.id).toBe(2);
    expect(core.duplicate(2)).toBe(3);
    expect(core.copy(0)).toBe(true);
    expect(core.paste(1)).toBe(true);
    expect(core.move(3, "up")).toBe(2);
    expect(core.delete(3)).toBe(true);

    expect(param.items).toBe(items);
    expect(param.items.map((item) => item.paramString)).toEqual(["first", "first", "second"]);
  });

  it("整表交换携带 revision/selection，但不携带文件和文档属性", () => {
    const param = new KtCodegenParam({ namePrefix: "PNX" });
    const items = param.items;
    const core = new KtCodegenTableCore(param);

    core.setData({
      kind: "kt.codegen.table-data",
      schemaVersion: 1,
      documentRevision: 12,
      selectedRow: 0,
      items: [new KtCodegenItem({ nameSuffix: "Analysis", id: 1 })],
    });

    const data = core.getData();
    expect(data).toMatchObject({ documentRevision: 12, selectedRow: 0 });
    expect(Object.keys(data).sort()).toEqual([
      "documentRevision", "items", "kind", "schemaVersion", "selectedRow",
    ]);
    expect(param.items).toBe(items);
    expect(param.namePrefix).toBe("PNX");
  });

  it("replaceData 保留宿主 checkpoint 语义并把整表草稿标为 dirty", () => {
    const param = new KtCodegenParam({
      items: [new KtCodegenItem({ paramString: "saved" })],
    });
    const core = new KtCodegenTableCore(param, 4);

    core.replaceData({
      kind: "kt.codegen.table-data",
      schemaVersion: 1,
      documentRevision: 4,
      selectedRow: 0,
      items: [new KtCodegenItem({ paramString: "draft" })],
    });

    expect(core.dirty).toBe(true);
    expect(param.items[0]?.paramString).toBe("draft");
    core.revertToCheckpoint();
    expect(param.items[0]?.paramString).toBe("saved");
  });

  it("revert 只还原 items，不覆盖 Block 中较新的文档属性", () => {
    const param = new KtCodegenParam({
      namePrefix: "PNX",
      items: [new KtCodegenItem({ paramString: "length" })],
    });
    const items = param.items;
    const core = new KtCodegenTableCore(param, 3);

    param.namePrefix = "KTX";
    core.updateCell(0, "paramString", "width");
    core.insert(0);
    core.revertToCheckpoint();

    expect(param.namePrefix).toBe("KTX");
    expect(param.items).toBe(items);
    expect(param.items.map((item) => item.paramString)).toEqual(["length"]);
    expect(core.dirty).toBe(false);
    expect(core.documentRevision).toBe(3);
  });

  it("复现 Qt sort 的 suffix 继承、ID 分组和非正数边界", () => {
    const param = new KtCodegenParam({
      items: [
        new KtCodegenItem({ nameSuffix: "", id: 101 }),
        new KtCodegenItem({ nameSuffix: "", id: 199 }),
        new KtCodegenItem({ nameSuffix: "", id: 0 }),
        new KtCodegenItem({ nameSuffix: "", id: 150 }),
        new KtCodegenItem({ nameSuffix: "Other", id: 201 }),
        new KtCodegenItem({ nameSuffix: "Other", id: 299 }),
      ],
    });
    const core = new KtCodegenTableCore(param);

    expect(core.sortAndNormalize()).toBe(true);
    expect(param.items.map((item) => [item.nameSuffix, item.id])).toEqual([
      ["Unknown", 101],
      ["Unknown", 102],
      ["Unknown", 0],
      ["Unknown", 150],
      ["Other", 201],
      ["Other", 202],
    ]);
  });
});
