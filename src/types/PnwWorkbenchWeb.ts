/**
 * Pnw Web 工作台的实验性纯数据契约。
 *
 * W0-W3 只验证 Vue Web 呈现；在 W4 的两个真实消费者验收完成前，
 * 这些类型不承诺冻结为版本化协议。
 */
import type { PnwViewPresentationContribution } from "./PnwViewPresentation.js";

export type PnwActivityBarPresentation = "ribbon" | "tree";

export type PnwActivityTreeExpandedMode = "outline" | "admin-menu";

export type PnwActivityTreeCollapsedMode = "leaf-rail" | "root-flyout";

/** Tree 展开与收起外观分别保存，切换 presentation/collapsed 不覆盖另一状态。 */
export interface PnwActivityTreeAppearance {
  readonly expanded: PnwActivityTreeExpandedMode;
  readonly collapsed: PnwActivityTreeCollapsedMode;
}

export type PnwRibbonDisplayMode = "icon" | "icon-title" | "large";

export type PnwRibbonIconSize = 16 | 24 | 36;

export type PnwRibbonMode = "ribbon" | "compact";

export interface PnwRibbonModeAppearance {
  readonly iconSize: PnwRibbonIconSize;
  readonly showTitles: boolean;
  /** 大 Ribbon 使用；紧凑工具条保留同形数据但不呈现。 */
  readonly showGroupLabels: boolean;
}

export interface PnwRibbonAppearance {
  readonly mode: PnwRibbonMode;
  /** 两类配置同时保留，切换模式不覆盖紧凑工具条偏好。 */
  readonly compact: PnwRibbonModeAppearance;
  /** 两类配置同时保留，切换模式不覆盖大 Ribbon 偏好。 */
  readonly ribbon: PnwRibbonModeAppearance;
}

/**
 * 由产品宿主过滤并受控传入的导航节点。
 *
 * `icon` 保持为 unknown，使纯 TypeScript 契约不依赖 Vue 或任一图标库。
 * 新可序列化数据应传显式 PnwIconId（例如 `pnw:dashboard` 或 `cool:folder`）；
 * 裸 PnwIconName 只作运行时兼容，不应继续写入 manifest / DTO；
 * Vue 呈现层继续兼容旧文本图标或宿主提供的 Vue Component。
 */
export interface PnwNavigationNode {
  readonly id: string;
  readonly label: string;
  /** 空间受限的壳层位置可优先使用；完整 label 仍用于树、提示与无障碍名称。 */
  readonly shortLabel?: string;
  readonly icon?: unknown;
  readonly disabled?: boolean;
  readonly hidden?: boolean;
  /** 同级排序；相同或缺省值保持输入顺序。 */
  readonly order?: number;
  readonly children?: readonly PnwNavigationNode[];
}

/** Header 页签只消费的最小公共形状；业务 payload 与 session 状态仍由宿主持有。 */
export interface PnwWorkbenchTabItem {
  readonly id: string;
  readonly pageId: string;
  readonly title: string;
  readonly dirty: boolean;
  readonly subtitle?: string;
}

/**
 * View TabBar 的壳层位置。
 *
 * `after-navigation` 在 Ribbon 后或 Tree 的 Editor 顶部；`editor-bottom` 位于 Bottom 后。
 */
export type PnwWorkbenchTabBarPlacement =
  | "header"
  | "after-navigation"
  | "editor-bottom";

/**
 * Workbench 根据自身容器宽度计算的瞬时呈现状态。
 *
 * `preferred*` 仍由 consumer 持久化；`effective*` 只负责当前布局，窄屏恢复后不覆盖偏好。
 */
export interface PnwWorkbenchResponsiveState {
  readonly narrow: boolean;
  readonly preferredPresentation: PnwActivityBarPresentation;
  readonly effectivePresentation: PnwActivityBarPresentation;
  readonly preferredTabBarPlacement: PnwWorkbenchTabBarPlacement;
  readonly effectiveTabBarPlacement: PnwWorkbenchTabBarPlacement;
}

export type PnwViewBlockId = "primary" | "bottom" | "secondary";

export type PnwBottomPanelTabTone = "default" | "warning" | "error";

/** Bottom 容器的最小页签形状；页签内容与生命周期仍由 consumer 持有。 */
export interface PnwBottomPanelTab {
  readonly id: string;
  readonly label: string;
  readonly count?: number;
  readonly disabled?: boolean;
  readonly tone?: PnwBottomPanelTabTone;
}

/** 当前 View 明确声明可提供的 Block；缺省或 false 表示无内容。 */
export interface PnwViewBlockContributions {
  readonly primary?: boolean;
  readonly bottom?: boolean;
  readonly secondary?: boolean;
}

/** View 对工作台的完整纯数据 contribution；presentation 不是 Block。 */
export interface PnwViewContributions extends PnwViewBlockContributions {
  readonly presentation?: PnwViewPresentationContribution;
}

/** Block 显隐由宿主受控；Wing 不持久化该状态。 */
export type PnwViewBlockVisibility = Readonly<Record<PnwViewBlockId, boolean>>;

/** 四区工作台只有三个独立尺寸；Editor 始终占用剩余空间。 */
export interface PnwWorkbenchPanelSizes {
  readonly primaryWidth: number;
  readonly secondaryWidth: number;
  readonly bottomHeight: number;
}

/** consumer 可直接放入 Pinia 的可序列化受控布局状态。 */
export interface PnwWorkbenchLayoutState {
  readonly visibility: PnwViewBlockVisibility;
  readonly sizes: PnwWorkbenchPanelSizes;
}

/**
 * 工作台显示设置的两个浮层位置。
 *
 * Wing 负责拖动与可见边界修正；consumer 决定是否放入 Pinia、浏览器存储或后端偏好。
 */
export interface PnwWorkbenchDisplaySettingsPositions {
  readonly quick: {
    readonly x: number;
    readonly y: number;
  };
  readonly full: {
    readonly x: number;
    readonly y: number;
  };
}

/** 工作台第一层显示配置的完整可序列化快照。 */
export interface PnwWorkbenchDisplayPreferences {
  readonly presentation: PnwActivityBarPresentation;
  readonly ribbonAppearance: PnwRibbonAppearance;
  readonly treeCollapsed: boolean;
  readonly treeAppearance: PnwActivityTreeAppearance;
  readonly tabBarPlacement: PnwWorkbenchTabBarPlacement;
  readonly colorScheme: "light" | "dark" | "system";
  readonly layoutState: PnwWorkbenchLayoutState;
  readonly settingsPositions: PnwWorkbenchDisplaySettingsPositions;
}

export interface PnwWorkbenchLayoutViewport {
  readonly width: number;
  readonly height: number;
}
