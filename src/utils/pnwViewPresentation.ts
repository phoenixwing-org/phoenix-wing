import type {
  PnwEditorViewAvailability,
  PnwOpenViewPresentationAction,
  PnwOpenViewPresentationInstance,
  PnwOpenViewPresentationRequest,
  PnwResolvedViewPresentationContribution,
  PnwViewPresentationContribution,
  PnwViewPresentationContributionContext,
  PnwViewPresentationCommand,
  PnwViewPresentationIdentity,
  PnwViewPresentationInitialState,
  PnwViewPresentationManagerCommand,
  PnwViewPresentationManagerState,
  PnwViewPresentationOwnerTabAction,
  PnwViewPresentationRecord,
  PnwViewPresentationTabPresentation,
} from "../types/PnwViewPresentation.js";
import type {
  PnwFloatingPanelPosition,
  PnwFloatingPanelSize,
} from "./pnwFloatingPanel.js";
import { pnwResolvePresentationFrameDefinition } from "./pnwPresentationFrame.js";

export const PNW_DEFAULT_VIEW_PRESENTATION_DIALOG_POSITION: PnwFloatingPanelPosition = Object.freeze({
  x: 24,
  y: 24,
});

export const PNW_DEFAULT_VIEW_PRESENTATION_DIALOG_SIZE: PnwFloatingPanelSize = Object.freeze({
  width: 760,
  height: 560,
});

