import type { PnwPresentationFrameDefinition } from "../types/PnwPresentationFrame.js";
import type { PnwViewPresentationRecord } from "../types/PnwViewPresentation.js";
import type {
  PnwFloatingPanelBounds,
  PnwFloatingPanelSize,
  PnwFloatingPanelSizeConstraints,
} from "./pnwFloatingPanel.js";
import { pnwResolvePresentationFrameDefinition } from "./pnwPresentationFrame.js";
import { pnwReduceViewPresentationRecord } from "./pnwViewPresentation.js";

export type PnwFloatingViewArrangementMode = "tile" | "cascade";

/** 参与排列的业务无关浮窗；输入顺序就是确定的窗口顺序。 */
export interface PnwFloatingViewArrangementTarget {
  readonly id: string;
  readonly preferredSize?: Partial<PnwFloatingPanelSize>;
  readonly constraints?: PnwFloatingPanelSizeConstraints;
}

export interface PnwFloatingViewArrangementOptions {
  readonly mode: PnwFloatingViewArrangementMode;
  /** fixed-position 坐标系中的可用区域，例如 Workbench Header/Ribbon 下方区域。 */
  readonly area: PnwFloatingPanelBounds;
  readonly targets: readonly PnwFloatingViewArrangementTarget[];
  /** 区域边缘和窗口之间的统一间距；默认 8px。 */
  readonly gap?: number;
  /** 层叠窗口的最大错位；默认 32px。 */
  readonly cascadeOffset?: number;
  /** 层叠时至少保留的可见窗口范围；默认 160x140。 */
  readonly cascadeMinimumVisibleSize?: Partial<PnwFloatingPanelSize>;
}

export interface PnwFloatingViewArrangementItem {
  readonly id: string;
  readonly order: number;
  readonly bounds: PnwFloatingPanelBounds;
  /** 窄区域压缩时交给 PnwFloatingPanel 的临时最小尺寸。 */
  readonly effectiveMinSize: PnwFloatingPanelSize;
  readonly compressedBelowMinimum: boolean;
}

/** 完整 View record 与 frame 的排列输入；不包含 DOM、renderer 或业务页面信息。 */
export interface PnwViewPresentationArrangementTarget {
  readonly record: PnwViewPresentationRecord;
  readonly frame?: PnwPresentationFrameDefinition;
}

export interface PnwViewPresentationArrangementOptions
  extends Omit<PnwFloatingViewArrangementOptions, "targets"> {
  readonly targets: readonly PnwViewPresentationArrangementTarget[];
}

export interface PnwViewPresentationArrangementItem
  extends PnwFloatingViewArrangementItem {
  readonly viewInstanceId: string;
  /** 仅更新 dialogPosition/dialogSize；identity、mode 与 revision 保持不变。 */
  readonly record: PnwViewPresentationRecord;
  /** 含窄区临时 minSize，可直接传给 PnwViewPresentationPortal.frame。 */
  readonly frame: PnwPresentationFrameDefinition;
}

