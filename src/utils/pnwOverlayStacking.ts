/** Wing 工作台与宿主叠层共享的稳定层级名称。 */
export type PnwWorkbenchOverlayLayer =
  | "content"
  | "chrome"
  | "floatingPanel"
  | "hostTools"
  | "modal";

/**
 * 工作台默认叠层值。
 *
 * Host 的 dropdown / popover 应使用 `hostTools`，业务模态框使用 `modal`；
 * 具体组件仍可通过公开 CSS token 覆盖，不需要复制 Wing 内部样式。
 */
export const PNW_WORKBENCH_OVERLAY_LAYERS = Object.freeze({
  content: 0,
  chrome: 100,
  floatingPanel: 1200,
  hostTools: 1400,
  modal: 2000,
} as const satisfies Readonly<Record<PnwWorkbenchOverlayLayer, number>>);

export function pnwResolveWorkbenchOverlayZIndex(
  layer: PnwWorkbenchOverlayLayer,
  explicit?: number,
): number {
  return Number.isFinite(explicit) ? Number(explicit) : PNW_WORKBENCH_OVERLAY_LAYERS[layer];
}
