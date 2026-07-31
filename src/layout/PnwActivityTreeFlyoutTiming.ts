export const PNW_ACTIVITY_TREE_FLYOUT_INITIAL_OPEN_DELAY_MS = 280;
export const PNW_ACTIVITY_TREE_FLYOUT_SWITCH_DELAY_MS = 120;
export const PNW_ACTIVITY_TREE_FLYOUT_CLOSE_DELAY_MS = 280;

/**
 * 返回精细指针进入一级分组后的内部打开延时。
 *
 * 首次打开过滤无意路过；已有浮层时缩短跨分组切换时间。同一分组已经
 * 打开时不再调度。该策略由 Wing 统一，不作为 consumer 偏好持久化。
 */
export function pnwResolveActivityTreeFlyoutOpenDelay(
  openRootId: string,
  nextRootId: string,
): number | null {
  if (!nextRootId || openRootId === nextRootId) return null;
  return openRootId
    ? PNW_ACTIVITY_TREE_FLYOUT_SWITCH_DELAY_MS
    : PNW_ACTIVITY_TREE_FLYOUT_INITIAL_OPEN_DELAY_MS;
}

/** 触摸只使用 click；鼠标与支持悬停的笔可使用内部 hover 时序。 */
export function pnwCanHoverActivityTreeFlyout(pointerType: string): boolean {
  return pointerType === "mouse" || pointerType === "pen";
}
