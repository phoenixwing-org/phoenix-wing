import type {
  PnwWorkspaceEntryPolicy,
  PnwWorkspaceGateMode,
  PnwWorkspaceGateResolution,
  PnwWorkspaceState,
} from "../types/PnwWorkspace.js";

export interface PnwResolveWorkspaceGateOptions {
  readonly state: Pick<PnwWorkspaceState, "current">;
  readonly policy?: PnwWorkspaceEntryPolicy;
  readonly requestedMode?: PnwWorkspaceGateMode;
}

/**
 * 解析 Workspace Welcome 与 Workbench 的有效呈现。
 *
 * 这是纯函数，不拥有 Router、Workspace controller 或偏好持久化。
 */
export function pnwResolveWorkspaceGate(
  options: PnwResolveWorkspaceGateOptions,
): PnwWorkspaceGateResolution {
  const policy = options.policy ?? "required";
  const requestedMode = options.requestedMode ?? "welcome";
  const hasWorkspace = Boolean(options.state.current);
  const canEnterWorkbench = hasWorkspace || policy === "optional";
  const forcedWelcome = requestedMode === "workbench" && !canEnterWorkbench;

  return {
    mode: forcedWelcome ? "welcome" : requestedMode,
    requestedMode,
    policy,
    hasWorkspace,
    canEnterWorkbench,
    canReturnToWorkbench: hasWorkspace,
    forcedWelcome,
  };
}
