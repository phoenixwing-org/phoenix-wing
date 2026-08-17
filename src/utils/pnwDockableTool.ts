import type {
  PnwDockableToolCommand,
  PnwDockableToolDefinition,
  PnwDockableToolState,
} from "../types/PnwDockableTool.js";

export const PNW_DEFAULT_DOCKABLE_TOOL_STATE: PnwDockableToolState = Object.freeze({
  mode: "closed",
  floatingPosition: Object.freeze({ x: 24, y: 64 }),
  floatingSize: Object.freeze({ width: 640, height: 480 }),
  primaryPlacement: "last",
  primaryExpanded: true,
});

/** 修正来自 Host 持久化层的不完整或损坏状态，不选择持久化介质。 */
export function pnwNormalizeDockableToolState(
  state?: Partial<PnwDockableToolState> | null,
): PnwDockableToolState {
  const mode = state?.mode === "floating" || state?.mode === "primary"
    ? state.mode
    : "closed";
  const x = state?.floatingPosition?.x;
  const y = state?.floatingPosition?.y;
  const width = state?.floatingSize?.width;
  const height = state?.floatingSize?.height;
  return {
    mode,
    floatingPosition: {
      x: Number.isFinite(x) ? x as number : PNW_DEFAULT_DOCKABLE_TOOL_STATE.floatingPosition.x,
      y: Number.isFinite(y) ? y as number : PNW_DEFAULT_DOCKABLE_TOOL_STATE.floatingPosition.y,
    },
    floatingSize: {
      width: typeof width === "number" && Number.isFinite(width) && width > 0
        ? width
        : PNW_DEFAULT_DOCKABLE_TOOL_STATE.floatingSize!.width,
      height: typeof height === "number" && Number.isFinite(height) && height > 0
        ? height
        : PNW_DEFAULT_DOCKABLE_TOOL_STATE.floatingSize!.height,
    },
    primaryPlacement: state?.primaryPlacement === "first" ? "first" : "last",
    primaryExpanded: typeof state?.primaryExpanded === "boolean"
      ? state.primaryExpanded
      : PNW_DEFAULT_DOCKABLE_TOOL_STATE.primaryExpanded,
  };
}

/**
 * 可停靠工具的纯状态转换。切换 floating/primary/closed 只改变 mode，
 * 因而不会丢失上次坐标、Primary 位置或折叠状态。
 */
export function pnwReduceDockableToolState(
  state: PnwDockableToolState,
  command: PnwDockableToolCommand,
): PnwDockableToolState {
  const current = pnwNormalizeDockableToolState(state);
  switch (command.type) {
    case "open-floating":
      return { ...current, mode: "floating" };
    case "dock-primary":
      return { ...current, mode: "primary" };
    case "close":
      return { ...current, mode: "closed" };
    case "set-floating-position":
      return pnwNormalizeDockableToolState({
        ...current,
        floatingPosition: command.position,
      });
    case "set-floating-size":
      return pnwNormalizeDockableToolState({
        ...current,
        floatingSize: command.size,
      });
    case "set-primary-placement":
      return { ...current, primaryPlacement: command.placement };
    case "set-primary-expanded":
      return { ...current, primaryExpanded: command.expanded };
  }
}

/**
 * 解析当前工具是否应呈现。view 工具离开 owner View 时仅返回 false，
 * 不触发任何状态转换；重新激活后原状态自然恢复。
 */
export function pnwIsDockableToolVisible(
  definition: PnwDockableToolDefinition,
  state: PnwDockableToolState,
  activeViewId?: string,
): boolean {
  if (state.mode === "closed") return false;
  return definition.scope !== "view" || definition.ownerViewId === activeViewId;
}
