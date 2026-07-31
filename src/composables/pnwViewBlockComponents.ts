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
): PnwViewBlockContributions {
  return {
    primary: Boolean(contributions.primary),
    bottom: Boolean(contributions.bottom),
    secondary: Boolean(contributions.secondary),
  };
}

export function pnwResolveViewBlockComponentProps(
  contribution?: PnwViewBlockComponentContribution,
): Readonly<Record<string, unknown>> {
  return contribution?.props ? toValue(contribution.props) : {};
}

export function pnwResolveBottomViewBlockTabs(
  contribution?: PnwBottomViewBlockComponentContribution,
): readonly PnwBottomPanelTab[] {
  return contribution?.tabs ? toValue(contribution.tabs) : [];
}
