import type { PnwFloatingPanelPosition } from "../utils/pnwFloatingPanel.js";

/** 可停靠工具的呈现位置；同一状态在任一时刻最多只有一种呈现。 */
export type PnwDockableToolMode = "closed" | "floating" | "primary";

/**
 * application 工具跨 View 保持可见；view 工具只在 owner View 激活时呈现。
 * View 作用域只影响派生可见性，不改写持久化状态。
 */
export type PnwDockableToolScope = "application" | "view";

/** Primary 中的最小稳定顺序；任意拖拽排序留给取得真实消费者证据后的演进。 */
export type PnwDockablePrimaryPlacement = "first" | "last";

interface PnwDockableToolDefinitionBase {
  readonly id: string;
  readonly title: string;
  readonly ariaLabel?: string;
}

export type PnwDockableToolDefinition =
  | (PnwDockableToolDefinitionBase & {
      readonly scope?: "application";
      readonly ownerViewId?: never;
    })
  | (PnwDockableToolDefinitionBase & {
      readonly scope: "view";
      readonly ownerViewId: string;
    });

/** 由 Host 持有并选择 Pinia、localStorage 或后端等持久化介质。 */
export interface PnwDockableToolState {
  readonly mode: PnwDockableToolMode;
  readonly floatingPosition: PnwFloatingPanelPosition;
  readonly primaryPlacement: PnwDockablePrimaryPlacement;
  readonly primaryExpanded: boolean;
}

export type PnwDockableToolCommand =
  | { readonly type: "open-floating" }
  | { readonly type: "dock-primary" }
  | { readonly type: "close" }
  | {
      readonly type: "set-floating-position";
      readonly position: PnwFloatingPanelPosition;
    }
  | {
      readonly type: "set-primary-placement";
      readonly placement: PnwDockablePrimaryPlacement;
    }
  | {
      readonly type: "set-primary-expanded";
      readonly expanded: boolean;
    };
