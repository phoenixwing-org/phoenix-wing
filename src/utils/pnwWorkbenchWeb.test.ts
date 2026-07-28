import { describe, expect, it } from "vitest";
import type {
  PnwRibbonAppearance,
  PnwWorkbenchLayoutState,
} from "../types/PnwWorkbenchWeb.js";
import {
  PNW_DEFAULT_WORKBENCH_LAYOUT_STATE,
  PNW_DEFAULT_RIBBON_APPEARANCE,
  pnwAvailableViewBlockIds,
  pnwNextRibbonFocusIndex,
  pnwResolveViewBlockVisibility,
  pnwResolveRibbonNaturalHeight,
  pnwRibbonIconSizesFor,
  pnwToggleViewBlockVisibility,
  pnwResolveWorkbenchLayoutState,
  pnwResizeWorkbenchLayoutState,
  pnwValidateRibbonAppearance,
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
