import type {
  PnwPresentationFrameDefinition,
  PnwPresentationOwnerKind,
  PnwResolvedPresentationFrameDefinition,
} from "../types/PnwPresentationFrame.js";
import type { PnwFloatingPanelSize } from "./pnwFloatingPanel.js";
import type { PnwFloatingPanelBounds } from "./pnwFloatingPanel.js";

const PNW_PRESENTATION_RECOMMENDED_SIZES = Object.freeze({
  tool: Object.freeze({ width: 640, height: 480 }),
  view: Object.freeze({ width: 760, height: 560 }),
} as const satisfies Readonly<Record<PnwPresentationOwnerKind, PnwFloatingPanelSize>>);

const PNW_PRESENTATION_MINIMUM_SIZE = Object.freeze({ width: 360, height: 240 });

function pnwPositive(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function pnwOptionalSize(
  size: Partial<PnwFloatingPanelSize> | undefined,
): PnwFloatingPanelSize | undefined {
  if (size?.width === undefined && size?.height === undefined) return undefined;
  return {
    width: pnwPositive(size.width, Number.MAX_SAFE_INTEGER),
    height: pnwPositive(size.height, Number.MAX_SAFE_INTEGER),
  };
}

/** 解析 Tool/View 共用的 frame 声明；owner 生命周期仍由对应适配组件负责。 */
export function pnwResolvePresentationFrameDefinition(
  definition: PnwPresentationFrameDefinition | undefined,
  ownerKind: PnwPresentationOwnerKind,
): PnwResolvedPresentationFrameDefinition {
  if (definition?.ownerKind && definition.ownerKind !== ownerKind) {
    throw new TypeError(`presentation ownerKind ${definition.ownerKind} does not match ${ownerKind} host`);
  }
  const resolvedOwnerKind = ownerKind;
  const expectedCloseBehavior = resolvedOwnerKind === "view" ? "reattach" : "close";
  if (definition?.closeBehavior && definition.closeBehavior !== expectedCloseBehavior) {
    throw new TypeError(`presentation closeBehavior ${definition.closeBehavior} does not match ${resolvedOwnerKind} host`);
  }
  const defaults = PNW_PRESENTATION_RECOMMENDED_SIZES[resolvedOwnerKind];
  return {
    ownerKind: resolvedOwnerKind,
    movable: definition?.movable !== false,
    resizable: definition?.resizable ?? "both",
    recommendedSize: {
      width: pnwPositive(definition?.recommendedSize?.width, defaults.width),
      height: pnwPositive(definition?.recommendedSize?.height, defaults.height),
    },
    minSize: {
      width: pnwPositive(definition?.minSize?.width, PNW_PRESENTATION_MINIMUM_SIZE.width),
      height: pnwPositive(definition?.minSize?.height, PNW_PRESENTATION_MINIMUM_SIZE.height),
    },
    maxSize: pnwOptionalSize(definition?.maxSize),
    rememberBounds: definition?.rememberBounds !== false,
    closeBehavior: expectedCloseBehavior,
  };
}

/**
 * 生成 Host 可写入 Pinia/localStorage/后端的纯数据 bounds；关闭记忆时明确返回 undefined。
 * 输入应使用 PnwFloatingPanel 已经 viewport clamp 后发出的 bounds。
 */
export function pnwCreatePresentationBoundsSnapshot(
  bounds: PnwFloatingPanelBounds,
  definition: PnwPresentationFrameDefinition | undefined,
  ownerKind: PnwPresentationOwnerKind,
): PnwFloatingPanelBounds | undefined {
  if (!pnwResolvePresentationFrameDefinition(definition, ownerKind).rememberBounds) {
    return undefined;
  }
  return {
    position: { ...bounds.position },
    size: { ...bounds.size },
  };
}
