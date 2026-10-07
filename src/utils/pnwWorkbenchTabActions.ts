import type { PnwWorkbenchTabItem } from "../types/PnwWorkbenchWeb.js";

export type PnwWorkbenchTabAction = "refresh" | "close" | "close-others" | "close-right" | "close-all";
export interface PnwWorkbenchTabActionRequest {
  action: PnwWorkbenchTabAction;
  /** The right-clicked tab, not necessarily the active tab. */
  tabId: string;
}

/** Pure target selection. Hosts retain dirty/busy guards and all resource mutations. */
export function pnwWorkbenchTabActionTargets(
  tabs: readonly Pick<PnwWorkbenchTabItem, "id">[], request: PnwWorkbenchTabActionRequest,
): string[] {
  const index = tabs.findIndex(tab => tab.id === request.tabId);
  if (index < 0) return [];
  switch (request.action) {
    case "refresh": case "close": return [request.tabId];
    case "close-others": return tabs.filter(tab => tab.id !== request.tabId).map(tab => tab.id);
    case "close-right": return tabs.slice(index + 1).map(tab => tab.id);
    case "close-all": return tabs.map(tab => tab.id);
  }
}
