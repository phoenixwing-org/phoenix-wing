import { describe, expect, it } from "vitest";
import type {
  PnwRibbonAppearance,
  PnwWorkbenchLayoutState,
} from "../types/PnwWorkbenchWeb.js";
import {
  PNW_DEFAULT_WORKBENCH_LAYOUT_STATE,
  PNW_DEFAULT_WORKBENCH_TAB_BAR_PLACEMENT,
  PNW_WORKBENCH_NARROW_BREAKPOINT,
  PNW_WORKBENCH_PANEL_SIZE_LIMITS,
  PNW_DEFAULT_ACTIVITY_TREE_APPEARANCE,
  PNW_DEFAULT_RIBBON_APPEARANCE,
  pnwAvailableViewBlockIds,
  pnwNextRibbonFocusIndex,
  pnwResolveViewBlockVisibility,
  pnwResolveRibbonNaturalHeight,
  pnwRibbonIconSizesFor,
  pnwToggleViewBlockVisibility,
  pnwResolveWorkbenchLayoutState,
  pnwResizeWorkbenchLayoutState,
  pnwResolveWorkbenchResponsiveState,
  pnwNormalizeWorkbenchTabBarPlacement,
  pnwNormalizeWorkbenchDisplayPreferences,
  pnwValidateRibbonAppearance,
  pnwShouldRestoreEditorFromKeyboard,
} from "./pnwWorkbenchWeb.js";