function pnwFinite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function pnwPositive(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function pnwNonNegative(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : fallback;
}

function pnwNormalizeArea(area: PnwFloatingPanelBounds): PnwFloatingPanelBounds {
  return {
    position: {
      x: pnwFinite(area.position.x, 0),
      y: pnwFinite(area.position.y, 0),
    },
    size: {
      width: pnwPositive(area.size.width, 1),
      height: pnwPositive(area.size.height, 1),
    },
  };
}

function pnwValidateTargets(targets: readonly PnwFloatingViewArrangementTarget[]): void {
  const ids = new Set<string>();
  for (const target of targets) {
    if (!target.id.trim()) throw new TypeError("floating View arrangement id must not be empty");
    if (ids.has(target.id)) {
      throw new TypeError(`duplicate floating View arrangement id: ${target.id}`);
    }
    ids.add(target.id);
  }
}

function pnwConstraintMinimum(
  target: PnwFloatingViewArrangementTarget,
): PnwFloatingPanelSize {
  return {
    width: pnwPositive(target.constraints?.minWidth, 1),
    height: pnwPositive(target.constraints?.minHeight, 1),
  };
}

function pnwConstrainArrangementSize(
  target: PnwFloatingViewArrangementTarget,
  available: PnwFloatingPanelSize,
  preferred = available,
): {
  readonly size: PnwFloatingPanelSize;
  readonly effectiveMinSize: PnwFloatingPanelSize;
  readonly compressedBelowMinimum: boolean;
} {
  const minimum = pnwConstraintMinimum(target);
  const maximum = {
    width: pnwPositive(target.constraints?.maxWidth, available.width),
    height: pnwPositive(target.constraints?.maxHeight, available.height),
  };
  const size = {
    width: Math.min(available.width, maximum.width, pnwPositive(preferred.width, available.width)),
    height: Math.min(available.height, maximum.height, pnwPositive(preferred.height, available.height)),
  };
  return {
    size,
    effectiveMinSize: {
      width: Math.min(minimum.width, size.width),
      height: Math.min(minimum.height, size.height),
    },
    compressedBelowMinimum: size.width < minimum.width || size.height < minimum.height,
  };
}

function pnwArrangementContentArea(
  area: PnwFloatingPanelBounds,
  requestedGap: number,
): PnwFloatingPanelBounds {
  const horizontalMargin = area.size.width > requestedGap * 2 ? requestedGap : 0;
  const verticalMargin = area.size.height > requestedGap * 2 ? requestedGap : 0;
  return {
    position: {
      x: area.position.x + horizontalMargin,
      y: area.position.y + verticalMargin,
    },
    size: {
      width: area.size.width - horizontalMargin * 2,
      height: area.size.height - verticalMargin * 2,
    },
  };
}

function pnwTileFloatingViews(
  targets: readonly PnwFloatingViewArrangementTarget[],
  area: PnwFloatingPanelBounds,
  gap: number,
): readonly PnwFloatingViewArrangementItem[] {
  const count = targets.length;
  const requiredColumnWidth = Math.max(...targets.map((target) => (
    pnwConstraintMinimum(target).width
  )));
  const columnsByMinimum = Math.max(
    1,
    Math.floor((area.size.width + gap) / (requiredColumnWidth + gap)),
  );
  const aspectColumns = Math.max(
    1,
    Math.ceil(Math.sqrt(count * area.size.width / area.size.height)),
  );
  const columns = Math.min(count, columnsByMinimum, aspectColumns);
  const rows = Math.ceil(count / columns);
  const rowGap = rows <= 1
    ? 0
    : Math.min(gap, Math.max(0, (area.size.height - rows) / (rows - 1)));
  const rowHeight = (area.size.height - rowGap * (rows - 1)) / rows;

  return targets.map((target, index) => {
    const row = Math.floor(index / columns);
    const rowStart = row * columns;
    const rowCount = Math.min(columns, count - rowStart);
    const columnGap = rowCount <= 1
      ? 0
      : Math.min(gap, Math.max(0, (area.size.width - rowCount) / (rowCount - 1)));
    const cellWidth = (area.size.width - columnGap * (rowCount - 1)) / rowCount;
    const constrained = pnwConstrainArrangementSize(
      target,
      { width: cellWidth, height: rowHeight },
    );
    const column = index - rowStart;
    const cellX = area.position.x + column * (cellWidth + columnGap);
    const cellY = area.position.y + row * (rowHeight + rowGap);
    return {
      id: target.id,
      order: index,
      bounds: {
        position: {
          x: cellX + (cellWidth - constrained.size.width) / 2,
          y: cellY + (rowHeight - constrained.size.height) / 2,
        },
        size: constrained.size,
      },
      effectiveMinSize: constrained.effectiveMinSize,
      compressedBelowMinimum: constrained.compressedBelowMinimum,
    };
  });
}

function pnwCascadeFloatingViews(
  targets: readonly PnwFloatingViewArrangementTarget[],
  area: PnwFloatingPanelBounds,
  requestedOffset: number,
  minimumVisibleSize: PnwFloatingPanelSize,
): readonly PnwFloatingViewArrangementItem[] {
  const count = targets.length;
  const intervals = Math.max(1, count - 1);
  const offset = count <= 1
    ? 0
    : Math.max(0, Math.min(
      requestedOffset,
      (area.size.width - Math.min(area.size.width, minimumVisibleSize.width)) / intervals,
      (area.size.height - Math.min(area.size.height, minimumVisibleSize.height)) / intervals,
    ));
  const available = {
    width: area.size.width - offset * (count - 1),
    height: area.size.height - offset * (count - 1),
  };

  return targets.map((target, index) => {
    const constrained = pnwConstrainArrangementSize(
      target,
      available,
      {
        width: pnwPositive(target.preferredSize?.width, available.width),
        height: pnwPositive(target.preferredSize?.height, available.height),
      },
    );
    return {
      id: target.id,
      order: index,
      bounds: {
        position: {
          x: area.position.x + index * offset,
          y: area.position.y + index * offset,
        },
        size: constrained.size,
      },
      effectiveMinSize: constrained.effectiveMinSize,
      compressedBelowMinimum: constrained.compressedBelowMinimum,
    };
  });
}

/**
 * 计算调用方显式指定浮窗的平铺/层叠 bounds。
 *
 * 纯算法不创建、关闭、浮出、收回或聚焦窗口，也不读取 DOM；重复调用只会产生相同 bounds。
 * 当区域不足以容纳声明的最小尺寸时，优先保证全部窗口不重叠且留在可用区域，并通过
 * effectiveMinSize / compressedBelowMinimum 明确报告临时压缩结果。
 */
export function pnwArrangeFloatingViewBounds(
  options: PnwFloatingViewArrangementOptions,
): readonly PnwFloatingViewArrangementItem[] {
  pnwValidateTargets(options.targets);
  if (options.targets.length === 0) return [];
  const normalizedArea = pnwNormalizeArea(options.area);
  const gap = pnwNonNegative(options.gap, 8);
  const contentArea = pnwArrangementContentArea(normalizedArea, gap);
  if (options.mode === "tile") {
    return pnwTileFloatingViews(options.targets, contentArea, gap);
  }
  if (options.mode !== "cascade") {
    throw new TypeError(`unsupported floating View arrangement mode: ${String(options.mode)}`);
  }
  return pnwCascadeFloatingViews(
    options.targets,
    contentArea,
    pnwNonNegative(options.cascadeOffset, 32),
    {
      width: pnwPositive(options.cascadeMinimumVisibleSize?.width, 160),
      height: pnwPositive(options.cascadeMinimumVisibleSize?.height, 140),
    },
  );
}

/**
 * 将通用排列结果写入既有 View presentation records。
 * record identity/mode/revision 和 Portal key 不变，因此排列不会重建 View、iframe 或浮窗栈。
 */
export function pnwArrangeViewPresentationRecords(
  options: PnwViewPresentationArrangementOptions,
): readonly PnwViewPresentationArrangementItem[] {
  const resolvedTargets = options.targets.map((target) => {
    const frame = pnwResolvePresentationFrameDefinition(target.frame, "view");
    return {
      target,
      frame,
      geometry: {
        id: target.record.identity.viewInstanceId,
        preferredSize: frame.recommendedSize,
        constraints: {
          minWidth: frame.minSize.width,
          minHeight: frame.minSize.height,
          maxWidth: frame.maxSize?.width,
          maxHeight: frame.maxSize?.height,
        },
      } satisfies PnwFloatingViewArrangementTarget,
    };
  });
  const arranged = pnwArrangeFloatingViewBounds({
    ...options,
    targets: resolvedTargets.map(({ geometry }) => geometry),
  });

  return arranged.map((item, index) => {
    const input = resolvedTargets[index];
    const positioned = pnwReduceViewPresentationRecord(input.target.record, {
      type: "set-dialog-position",
      position: item.bounds.position,
    });
    const record = pnwReduceViewPresentationRecord(positioned, {
      type: "set-dialog-size",
      size: item.bounds.size,
    });
    return {
      ...item,
      viewInstanceId: item.id,
      record,
      frame: {
        ...input.target.frame,
        minSize: item.effectiveMinSize,
      },
    };
  });
}
