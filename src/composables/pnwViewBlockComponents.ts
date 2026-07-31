import { toValue } from "vue";
import type {
  PnwBottomViewBlockComponentContribution,
  PnwViewBlockComponentContribution,
  PnwViewBlockComponentContributions,
} from "../types/PnwWorkbenchVue.js";
import type {
  PnwBottomPanelTab,
  PnwViewBlockContributions,
} from "../types/PnwWorkbenchWeb.js";

export function pnwViewBlockComponentAvailability(
  contributions: PnwViewBlockComponentContributions,
  defaultBottom?: PnwBottomViewBlockComponentContribution,
): PnwViewBlockContributions {
  return {
    primary: Boolean(contributions.primary),
    bottom: Boolean(defaultBottom || contributions.bottom),
    secondary: Boolean(contributions.secondary),
  };
}

/**
 * 当前 View 的 Bottom 优先；缺失时自动回退到工作台实例的默认 Bottom。
 *
 * 默认层是应用级能力，不是模块级 singleton。consumer 应为每个 Shell 实例
 * 显式传入，Wing 不持有日志、问题或业务状态。
 */
export function pnwResolveBottomViewBlockComponent(
  contribution?: PnwBottomViewBlockComponentContribution,
  defaultContribution?: PnwBottomViewBlockComponentContribution,
): PnwBottomViewBlockComponentContribution | undefined {
  return contribution ?? defaultContribution;
}

export function pnwResolveViewBlockComponentProps(
  contribution?: PnwViewBlockComponentContribution,
): Readonly<Record<string, unknown>> {
  return contribution?.props ? toValue(contribution.props) : {};
}

export function pnwResolveBottomViewBlockTabs(
  contribution?: PnwBottomViewBlockComponentContribution,
  defaultContribution?: PnwBottomViewBlockComponentContribution,
  fallbackTabs: readonly PnwBottomPanelTab[] = [],
): readonly PnwBottomPanelTab[] {
  if (contribution?.tabs) return toValue(contribution.tabs);
  if (defaultContribution?.tabs) return toValue(defaultContribution.tabs);
  return fallbackTabs;
}