describe("PnwWorkbench 四区布局状态", () => {
  const visibleState: PnwWorkbenchLayoutState = {
    visibility: { primary: true, bottom: true, secondary: true },
    sizes: { primaryWidth: 320, secondaryWidth: 300, bottomHeight: 240 },
  };

  it("将非法与越界尺寸修正为可序列化的安全值", () => {
    expect(pnwResolveWorkbenchLayoutState({
      visibility: visibleState.visibility,
      sizes: {
        primaryWidth: Number.NaN,
        secondaryWidth: 900,
        bottomHeight: -20,
      },
    })).toEqual({
      visibility: visibleState.visibility,
      sizes: { primaryWidth: 260, secondaryWidth: 560, bottomHeight: 112 },
    });
  });

  it("侧栏共同给 Editor 留出最小宽度，Bottom 给 Editor 留出最小高度", () => {
    expect(pnwResolveWorkbenchLayoutState(visibleState, { width: 820, height: 500 })).toEqual({
      visibility: visibleState.visibility,
      sizes: { primaryWidth: 320, secondaryWidth: 180, bottomHeight: 240 },
    });
    expect(pnwResizeWorkbenchLayoutState(
      visibleState,
      "bottom",
      900,
      { width: 1200, height: 460 },
    ).sizes.bottomHeight).toBe(280);
  });

  it("隐藏面板保留上次尺寸，重新显示时仍可恢复", () => {
    const hiddenPrimary = {
      ...visibleState,
      visibility: { ...visibleState.visibility, primary: false },
    };
    expect(pnwResolveWorkbenchLayoutState(hiddenPrimary, { width: 700, height: 500 }).sizes)
      .toEqual(visibleState.sizes);
    expect(PNW_DEFAULT_WORKBENCH_LAYOUT_STATE.visibility)
      .toEqual({ primary: false, bottom: false, secondary: false });
  });

  it.each([
    [1920, 1152],
    [3840, 2304],
    [1281, 768],
    [1536.5, 921],
  ])("Primary 在 %spx View 中以向下取整的 60%% 为上限", (width, expected) => {
    const resolved = pnwResizeWorkbenchLayoutState(
      visibleState,
      "primary",
      Number.MAX_SAFE_INTEGER,
      { width, height: 1080 },
    );
    expect(resolved.sizes.primaryWidth).toBe(expected);
    expect(resolved.sizes.primaryWidth).toBeLessThanOrEqual(width * 0.6);
    expect(width - resolved.sizes.primaryWidth - resolved.sizes.secondaryWidth)
      .toBeGreaterThanOrEqual(PNW_WORKBENCH_PANEL_SIZE_LIMITS.editorMinWidth);
  });

  it("Primary 比例限制后仍优先收缩 Secondary 并保留两个面板与 Editor 的下限", () => {
    const resolved = pnwResizeWorkbenchLayoutState(
      visibleState,
      "primary",
      Number.MAX_SAFE_INTEGER,
      { width: 1000, height: 800 },
    );
    expect(resolved.sizes).toEqual({
      primaryWidth: 520,
      secondaryWidth: 160,
      bottomHeight: 240,
    });
    expect(1000 - resolved.sizes.primaryWidth - resolved.sizes.secondaryWidth).toBe(320);
    expect(pnwResolveWorkbenchLayoutState({
      ...visibleState,
      sizes: { ...visibleState.sizes, primaryWidth: 500 },
    }, { width: 1000, height: 800 }).sizes).toEqual({
      primaryWidth: 500,
      secondaryWidth: 180,
      bottomHeight: 240,
    });
  });

  it("隐藏 Secondary 时只按 Primary 比例与 Editor 预算约束", () => {
    const resolved = pnwResizeWorkbenchLayoutState({
      ...visibleState,
      visibility: { ...visibleState.visibility, secondary: false },
    }, "primary", Number.MAX_SAFE_INTEGER, { width: 700, height: 800 });
    expect(resolved.sizes).toEqual({
      primaryWidth: 380,
      secondaryWidth: 300,
      bottomHeight: 240,
    });
  });

  it("无 viewport 的首选宽度可超过 560px，其他面板的固定范围不变", () => {
    expect(pnwResolveWorkbenchLayoutState({
      ...visibleState,
      sizes: { primaryWidth: 1400, secondaryWidth: 900, bottomHeight: 900 },
    }).sizes).toEqual({ primaryWidth: 1400, secondaryWidth: 560, bottomHeight: 600 });
    expect(PNW_WORKBENCH_PANEL_SIZE_LIMITS).toEqual({
      primaryMin: 160,
      primaryMax: Number.MAX_SAFE_INTEGER,
      primaryMaxRatio: 0.6,
      secondaryMin: 160,
      secondaryMax: 560,
      bottomMin: 112,
      bottomMax: 600,
      editorMinWidth: 320,
      editorMinHeight: 180,
    });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "不可测的 View 宽度 %s 不限制有限 Primary 首选值",
    (width) => {
      expect(pnwResolveWorkbenchLayoutState({
        ...visibleState,
        sizes: { ...visibleState.sizes, primaryWidth: 1400 },
      }, { width, height: 800 }).sizes.primaryWidth).toBe(1400);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "非法 Primary 首选值 %s 回到默认宽度",
    (primaryWidth) => {
      expect(pnwResolveWorkbenchLayoutState({
        ...visibleState,
        sizes: { ...visibleState.sizes, primaryWidth },
      }).sizes.primaryWidth).toBe(260);
    },
  );

  it("极大有限 Primary 值限制为安全整数，合法小数仍按既有像素规则取整", () => {
    expect(pnwResizeWorkbenchLayoutState(visibleState, "primary", Number.MAX_VALUE)
      .sizes.primaryWidth).toBe(Number.MAX_SAFE_INTEGER);
    expect(pnwResizeWorkbenchLayoutState(visibleState, "primary", 900.7)
      .sizes.primaryWidth).toBe(901);
    expect(pnwResizeWorkbenchLayoutState(visibleState, "primary", -Number.MAX_VALUE)
      .sizes.primaryWidth).toBe(160);
  });

  it("隐藏 Primary 保留大屏偏好，显示时临时夹住并能在 View 变大后恢复", () => {
    const preferred = {
      ...visibleState,
      sizes: { ...visibleState.sizes, primaryWidth: 2000 },
    };
    const hidden = {
      ...preferred,
      visibility: { ...preferred.visibility, primary: false },
    };
    expect(pnwResolveWorkbenchLayoutState(hidden, { width: 1000, height: 800 })
      .sizes.primaryWidth).toBe(2000);
    expect(pnwResolveWorkbenchLayoutState(preferred, { width: 1000, height: 800 })
      .sizes.primaryWidth).toBe(520);
    expect(pnwResolveWorkbenchLayoutState(preferred, { width: 3840, height: 2160 })
      .sizes.primaryWidth).toBe(2000);
    expect(preferred.sizes.primaryWidth).toBe(2000);
  });

  it("resolve 与 resize 不突变或共享输入的尺寸和显隐对象", () => {
    const state = Object.freeze({
      visibility: Object.freeze({ ...visibleState.visibility }),
      sizes: Object.freeze({ ...visibleState.sizes, primaryWidth: 1400 }),
    });
    const viewport = Object.freeze({ width: 1000, height: 800 });
    const resolved = pnwResolveWorkbenchLayoutState(state, viewport);
    const resized = pnwResizeWorkbenchLayoutState(state, "primary", 900, viewport);
    for (const result of [resolved, resized]) {
      expect(result).not.toBe(state);
      expect(result.visibility).not.toBe(state.visibility);
      expect(result.sizes).not.toBe(state.sizes);
      expect(result.sizes.primaryWidth).toBe(520);
    }
    expect(state).toEqual({
      visibility: visibleState.visibility,
      sizes: { ...visibleState.sizes, primaryWidth: 1400 },
    });
  });
});

describe("PnwWorkbench View 标签位置", () => {
  it("只在 Escape 未被子浮层消费时请求退出 Editor 最大化", () => {
    expect(pnwShouldRestoreEditorFromKeyboard("Escape")).toBe(true);
    expect(pnwShouldRestoreEditorFromKeyboard("Escape", true)).toBe(false);
    expect(pnwShouldRestoreEditorFromKeyboard("Enter")).toBe(false);
  });

  it("默认保持既有 Header 内页签", () => {
    expect(PNW_DEFAULT_WORKBENCH_TAB_BAR_PLACEMENT).toBe("header");
    expect(pnwNormalizeWorkbenchTabBarPlacement("unknown-placement")).toBe("header");
    expect(pnwNormalizeWorkbenchTabBarPlacement("editor-bottom")).toBe("editor-bottom");
  });

  it("窄容器只覆盖实际呈现并保留 consumer 偏好", () => {
    expect(pnwResolveWorkbenchResponsiveState(
      "tree",
      "header",
      PNW_WORKBENCH_NARROW_BREAKPOINT,
    )).toEqual({
      narrow: true,
      preferredPresentation: "tree",
      effectivePresentation: "ribbon",
      preferredTabBarPlacement: "header",
      effectiveTabBarPlacement: "after-navigation",
    });

    expect(pnwResolveWorkbenchResponsiveState("tree", "header", 841)).toMatchObject({
      narrow: false,
      effectivePresentation: "tree",
      effectiveTabBarPlacement: "header",
    });
    expect(pnwResolveWorkbenchResponsiveState("ribbon", "editor-bottom", 700)).toMatchObject({
      narrow: true,
      effectivePresentation: "ribbon",
      effectiveTabBarPlacement: "editor-bottom",
    });
  });

  it("统一修正持久化显示配置中的非法枚举、尺寸、布尔值和浮层坐标", () => {
    expect(pnwNormalizeWorkbenchDisplayPreferences({
      presentation: "drawer",
      ribbonAppearance: {
        mode: "wide",
        compact: { iconSize: 36, showTitles: "yes" },
        ribbon: { iconSize: 16, showTitles: false, showGroupLabels: false },
      },
      treeCollapsed: "yes",
      treeAppearance: { expanded: "legacy", collapsed: "popup" },
      tabBarPlacement: "unknown-placement",
      colorScheme: "blue",
      layoutState: {
        visibility: { primary: true, bottom: "yes", secondary: false },
        sizes: { primaryWidth: 900, secondaryWidth: Number.NaN, bottomHeight: -4 },
      },
      settingsPositions: {
        quick: { x: Number.NaN, y: 120 },
        full: { x: 44, y: "top" },
      },
    })).toMatchObject({
      presentation: "ribbon",
      ribbonAppearance: {
        mode: "ribbon",
        compact: { iconSize: 24, showTitles: true, showGroupLabels: false },
        ribbon: { iconSize: 36, showTitles: false, showGroupLabels: false },
      },
      treeCollapsed: false,
      treeAppearance: { expanded: "outline", collapsed: "leaf-rail" },
      tabBarPlacement: "header",
      colorScheme: "system",
      layoutState: {
        visibility: { primary: true, bottom: false, secondary: false },
        sizes: { primaryWidth: 900, secondaryWidth: 280, bottomHeight: 112 },
      },
      settingsPositions: {
        quick: { x: 16, y: 120 },
        full: { x: 44, y: 8 },
      },
    });
  });

  it("无 viewport 的显示偏好归一化往返保留超过旧上限的 Primary 宽度", () => {
    const preferences = pnwNormalizeWorkbenchDisplayPreferences({
      layoutState: {
        visibility: { primary: true, bottom: false, secondary: false },
        sizes: { primaryWidth: 900, secondaryWidth: 280, bottomHeight: 190 },
      },
    });
    expect(preferences.layoutState.sizes.primaryWidth).toBe(900);
    expect(pnwNormalizeWorkbenchDisplayPreferences(JSON.parse(JSON.stringify(preferences))))
      .toEqual(preferences);
  });

  it("允许 consumer 的合法默认标签位置参与缺省回退", () => {
    expect(pnwNormalizeWorkbenchDisplayPreferences(
      { tabBarPlacement: "unknown-placement" },
      {
        ...pnwNormalizeWorkbenchDisplayPreferences(undefined),
        tabBarPlacement: "editor-bottom",
      },
    ).tabBarPlacement).toBe("editor-bottom");
  });
});

describe("PnwRibbon 外观", () => {
  it("仅接受小图标 16/24px 与大图标 24/36px", () => {
    expect(pnwRibbonIconSizesFor("compact")).toEqual([16, 24]);
    expect(pnwRibbonIconSizesFor("ribbon")).toEqual([24, 36]);
    expect(pnwRibbonIconSizesFor("icon")).toEqual([16, 24]);
    expect(pnwRibbonIconSizesFor("icon-title")).toEqual([16, 24]);
    expect(pnwRibbonIconSizesFor("large")).toEqual([24, 36]);

    const legalAppearances: PnwRibbonAppearance[] = [
      {
        ...PNW_DEFAULT_RIBBON_APPEARANCE,
        compact: {
          ...PNW_DEFAULT_RIBBON_APPEARANCE.compact,
          iconSize: 16,
          showTitles: false,
        },
      },
      {
        ...PNW_DEFAULT_RIBBON_APPEARANCE,
        ribbon: { ...PNW_DEFAULT_RIBBON_APPEARANCE.ribbon, iconSize: 24 },
      },
      PNW_DEFAULT_RIBBON_APPEARANCE,
    ];
    expect(legalAppearances.every((appearance) => pnwValidateRibbonAppearance(appearance).valid))
      .toBe(true);
  });

  it("非法组合返回清晰诊断并回退到 24px", () => {
    expect(pnwValidateRibbonAppearance({
      ...PNW_DEFAULT_RIBBON_APPEARANCE,
      ribbon: { ...PNW_DEFAULT_RIBBON_APPEARANCE.ribbon, iconSize: 16 as 24 },
    })).toMatchObject({
      valid: false,
      code: "ribbon.invalid-large-icon-size",
      appearance: { ribbon: { iconSize: 24 } },
    });
    expect(pnwValidateRibbonAppearance({
      ...PNW_DEFAULT_RIBBON_APPEARANCE,
      compact: { ...PNW_DEFAULT_RIBBON_APPEARANCE.compact, iconSize: 36 as 24 },
    })).toMatchObject({
      valid: false,
      code: "ribbon.invalid-small-icon-size",
      appearance: { compact: { iconSize: 24 } },
    });
  });

  it("紧凑工具条高度只跟随图标尺寸且不受 Title 影响", () => {
    const pnwCompactHeight = (iconSize: 16 | 24, showTitles: boolean) =>
      pnwResolveRibbonNaturalHeight({
        ...PNW_DEFAULT_RIBBON_APPEARANCE,
        mode: "compact",
        compact: {
          ...PNW_DEFAULT_RIBBON_APPEARANCE.compact,
          iconSize,
          showTitles,
        },
      });

    expect(pnwCompactHeight(16, false)).toBe(28);
    expect(pnwCompactHeight(16, true)).toBe(28);
    expect(pnwCompactHeight(24, false)).toBe(34);
    expect(pnwCompactHeight(24, true)).toBe(34);
  });

  it("支持循环方向键与 Home/End 焦点规则", () => {
    expect(pnwNextRibbonFocusIndex(2, 3, "ArrowRight")).toBe(0);
    expect(pnwNextRibbonFocusIndex(0, 3, "ArrowLeft")).toBe(2);
    expect(pnwNextRibbonFocusIndex(1, 3, "Home")).toBe(0);
    expect(pnwNextRibbonFocusIndex(1, 3, "End")).toBe(2);
    expect(pnwNextRibbonFocusIndex(1, 3, "Enter")).toBeNull();
  });
});

describe("PnwActivityTree 外观", () => {
  it("默认保持既有大纲树与全部叶子图标栏", () => {
    expect(PNW_DEFAULT_ACTIVITY_TREE_APPEARANCE).toEqual({
      expanded: "outline",
      collapsed: "leaf-rail",
    });
  });
});

describe("View Block contribution", () => {
  const contributions = { primary: true, bottom: true } as const;
  const visibility = { primary: true, bottom: false, secondary: true } as const;

  it("Footer 只枚举当前 View 可用的 Block", () => {
    expect(pnwAvailableViewBlockIds(contributions)).toEqual(["primary", "bottom"]);
  });

  it("不可用 Block 不占位且不能被开关打开", () => {
    expect(pnwResolveViewBlockVisibility(contributions, visibility)).toEqual({
      primary: true,
      bottom: false,
      secondary: false,
    });
    expect(pnwToggleViewBlockVisibility(contributions, visibility, "secondary").secondary)
      .toBe(false);
  });

  it("可用 Block 由宿主显隐状态受控切换", () => {
    expect(pnwToggleViewBlockVisibility(contributions, visibility, "bottom").bottom).toBe(true);
    expect(pnwToggleViewBlockVisibility(contributions, visibility, "primary").primary).toBe(false);
  });
});
