export interface PnwFloatingPanelPosition {
  readonly x: number;
  readonly y: number;
}

export interface PnwFloatingPanelSize {
  readonly width: number;
  readonly height: number;
}

function pnwFiniteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/**
 * 将浮动面板修正到 viewport 的可见区域。
 *
 * 面板能够放入时保证完整可见；面板比 viewport 大时保留左上标题栏，
 * 让用户仍可拖动或关闭。该函数无 DOM 依赖，可用于恢复位置和 resize 单测。
 */
export function pnwClampFloatingPanelPosition(
  position: PnwFloatingPanelPosition,
  panelSize: PnwFloatingPanelSize,
  viewportSize: PnwFloatingPanelSize,
  margin = 8,
): PnwFloatingPanelPosition {
  const safeMargin = pnwFiniteNonNegative(margin);
  const panelWidth = pnwFiniteNonNegative(panelSize.width);
  const panelHeight = pnwFiniteNonNegative(panelSize.height);
  const viewportWidth = pnwFiniteNonNegative(viewportSize.width);
  const viewportHeight = pnwFiniteNonNegative(viewportSize.height);
  const x = Number.isFinite(position.x) ? position.x : safeMargin;
  const y = Number.isFinite(position.y) ? position.y : safeMargin;

  const minX = Math.min(safeMargin, Math.max(0, viewportWidth - safeMargin));
  const minY = Math.min(safeMargin, Math.max(0, viewportHeight - safeMargin));
  const maxX = panelWidth + safeMargin * 2 <= viewportWidth
    ? viewportWidth - panelWidth - safeMargin
    : minX;
  const maxY = panelHeight + safeMargin * 2 <= viewportHeight
    ? viewportHeight - panelHeight - safeMargin
    : minY;

  return {
    x: Math.min(Math.max(x, minX), Math.max(minX, maxX)),
    y: Math.min(Math.max(y, minY), Math.max(minY, maxY)),
  };
}
