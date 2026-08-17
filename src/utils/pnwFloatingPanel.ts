export interface PnwFloatingPanelPosition {
  readonly x: number;
  readonly y: number;
}

export interface PnwFloatingPanelSize {
  readonly width: number;
  readonly height: number;
}

export interface PnwFloatingPanelBounds {
  readonly position: PnwFloatingPanelPosition;
  readonly size: PnwFloatingPanelSize;
}

export interface PnwFloatingPanelSizeConstraints {
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly maxWidth?: number;
  readonly maxHeight?: number;
}

export type PnwFloatingPanelResizeDirection =
  | "north"
  | "north-east"
  | "east"
  | "south-east"
  | "south"
  | "south-west"
  | "west"
  | "north-west";

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

function pnwPositiveOr(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

/** 将受控尺寸和位置一并限制在可见 viewport 内。 */
export function pnwClampFloatingPanelBounds(
  bounds: PnwFloatingPanelBounds,
  viewportSize: PnwFloatingPanelSize,
  constraints: PnwFloatingPanelSizeConstraints = {},
  margin = 8,
  insets: Partial<PnwFloatingPanelInsets> = {},
): PnwFloatingPanelBounds {
  const normalizedInsets = pnwNormalizeFloatingPanelInsets(insets);
  const safeMargin = pnwFiniteNonNegative(margin);
  const viewportWidth = pnwFiniteNonNegative(viewportSize.width);
  const viewportHeight = pnwFiniteNonNegative(viewportSize.height);
  const availableWidth = Math.max(
    1,
    viewportWidth - normalizedInsets.left - normalizedInsets.right - safeMargin * 2,
  );
  const availableHeight = Math.max(
    1,
    viewportHeight - normalizedInsets.top - normalizedInsets.bottom - safeMargin * 2,
  );
  const minWidth = Math.min(
    availableWidth,
    pnwPositiveOr(constraints.minWidth, Math.min(320, availableWidth)),
  );
  const minHeight = Math.min(
    availableHeight,
    pnwPositiveOr(constraints.minHeight, Math.min(180, availableHeight)),
  );
  const maxWidth = Math.max(
    minWidth,
    Math.min(availableWidth, pnwPositiveOr(constraints.maxWidth, availableWidth)),
  );
  const maxHeight = Math.max(
    minHeight,
    Math.min(availableHeight, pnwPositiveOr(constraints.maxHeight, availableHeight)),
  );
  const width = Math.min(
    maxWidth,
    Math.max(minWidth, pnwPositiveOr(bounds.size.width, minWidth)),
  );
  const height = Math.min(
    maxHeight,
    Math.max(minHeight, pnwPositiveOr(bounds.size.height, minHeight)),
  );
  const size = { width, height };
  return {
    size,
    position: pnwClampFloatingPanelPosition(
      bounds.position,
      size,
      viewportSize,
      safeMargin,
      normalizedInsets,
    ),
  };
}

/**
 * 从指定边/角按 pointer 或键盘增量调整 bounds；左/上边缩放会同步移动位置。
 */
export function pnwResizeFloatingPanelBounds(
  start: PnwFloatingPanelBounds,
  delta: PnwFloatingPanelPosition,
  direction: PnwFloatingPanelResizeDirection,
  viewportSize: PnwFloatingPanelSize,
  constraints: PnwFloatingPanelSizeConstraints = {},
  margin = 8,
  insets: Partial<PnwFloatingPanelInsets> = {},
): PnwFloatingPanelBounds {
  const normalized = pnwClampFloatingPanelBounds(
    start,
    viewportSize,
    constraints,
    margin,
    insets,
  );
  const normalizedInsets = pnwNormalizeFloatingPanelInsets(insets);
  const safeMargin = pnwFiniteNonNegative(margin);
  const minLeft = normalizedInsets.left + safeMargin;
  const minTop = normalizedInsets.top + safeMargin;
  const maxRight = Math.max(minLeft + 1, viewportSize.width - normalizedInsets.right - safeMargin);
  const maxBottom = Math.max(minTop + 1, viewportSize.height - normalizedInsets.bottom - safeMargin);
  const availableWidth = maxRight - minLeft;
  const availableHeight = maxBottom - minTop;
  const minWidth = Math.min(
    availableWidth,
    pnwPositiveOr(constraints.minWidth, Math.min(320, availableWidth)),
  );
  const minHeight = Math.min(
    availableHeight,
    pnwPositiveOr(constraints.minHeight, Math.min(180, availableHeight)),
  );
  const maxWidth = Math.max(
    minWidth,
    Math.min(availableWidth, pnwPositiveOr(constraints.maxWidth, availableWidth)),
  );
  const maxHeight = Math.max(
    minHeight,
    Math.min(availableHeight, pnwPositiveOr(constraints.maxHeight, availableHeight)),
  );
  const dx = Number.isFinite(delta.x) ? delta.x : 0;
  const dy = Number.isFinite(delta.y) ? delta.y : 0;
  let left = normalized.position.x;
  let top = normalized.position.y;
  let right = left + normalized.size.width;
  let bottom = top + normalized.size.height;

  if (direction.includes("west")) {
    left = Math.min(right - minWidth, Math.max(right - maxWidth, left + dx));
    left = Math.max(minLeft, left);
  } else if (direction.includes("east")) {
    right = Math.max(left + minWidth, Math.min(left + maxWidth, right + dx));
    right = Math.min(maxRight, right);
  }
  if (direction.includes("north")) {
    top = Math.min(bottom - minHeight, Math.max(bottom - maxHeight, top + dy));
    top = Math.max(minTop, top);
  } else if (direction.includes("south")) {
    bottom = Math.max(top + minHeight, Math.min(top + maxHeight, bottom + dy));
    bottom = Math.min(maxBottom, bottom);
  }

  return {
    position: { x: left, y: top },
    size: { width: right - left, height: bottom - top },
  };
}
