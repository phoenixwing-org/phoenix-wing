import type { Component, MaybeRefOrGetter } from "vue";
import type { PnwBottomPanelTab } from "./PnwWorkbenchWeb.js";
import type { PnwWorkbenchResponsiveState } from "./PnwWorkbenchWeb.js";
import type { PnwViewPresentationContribution } from "./PnwViewPresentation.js";

/** Vue Web View 提供给工作台 Block 的动态组件；业务状态仍由 View 持有。 */
export interface PnwViewBlockComponentContribution {
  readonly component: Component;
  readonly props?: MaybeRefOrGetter<Readonly<Record<string, unknown>>>;
}

/** Bottom 在动态内容之外还可提供自己的页签定义。 */
export interface PnwBottomViewBlockComponentContribution
  extends PnwViewBlockComponentContribution {
  readonly tabs?: MaybeRefOrGetter<readonly PnwBottomPanelTab[]>;
}

/**
 * Vue 专用的 View Block 组件集合。
 *
 * 纯 TypeScript 的可用性契约仍是 `PnwViewBlockContributions`；该类型只用于
 * Web consumer 把实际组件动态交给 `PnwWorkbenchShell`。
 */
export interface PnwViewBlockComponentContributions {
  readonly primary?: PnwViewBlockComponentContribution;
  readonly bottom?: PnwBottomViewBlockComponentContribution;
  readonly secondary?: PnwViewBlockComponentContribution;
}

/** Vue View 的完整 contribution；业务组件 Block 与 presentation 能力共用一次注册。 */
export interface PnwViewComponentContributions extends PnwViewBlockComponentContributions {
  readonly presentation?: PnwViewPresentationContribution;
}

/**
 * 工作台显示菜单向 consumer 追加项暴露的最小信号接口。
 *
 * actionId 由 consumer 自己定义和处理；Wing 只沿组件层级转发。
 */
export interface PnwWorkbenchDisplaySettingsActionSlotProps {
  readonly emitAction: (actionId: string) => void;
}

/** Layout 的 Header/Activity slot 可读取瞬时最大化状态并请求受控更新。 */
export interface PnwWorkbenchLayoutSlotProps extends PnwWorkbenchResponsiveState {
  readonly editorMaximized: boolean;
  readonly requestEditorMaximized: (maximized: boolean) => void;
}
