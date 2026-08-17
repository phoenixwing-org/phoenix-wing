import type { PnwFloatingPanelSize } from "../utils/pnwFloatingPanel.js";

/** 浮动呈现允许调整的尺寸轴；内部可继续提供八方向抓手。 */
export type PnwPresentationResizeMode = false | "horizontal" | "vertical" | "both";

export type PnwPresentationOwnerKind = "tool" | "view";
export type PnwPresentationCloseBehavior = "close" | "reattach";

/**
 * Tool 与完整 View 共用的浮动外壳能力；不包含各自的 owner 与销毁语义。
 * 当前尺寸由受控状态持有，临时 z-index 不进入持久化数据。
 */
export interface PnwPresentationFrameDefinition {
  readonly ownerKind?: PnwPresentationOwnerKind;
  readonly movable?: boolean;
  readonly resizable?: PnwPresentationResizeMode;
  readonly recommendedSize?: Partial<PnwFloatingPanelSize>;
  readonly minSize?: Partial<PnwFloatingPanelSize>;
  readonly maxSize?: Partial<PnwFloatingPanelSize>;
  readonly rememberBounds?: boolean;
  readonly closeBehavior?: PnwPresentationCloseBehavior;
}

export interface PnwResolvedPresentationFrameDefinition {
  readonly ownerKind: PnwPresentationOwnerKind;
  readonly movable: boolean;
  readonly resizable: PnwPresentationResizeMode;
  readonly recommendedSize: PnwFloatingPanelSize;
  readonly minSize: PnwFloatingPanelSize;
  readonly maxSize?: PnwFloatingPanelSize;
  readonly rememberBounds: boolean;
  readonly closeBehavior: PnwPresentationCloseBehavior;
}
