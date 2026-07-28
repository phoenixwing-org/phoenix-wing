import type {
  PnwWorkbenchLayoutState,
  PnwWorkbenchLayoutViewport,
  PnwWorkbenchPanelSizes,
  PnwRibbonAppearance,
  PnwRibbonDisplayMode,
  PnwRibbonIconSize,
  PnwRibbonMode,
  PnwViewBlockContributions,
  PnwViewBlockId,
  PnwViewBlockVisibility,
} from "../types/PnwWorkbenchWeb.js";

export const PNW_WORKBENCH_PANEL_SIZE_LIMITS = Object.freeze({
  primaryMin: 160,
  primaryMax: 560,
  secondaryMin: 160,
  secondaryMax: 560,
  bottomMin: 112,
  bottomMax: 600,
  editorMinWidth: 320,
  editorMinHeight: 180,
});

export const PNW_DEFAULT_WORKBENCH_PANEL_SIZES: PnwWorkbenchPanelSizes = Object.freeze({
  primaryWidth: 260,
  secondaryWidth: 280,
  bottomHeight: 190,
});

export const PNW_DEFAULT_WORKBENCH_LAYOUT_STATE: PnwWorkbenchLayoutState = Object.freeze({
  visibility: Object.freeze({ primary: false, bottom: false, secondary: false }),
  sizes: PNW_DEFAULT_WORKBENCH_PANEL_SIZES,
});

export const PNW_DEFAULT_RIBBON_APPEARANCE: PnwRibbonAppearance = Object.freeze({
  mode: "ribbon",
  compact: Object.freeze({
    iconSize: 24,
    showTitles: true,
    showGroupLabels: false,
  }),
  ribbon: Object.freeze({
    iconSize: 36,
    showTitles: true,
    showGroupLabels: true,
  }),
});

export const PNW_VIEW_BLOCK_IDS = ["primary", "bottom", "secondary"] as const;

function pnwClampWorkbenchSize(
  value: number,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  const finite = Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(Math.max(finite, minimum), Math.max(minimum, maximum));
}

/**
 * 修正可持久化布局尺寸。viewport.width 应排除 Tree ActivityBar；隐藏面板保留上次尺寸。
 */
export function pnwResolveWorkbenchLayoutState(
  state: PnwWorkbenchLayoutState,
  viewport?: PnwWorkbenchLayoutViewport,
): PnwWorkbenchLayoutState {
  const limits = PNW_WORKBENCH_PANEL_SIZE_LIMITS;
  const availableWidth = viewport && Number.isFinite(viewport.width) && viewport.width > 0
    ? viewport.width
    : undefined;
  const availableHeight = viewport && Number.isFinite(viewport.height) && viewport.height > 0
    ? viewport.height
    : undefined;
  let primaryWidth = pnwClampWorkbenchSize(
    state.sizes.primaryWidth,
    limits.primaryMin,
    limits.primaryMax,
    PNW_DEFAULT_WORKBENCH_PANEL_SIZES.primaryWidth,
  );
  let secondaryWidth = pnwClampWorkbenchSize(
    state.sizes.secondaryWidth,
    limits.secondaryMin,
    limits.secondaryMax,
    PNW_DEFAULT_WORKBENCH_PANEL_SIZES.secondaryWidth,
  );

  if (availableWidth !== undefined) {
    const sideBudget = Math.max(
      limits.primaryMin + limits.secondaryMin,
      availableWidth - limits.editorMinWidth,
    );
    if (state.visibility.primary && state.visibility.secondary) {
      let overflow = Math.max(0, primaryWidth + secondaryWidth - sideBudget);
      const secondaryReduction = Math.min(
        overflow,
        secondaryWidth - limits.secondaryMin,
      );
      secondaryWidth -= secondaryReduction;
      overflow -= secondaryReduction;
      primaryWidth = Math.max(limits.primaryMin, primaryWidth - overflow);
    } else if (state.visibility.primary) {
      primaryWidth = Math.min(
        primaryWidth,
        Math.max(limits.primaryMin, availableWidth - limits.editorMinWidth),
      );
    } else if (state.visibility.secondary) {
      secondaryWidth = Math.min(
        secondaryWidth,
        Math.max(limits.secondaryMin, availableWidth - limits.editorMinWidth),
      );
    }
  }

  const bottomMaximum = availableHeight === undefined
    ? limits.bottomMax
    : Math.min(limits.bottomMax, Math.max(
      limits.bottomMin,
      availableHeight - limits.editorMinHeight,
    ));
  const bottomHeight = pnwClampWorkbenchSize(
    state.sizes.bottomHeight,
    limits.bottomMin,
    bottomMaximum,
    PNW_DEFAULT_WORKBENCH_PANEL_SIZES.bottomHeight,
  );
  return {
    visibility: { ...state.visibility },
    sizes: { primaryWidth, secondaryWidth, bottomHeight },
  };
}

