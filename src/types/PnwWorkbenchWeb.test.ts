import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  PnwActivityBarPresentation,
  PnwActivityTreeAppearance,
  PnwActivityTreeCollapsedMode,
  PnwActivityTreeExpandedMode,
  PnwNavigationNode,
  PnwRibbonAppearance,
  PnwRibbonDisplayMode,
  PnwRibbonIconSize,
  PnwRibbonMode,
  PnwViewBlockContributions,
  PnwViewBlockVisibility,
  PnwWorkbenchTabBarPlacement,
} from "./PnwWorkbenchWeb.js";

describe("Pnw Web 工作台实验契约", () => {
  it("用一份只读导航树表达受控顺序、可见性和层级", () => {
    const navigation = [
      {
        id: "workspace",
        label: "工作空间",
        shortLabel: "工作",
        order: 10,
        children: [
          { id: "overview", label: "概览", icon: "⌂" },
          { id: "hidden-draft", label: "草稿", hidden: true },
          { id: "locked", label: "受限页面", disabled: true },
        ],
      },
    ] as const satisfies readonly PnwNavigationNode[];

    expect(navigation[0].children.map((node) => node.id)).toEqual([
      "overview",
      "hidden-draft",
      "locked",
    ]);
    expect(navigation[0].shortLabel).toBe("工作");
    expectTypeOf(navigation).toMatchTypeOf<readonly PnwNavigationNode[]>();
  });

  it("固定呈现、外观和 View Block 的受控状态形状", () => {
    expectTypeOf<PnwActivityBarPresentation>().toEqualTypeOf<"ribbon" | "tree">();
    expectTypeOf<PnwActivityTreeExpandedMode>().toEqualTypeOf<"outline" | "admin-menu">();
    expectTypeOf<PnwActivityTreeCollapsedMode>().toEqualTypeOf<"leaf-rail" | "root-flyout">();
    expectTypeOf<PnwRibbonDisplayMode>().toEqualTypeOf<"icon" | "icon-title" | "large">();
    expectTypeOf<PnwRibbonIconSize>().toEqualTypeOf<16 | 24 | 36>();
    expectTypeOf<PnwRibbonMode>().toEqualTypeOf<"ribbon" | "compact">();
    expectTypeOf<PnwWorkbenchTabBarPlacement>().toEqualTypeOf<
      "header" | "after-navigation" | "editor-bottom"
    >();

    const appearance = {
      mode: "compact",
      compact: {
        iconSize: 24,
        showTitles: true,
        showGroupLabels: false,
      },
      ribbon: {
        iconSize: 36,
        showTitles: true,
        showGroupLabels: false,
      },
    } as const satisfies PnwRibbonAppearance;
    const treeAppearance = {
      expanded: "admin-menu",
      collapsed: "root-flyout",
    } as const satisfies PnwActivityTreeAppearance;
    const contributions: PnwViewBlockContributions = { primary: true, bottom: true };
    const visibility = {
      primary: true,
      bottom: false,
      secondary: false,
    } satisfies PnwViewBlockVisibility;

    expect(appearance).toMatchObject({ mode: "compact", compact: { iconSize: 24 } });
    expect(treeAppearance).toEqual({ expanded: "admin-menu", collapsed: "root-flyout" });
    expect(contributions.secondary).toBeUndefined();
    expect(visibility.bottom).toBe(false);
  });
});
