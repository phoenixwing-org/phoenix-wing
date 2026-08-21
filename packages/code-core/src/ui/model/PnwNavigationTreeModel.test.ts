// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  pnwNavigationTreeChildFocusId,
  pnwNavigationTreeInitialFocusId,
  pnwNavigationTreeMoveFocus,
  pnwNavigationTreeParentFocusId,
  pnwProjectNavigationTreeRows,
  type PnwNavigationTreeModel,
} from "./PnwNavigationTreeModel.js";

function model(): PnwNavigationTreeModel {
  return {
    ariaLabel: "工程目录",
    expandedNodeIds: ["catalog", "missing"],
    selectedNodeId: "missing",
    nodes: [
      {
        id: "catalog",
        label: "Catalog",
        children: [
          {
            id: "missing",
            label: "未找到 Catalog",
            iconKey: "info",
            children: [{ id: "detail", label: "详细信息", iconKey: "file" }],
          },
          { id: "disabled", label: "不可用", disabled: true },
          { id: "hidden", label: "隐藏", hidden: true },
        ],
      },
      { id: "settings", label: "配置", iconKey: "settings" },
    ],
  };
}

describe("PnwNavigationTreeModel", () => {
  it("投影展开后的可见层级、同级位置和选择状态", () => {
    const rows = pnwProjectNavigationTreeRows(model());

    expect(rows.map((row) => row.node.id)).toEqual([
      "catalog",
      "missing",
      "detail",
      "disabled",
      "settings",
    ]);
    expect(rows[0]).toMatchObject({ level: 1, positionInSet: 1, setSize: 2, expanded: true });
    expect(rows[1]).toMatchObject({ parentId: "catalog", level: 2, positionInSet: 1, setSize: 2, selected: true });
    expect(rows[2]).toMatchObject({ parentId: "missing", level: 3, positionInSet: 1, setSize: 1 });
  });

  it("按可见且可用节点计算键盘焦点", () => {
    const rows = pnwProjectNavigationTreeRows(model());

    expect(pnwNavigationTreeInitialFocusId(rows, model())).toBe("missing");
    expect(pnwNavigationTreeMoveFocus(rows, "missing", "next")).toBe("detail");
    expect(pnwNavigationTreeMoveFocus(rows, "settings", "previous")).toBe("detail");
    expect(pnwNavigationTreeChildFocusId(rows, "catalog")).toBe("missing");
    expect(pnwNavigationTreeParentFocusId(rows, "missing")).toBe("catalog");
    expect(pnwNavigationTreeParentFocusId(rows, "detail")).toBe("missing");
  });

  it("拒绝空 ID 与重复 ID，防止焦点和事件身份歧义", () => {
    expect(() => pnwProjectNavigationTreeRows({ nodes: [{ id: "", label: "空" }] })).toThrow(
      "不能为空",
    );
    expect(() =>
      pnwProjectNavigationTreeRows({
        nodes: [
          { id: "same", label: "A" },
          { id: "same", label: "B" },
        ],
      }),
    ).toThrow("必须唯一");
  });
});
