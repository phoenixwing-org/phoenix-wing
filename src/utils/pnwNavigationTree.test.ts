import { describe, expect, it } from "vitest";
import type { PnwNavigationNode } from "../types/PnwWorkbenchWeb.js";
import {
  pnwFlattenNavigationTree,
  pnwNormalizeNavigationVisibility,
  pnwNavigationFromRibbonTabs,
  pnwNavigationLeaves,
  pnwNavigationLeafIds,
  pnwNavigationNodeContains,
  pnwProjectNavigationRibbon,
  pnwVisibleNavigationNodes,
} from "./pnwNavigationTree.js";

const PNW_NAVIGATION_FIXTURE = [
  {
    id: "code",
    label: "代码工具",
    order: 20,
    children: [
      {
        id: "generate",
        label: "生成",
        children: [
          { id: "codegen", label: "参数代码", order: 20 },
          { id: "dialog", label: "对话框", order: 10, disabled: true },
        ],
      },
    ],
  },
  {
    id: "workspace",
    label: "工作空间",
    order: 10,
    children: [
      { id: "overview", label: "概览" },
      { id: "draft", label: "草稿", hidden: true },
    ],
  },
] as const satisfies readonly PnwNavigationNode[];

describe("受控导航树投影", () => {
  it("自底向上只派生一次 hidden，空目录不会误变为可激活叶子", () => {
    const visibleLeaf = { id: "visible", label: "可见页" } as const;
    const hiddenLeaf = { id: "hidden", label: "隐藏页", hidden: true } as const;
    const emptyRoot = { id: "empty", label: "空目录", children: [] } as const;
    const hiddenRoot = {
      id: "hidden-root",
      label: "无权限目录",
      children: [{
        id: "hidden-group",
        label: "无权限子目录",
        children: [hiddenLeaf],
      }],
    } as const;
    const visibleRoot = {
      id: "visible-root",
      label: "可见目录",
      children: [visibleLeaf, hiddenLeaf],
    } as const;
    const nodes = [emptyRoot, hiddenRoot, visibleRoot] satisfies readonly PnwNavigationNode[];

    const normalized = pnwNormalizeNavigationVisibility(nodes);

    expect(normalized).not.toBe(nodes);
    expect(normalized[0]).toMatchObject({ id: "empty", hidden: true });
    expect(normalized[1]).toMatchObject({ id: "hidden-root", hidden: true });
    expect(normalized[1]?.children?.[0]).toMatchObject({ id: "hidden-group", hidden: true });
    expect(normalized[2]).toBe(visibleRoot);
    expect(emptyRoot).not.toHaveProperty("hidden");
    expect(hiddenRoot).not.toHaveProperty("hidden");
    expect(pnwNormalizeNavigationVisibility(normalized)).toBe(normalized);
    expect(pnwVisibleNavigationNodes(nodes)).toEqual([visibleRoot]);
    expect(pnwNavigationLeafIds(nodes)).toEqual(["visible"]);
  });

  it("把既有 Ribbon Tab 兼容配置转换为同一导航树", () => {
    const nodes = pnwNavigationFromRibbonTabs([
      {
        id: "issue",
        label: "Issue 管理",
        groups: [{
          id: "issue-nav",
          label: "导航",
          items: [{ pageId: "dashboard", label: "仪表盘" }],
        }],
      },
    ], {
      iconFor: (pageId) => `icon:${pageId}`,
      shortLabelFor: () => "Issue",
    });

    expect(nodes).toEqual([{
      id: "issue",
      label: "Issue 管理",
      shortLabel: "Issue",
      children: [{
        id: "issue-nav",
        label: "导航",
        children: [{ id: "dashboard", label: "仪表盘", icon: "icon:dashboard" }],
      }],
    }]);
    expect(pnwNavigationLeafIds(nodes)).toEqual(["dashboard"]);
  });

  it("按 order 稳定排序且隐藏节点连同子树不参与呈现", () => {
    expect(pnwVisibleNavigationNodes(PNW_NAVIGATION_FIXTURE).map((node) => node.id))
      .toEqual(["workspace", "code"]);
    expect(pnwNavigationLeafIds(PNW_NAVIGATION_FIXTURE))
      .toEqual(["overview", "dialog", "codegen"]);
    expect(pnwNavigationLeaves(PNW_NAVIGATION_FIXTURE))
      .toEqual([
        PNW_NAVIGATION_FIXTURE[1].children[0],
        PNW_NAVIGATION_FIXTURE[0].children[0].children[1],
        PNW_NAVIGATION_FIXTURE[0].children[0].children[0],
      ]);
    expect(pnwNavigationNodeContains(PNW_NAVIGATION_FIXTURE[0], "codegen")).toBe(true);
    expect(pnwNavigationNodeContains(PNW_NAVIGATION_FIXTURE[0], "overview")).toBe(false);
  });

  it("仅按受控 expandedNodeIds 展开 Tree", () => {
    expect(pnwFlattenNavigationTree(PNW_NAVIGATION_FIXTURE, []).map((row) => row.node.id))
      .toEqual(["workspace", "code"]);
    expect(pnwFlattenNavigationTree(PNW_NAVIGATION_FIXTURE, ["workspace", "code", "generate"])
      .map((row) => [row.node.id, row.depth, row.parentId]))
      .toEqual([
        ["workspace", 1, undefined],
        ["overview", 2, "workspace"],
        ["code", 1, undefined],
        ["generate", 2, "code"],
        ["dialog", 3, "generate"],
        ["codegen", 3, "generate"],
      ]);
  });

  it("Ribbon 与 Tree 共享同一组末级 ID、禁用状态和节点引用", () => {
    const modules = pnwProjectNavigationRibbon(PNW_NAVIGATION_FIXTURE);
    const ribbonItems = modules.flatMap((module) => module.groups.flatMap((group) => group.items));

    expect(modules.map((module) => module.id)).toEqual(["workspace", "code"]);
    expect(ribbonItems.map((node) => node.id)).toEqual(pnwNavigationLeafIds(PNW_NAVIGATION_FIXTURE));
    expect(ribbonItems.find((node) => node.id === "dialog")?.disabled).toBe(true);
    expect(ribbonItems.find((node) => node.id === "codegen"))
      .toBe(PNW_NAVIGATION_FIXTURE[0].children[0].children[0]);
  });
});