function pnwFiniteCoordinate(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function pnwPositiveSize(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function pnwNonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

export function pnwValidateViewPresentationIdentity(
  identity: PnwViewPresentationIdentity,
): readonly string[] {
  const issues: string[] = [];
  for (const key of ["rendererId", "viewInstanceId", "ownerTabId", "instanceKey"] as const) {
    if (typeof identity[key] !== "string" || !identity[key].trim()) {
      issues.push(`${key} must not be empty`);
    }
  }
  return issues;
}

/** 创建只含可序列化数据的 View presentation 记录。 */
export function pnwCreateViewPresentationRecord(
  identity: PnwViewPresentationIdentity,
  initial: PnwViewPresentationInitialState = {},
): PnwViewPresentationRecord {
  const issues = pnwValidateViewPresentationIdentity(identity);
  if (issues.length > 0) throw new TypeError(issues.join("; "));
  const frame = pnwResolvePresentationFrameDefinition(initial.frame, "view");
  return {
    identity: { ...identity },
    mode: initial.mode === "floating" ? "floating" : "embedded",
    dialogPosition: {
      x: pnwFiniteCoordinate(
        initial.dialogPosition?.x,
        PNW_DEFAULT_VIEW_PRESENTATION_DIALOG_POSITION.x,
      ),
      y: pnwFiniteCoordinate(
        initial.dialogPosition?.y,
        PNW_DEFAULT_VIEW_PRESENTATION_DIALOG_POSITION.y,
      ),
    },
    dialogSize: {
      width: pnwPositiveSize(
        initial.dialogSize?.width,
        frame.recommendedSize.width,
      ),
      height: pnwPositiveSize(
        initial.dialogSize?.height,
        frame.recommendedSize.height,
      ),
    },
    revision: pnwNonNegativeInteger(initial.revision),
  };
}

/**
 * 纯状态转换：opening 等目标就绪，reattaching 等 frame 回到 Editor。
 * 两个完成命令必须匹配当前 revision，防止陈旧异步回调推进新 lease。
 */
export function pnwReduceViewPresentationRecord(
  current: PnwViewPresentationRecord,
  command: PnwViewPresentationCommand,
): PnwViewPresentationRecord {
  switch (command.type) {
    case "detach":
      return current.mode === "embedded"
        ? { ...current, mode: "opening", revision: current.revision + 1 }
        : current;
    case "targets-ready":
      return current.mode === "opening" && command.revision === current.revision
        ? { ...current, mode: "floating" }
        : current;
    case "reattach":
      return current.mode === "opening" || current.mode === "floating"
        ? { ...current, mode: "reattaching", revision: current.revision + 1 }
        : current;
    case "frames-returned":
      return current.mode === "reattaching" && command.revision === current.revision
        ? { ...current, mode: "embedded" }
        : current;
    case "set-dialog-position": {
      const x = pnwFiniteCoordinate(command.position.x, current.dialogPosition.x);
      const y = pnwFiniteCoordinate(command.position.y, current.dialogPosition.y);
      if (x === current.dialogPosition.x && y === current.dialogPosition.y) return current;
      return { ...current, dialogPosition: { x, y } };
    }
    case "set-dialog-size": {
      const width = pnwPositiveSize(command.size.width, current.dialogSize.width);
      const height = pnwPositiveSize(command.size.height, current.dialogSize.height);
      if (width === current.dialogSize.width && height === current.dialogSize.height) return current;
      return { ...current, dialogSize: { width, height } };
    }
  }
}

export function pnwIsViewPresentationDetached(record: PnwViewPresentationRecord): boolean {
  return record.mode !== "embedded";
}

function pnwUniqueIds(ids: readonly string[]): readonly string[] {
  return [...new Set(ids.filter((id) => typeof id === "string" && id.trim()))];
}

function pnwPrependMru(ids: readonly string[], viewInstanceId: string): readonly string[] {
  return [viewInstanceId, ...ids.filter((id) => id !== viewInstanceId)];
}

/** 从既有 MRU 中选择仍处于 embedded 的下一个 View；无候选时返回 undefined/Home。 */
export function pnwResolveNextEmbeddedViewId(
  editorActivationHistory: readonly string[],
  embeddedViewIds: readonly string[],
  excludingViewInstanceId?: string,
): string | undefined {
  const available = new Set(pnwUniqueIds(embeddedViewIds));
  return pnwUniqueIds([...editorActivationHistory, ...embeddedViewIds])
    .find((id) => id !== excludingViewInstanceId && available.has(id));
}

/**
 * 从 Editor 激活历史选择最近的可显示 View。
 * floating/opening/reattaching/closing 与已关闭 View 均会被框架 selector 排除。
 */
export function pnwSelectMostRecentEmbeddedEditorView(
  editorActivationHistory: readonly string[],
  views: readonly PnwEditorViewAvailability[],
  excludingViewInstanceId?: string,
): string | undefined {
  const embeddedViewIds = views
    .filter((view) => view.open && view.presentationMode === "embedded")
    .map((view) => view.viewInstanceId);
  return pnwResolveNextEmbeddedViewId(
    editorActivationHistory,
    embeddedViewIds,
    excludingViewInstanceId,
  );
}

export function pnwCreateViewPresentationManagerState(
  activeEditorViewId?: string,
  editorActivationHistory: readonly string[] = activeEditorViewId ? [activeEditorViewId] : [],
): PnwViewPresentationManagerState {
  return {
    activeEditorViewId,
    activeFloatingViewId: undefined,
    editorActivationHistory: pnwUniqueIds(editorActivationHistory),
  };
}

/** MDI 导航的纯状态转换；不删除 owner Tab，也不执行 Router 或 DOM 副作用。 */
export function pnwReduceViewPresentationManagerState(
  state: PnwViewPresentationManagerState,
  command: PnwViewPresentationManagerCommand,
): PnwViewPresentationManagerState {
  switch (command.type) {
    case "activate-editor":
      return {
        ...state,
        activeEditorViewId: command.viewInstanceId,
        editorActivationHistory: pnwPrependMru(
          state.editorActivationHistory,
          command.viewInstanceId,
        ),
      };
    case "activate-floating":
      return { ...state, activeFloatingViewId: command.viewInstanceId };
    case "detach":
      return {
        activeEditorViewId: state.activeEditorViewId === command.viewInstanceId
          ? pnwSelectMostRecentEmbeddedEditorView(
            state.editorActivationHistory,
            command.views,
            command.viewInstanceId,
          )
          : state.activeEditorViewId,
        activeFloatingViewId: command.viewInstanceId,
        editorActivationHistory: state.editorActivationHistory.filter(
          (id) => id !== command.viewInstanceId,
        ),
      };
    case "reattach":
      return {
        activeEditorViewId: command.viewInstanceId,
        activeFloatingViewId: state.activeFloatingViewId === command.viewInstanceId
          ? undefined
          : state.activeFloatingViewId,
        editorActivationHistory: pnwPrependMru(
          state.editorActivationHistory,
          command.viewInstanceId,
        ),
      };
    case "close": {
      const remainingHistory = state.editorActivationHistory.filter(
        (id) => id !== command.viewInstanceId,
      );
      return {
        activeEditorViewId: state.activeEditorViewId === command.viewInstanceId
          ? pnwSelectMostRecentEmbeddedEditorView(
            remainingHistory,
            command.views,
            command.viewInstanceId,
          )
          : state.activeEditorViewId,
        activeFloatingViewId: state.activeFloatingViewId === command.viewInstanceId
          ? undefined
          : state.activeFloatingViewId,
        editorActivationHistory: remainingHistory,
      };
    }
  }
}

export function pnwShouldProjectViewPresentationOwnerTab(
  record: PnwViewPresentationRecord,
  policy: PnwViewPresentationTabPresentation = "hide-when-floating",
): boolean {
  return policy === "keep" || record.mode === "embedded";
}

/** 点击 owner Tab 时，floating 只聚焦窗口，不能替换当前 Editor 背景 View。 */
export function pnwResolveViewPresentationOwnerTabAction(
  record: PnwViewPresentationRecord,
): PnwViewPresentationOwnerTabAction {
  return record.mode === "embedded"
    ? { type: "activate-editor", viewInstanceId: record.identity.viewInstanceId }
    : { type: "focus-floating", viewInstanceId: record.identity.viewInstanceId };
}

/** 即使 keep owner Tab，floating Tab 也不能显示成当前 Editor active。 */
export function pnwIsViewPresentationOwnerTabEditorActive(
  record: PnwViewPresentationRecord,
  manager: PnwViewPresentationManagerState,
): boolean {
  return record.mode === "embedded"
    && manager.activeEditorViewId === record.identity.viewInstanceId;
}

/**
 * 普通稳定 owner View 默认可浮出；Home、无稳定 owner、平台不支持或显式 false 自动禁用。
 */
export function pnwResolveViewPresentationContribution(
  contribution: PnwViewPresentationContribution | undefined,
  context: PnwViewPresentationContributionContext,
): PnwResolvedViewPresentationContribution {
  const detachable = context.hasStableOwner
    && context.isHome !== true
    && context.supportsFloating !== false
    && contribution?.detachable !== false;
  return {
    detachable,
    tabPresentation: contribution?.tabPresentation ?? "hide-when-floating",
    frame: pnwResolvePresentationFrameDefinition(contribution?.frame, "view"),
  };
}

/**
 * 解析通用 openView 命令：默认单实例重复打开只聚焦/激活；floating 不可用时降级 embedded。
 */
export function pnwResolveOpenViewPresentationAction(
  request: PnwOpenViewPresentationRequest,
  contribution: PnwResolvedViewPresentationContribution,
  instances: readonly PnwOpenViewPresentationInstance[],
): PnwOpenViewPresentationAction {
  const viewId = request.viewId.trim();
  if (!viewId) throw new TypeError("viewId must not be empty");
  const instanceKey = request.instanceKey?.trim() || undefined;
  if (request.allowParallel && !instanceKey) {
    throw new TypeError("parallel View requires instanceKey");
  }
  const existing = instances.find((instance) => (
    instance.viewId === viewId
    && (request.allowParallel ? instance.instanceKey === instanceKey : true)
    && instance.mode !== "closing"
  ));
  if (existing) {
    return existing.mode === "embedded"
      ? { type: "activate-existing", viewInstanceId: existing.viewInstanceId }
      : { type: "focus-existing", viewInstanceId: existing.viewInstanceId };
  }
  return {
    type: "create",
    viewId,
    ...(instanceKey ? { instanceKey } : {}),
    presentation: request.preferredPresentation === "floating" && contribution.detachable
      ? "floating"
      : "embedded",
  };
}
