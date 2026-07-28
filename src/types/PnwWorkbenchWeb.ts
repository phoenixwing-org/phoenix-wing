/**
 * Pnw Web 工作台的实验性纯数据契约。
 *
 * W0-W3 只验证 Vue Web 呈现；在 W4 的两个真实消费者验收完成前，
 * 这些类型不承诺冻结为版本化协议。
 */

export type PnwActivityBarPresentation = "ribbon" | "tree";

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
 * `icon` 保持为 unknown，使纯 TypeScript 契约不依赖 Vue 或任一图标库；
 * Vue 呈现层接受文本图标或宿主提供的 Vue Component。
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

export interface PnwWorkbenchLayoutViewport {
  readonly width: number;
  readonly height: number;
}