/** 单次句柄拖动/键盘调整产生完整新状态，便于 consumer 直接写回 Pinia。 */
export function pnwResizeWorkbenchLayoutState(
  state: PnwWorkbenchLayoutState,
  blockId: PnwViewBlockId,
  requestedSize: number,
  viewport?: PnwWorkbenchLayoutViewport,
): PnwWorkbenchLayoutState {
  const sizeKey = blockId === "primary"
    ? "primaryWidth"
    : blockId === "secondary"
      ? "secondaryWidth"
      : "bottomHeight";
  return pnwResolveWorkbenchLayoutState({
    visibility: state.visibility,
    sizes: { ...state.sizes, [sizeKey]: requestedSize },
  }, viewport);
}

export type PnwRibbonAppearanceIssueCode =
  | "ribbon.invalid-small-icon-size"
  | "ribbon.invalid-large-icon-size";

export type PnwRibbonAppearanceValidation =
  | {
      readonly valid: true;
      readonly appearance: PnwRibbonAppearance;
    }
  | {
      readonly valid: false;
      readonly appearance: PnwRibbonAppearance;
      readonly code: PnwRibbonAppearanceIssueCode;
      readonly message: string;
    };

export function pnwRibbonIconSizesFor(
  mode: PnwRibbonMode | PnwRibbonDisplayMode,
): readonly PnwRibbonIconSize[] {
  return mode === "ribbon" || mode === "large" ? [24, 36] : [16, 24];
}

/**
 * 计算 Ribbon 的自然高度。紧凑模式只由图标尺寸决定，Title 横向呈现且不得撑高工具条。
 */
export function pnwResolveRibbonNaturalHeight(appearance: PnwRibbonAppearance): number {
  const modeAppearance = appearance[appearance.mode];
  if (appearance.mode === "compact") {
    return Math.max(28, modeAppearance.iconSize + 10);
  }

  const toolHeight = modeAppearance.showTitles
    ? Math.max(64, modeAppearance.iconSize + 32)
    : Math.max(48, modeAppearance.iconSize + 20);
  return toolHeight + (modeAppearance.showGroupLabels ? 17 : 0);
}

/** 校验并回退非法尺寸组合；调用方可用返回的 code 输出开发期诊断。 */
export function pnwValidateRibbonAppearance(
  appearance: PnwRibbonAppearance,
): PnwRibbonAppearanceValidation {
  const compactValid = pnwRibbonIconSizesFor("compact").includes(appearance.compact.iconSize);
  const ribbonValid = pnwRibbonIconSizesFor("ribbon").includes(appearance.ribbon.iconSize);
  if (compactValid && ribbonValid) {
    return { valid: true, appearance };
  }

  const normalized: PnwRibbonAppearance = {
    ...appearance,
    compact: compactValid ? appearance.compact : { ...appearance.compact, iconSize: 24 },
    ribbon: ribbonValid ? appearance.ribbon : { ...appearance.ribbon, iconSize: 24 },
  };
  return {
    valid: false,
    appearance: normalized,
    code: compactValid ? "ribbon.invalid-large-icon-size" : "ribbon.invalid-small-icon-size",
    message: compactValid
      ? `PnwRibbon 大 Ribbon 仅支持 24/36px，已将 ${appearance.ribbon.iconSize}px 回退为 24px`
      : `PnwRibbon 紧凑工具条仅支持 16/24px，已将 ${appearance.compact.iconSize}px 回退为 24px`,
  };
}

/** Ribbon 横向键盘导航；返回 null 表示该按键不由 Ribbon 接管。 */
export function pnwNextRibbonFocusIndex(
  currentIndex: number,
  itemCount: number,
  key: string,
): number | null {
  if (itemCount <= 0) return null;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (Math.max(currentIndex, 0) + 1) % itemCount;
    case "ArrowLeft":
    case "ArrowUp":
      return (Math.max(currentIndex, 0) - 1 + itemCount) % itemCount;
    case "Home":
      return 0;
    case "End":
      return itemCount - 1;
    default:
      return null;
  }
}

export function pnwAvailableViewBlockIds(
  contributions: PnwViewBlockContributions,
): readonly PnwViewBlockId[] {
  return PNW_VIEW_BLOCK_IDS.filter((id) => Boolean(contributions[id]));
}

/** 不可用 Block 始终归一为隐藏，防止空容器占位。 */
export function pnwResolveViewBlockVisibility(
  contributions: PnwViewBlockContributions,
  visibility: PnwViewBlockVisibility,
): PnwViewBlockVisibility {
  return {
    primary: Boolean(contributions.primary && visibility.primary),
    bottom: Boolean(contributions.bottom && visibility.bottom),
    secondary: Boolean(contributions.secondary && visibility.secondary),
  };
}

export function pnwToggleViewBlockVisibility(
  contributions: PnwViewBlockContributions,
  visibility: PnwViewBlockVisibility,
  blockId: PnwViewBlockId,
): PnwViewBlockVisibility {
  const resolved = pnwResolveViewBlockVisibility(contributions, visibility);
  if (!contributions[blockId]) return resolved;
  return { ...resolved, [blockId]: !resolved[blockId] };
}
