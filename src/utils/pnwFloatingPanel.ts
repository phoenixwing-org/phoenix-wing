export interface PnwFloatingPanelPosition {
  readonly x: number;
  readonly y: number;
}

export interface PnwFloatingPanelSize {
  readonly width: number;
  readonly height: number;
}

/** 浮动面板在 viewport 内需要避让的 Host chrome 安全区域。 */
export interface PnwFloatingPanelInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

function pnwFiniteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** 将缺失、负数或非有限安全边距归一化为可直接计算的完整值。 */
export function pnwNormalizeFloatingPanelInsets(
  insets: Partial<PnwFloatingPanelInsets> = {},
): PnwFloatingPanelInsets {
  return {
    top: pnwFiniteNonNegative(insets.top ?? 0),
    right: pnwFiniteNonNegative(insets.right ?? 0),
    bottom: pnwFiniteNonNegative(insets.bottom ?? 0),
    left: pnwFiniteNonNegative(insets.left ?? 0),
  };
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
  insets: Partial<PnwFloatingPanelInsets> = {},
): PnwFloatingPanelPosition {
  const safeMargin = pnwFiniteNonNegative(margin);
  const normalizedInsets = pnwNormalizeFloatingPanelInsets(insets);
  const panelWidth = pnwFiniteNonNegative(panelSize.width);
  const panelHeight = pnwFiniteNonNegative(panelSize.height);
  const viewportWidth = pnwFiniteNonNegative(viewportSize.width);
  const viewportHeight = pnwFiniteNonNegative(viewportSize.height);
  const safeTop = Math.min(normalizedInsets.top, viewportHeight);
  const safeLeft = Math.min(normalizedInsets.left, viewportWidth);
  const safeRight = Math.min(normalizedInsets.right, Math.max(0, viewportWidth - safeLeft));
  const safeBottom = Math.min(normalizedInsets.bottom, Math.max(0, viewportHeight - safeTop));
  const x = Number.isFinite(position.x) ? position.x : safeLeft + safeMargin;
  const y = Number.isFinite(position.y) ? position.y : safeTop + safeMargin;

  const availableWidth = Math.max(0, viewportWidth - safeLeft - safeRight);
  const availableHeight = Math.max(0, viewportHeight - safeTop - safeBottom);
  const minX = Math.min(safeLeft + safeMargin, Math.max(0, viewportWidth - safeRight - safeMargin));
  const minY = Math.min(safeTop + safeMargin, Math.max(0, viewportHeight - safeBottom - safeMargin));
  const maxX = panelWidth + safeMargin * 2 <= availableWidth
    ? viewportWidth - safeRight - panelWidth - safeMargin
    : minX;
  const maxY = panelHeight + safeMargin * 2 <= availableHeight
    ? viewportHeight - safeBottom - panelHeight - safeMargin
    : minY;

  return {
    x: Math.min(Math.max(x, minX), Math.max(minX, maxX)),
    y: Math.min(Math.max(y, minY), Math.max(minY, maxY)),
  };
}
