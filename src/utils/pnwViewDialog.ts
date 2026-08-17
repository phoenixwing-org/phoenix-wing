import type {
  PnwResolvedViewDialogRequest,
  PnwViewDialogCapabilities,
  PnwViewDialogCloseReason,
  PnwViewDialogController,
  PnwViewDialogControllerOptions,
  PnwViewDialogHostAdapter,
  PnwViewDialogOutcome,
  PnwViewDialogPresentation,
  PnwViewDialogRequest,
  PnwViewDialogSize,
} from "../types/PnwViewDialog.js";

export const PNW_DEFAULT_VIEW_DIALOG_SIZE: PnwViewDialogSize = Object.freeze({
  width: 720,
  height: 520,
  minWidth: 360,
  minHeight: 240,
});

function pnwPositiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function pnwOptionalPositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

/** 补齐尺寸与并行策略；稳定 ID 和标题由校验函数检查，不会被静默改写。 */
export function pnwNormalizeViewDialogRequest<TProps>(
  request: PnwViewDialogRequest<TProps>,
): PnwResolvedViewDialogRequest<TProps> {
  const sourceSize = request.size;
  const minWidth = pnwPositiveNumber(sourceSize?.minWidth, PNW_DEFAULT_VIEW_DIALOG_SIZE.minWidth);
  const minHeight = pnwPositiveNumber(sourceSize?.minHeight, PNW_DEFAULT_VIEW_DIALOG_SIZE.minHeight);
  const maxWidthSource = pnwOptionalPositiveNumber(sourceSize?.maxWidth);
  const maxHeightSource = pnwOptionalPositiveNumber(sourceSize?.maxHeight);
  const maxWidth = maxWidthSource === undefined ? undefined : Math.max(minWidth, maxWidthSource);
  const maxHeight = maxHeightSource === undefined ? undefined : Math.max(minHeight, maxHeightSource);
  const widthSource = Math.max(minWidth, pnwPositiveNumber(sourceSize?.width, PNW_DEFAULT_VIEW_DIALOG_SIZE.width));
  const heightSource = Math.max(minHeight, pnwPositiveNumber(sourceSize?.height, PNW_DEFAULT_VIEW_DIALOG_SIZE.height));
  const instancePolicy = request.instancePolicy === "parallel" ? "parallel" : "single";
  const maxInstances = instancePolicy === "single"
    ? 1
    : Math.max(1, Math.floor(pnwPositiveNumber(request.maxInstances, 2)));

  return {
    ...request,
    size: {
      width: maxWidth === undefined ? widthSource : Math.min(widthSource, maxWidth),
      height: maxHeight === undefined ? heightSource : Math.min(heightSource, maxHeight),
      minWidth,
      minHeight,
      ...(maxWidth === undefined ? {} : { maxWidth }),
      ...(maxHeight === undefined ? {} : { maxHeight }),
    },
    instancePolicy,
    maxInstances,
  };
}

export function pnwValidateViewDialogRequest(
  request: PnwViewDialogRequest<unknown>,
): readonly string[] {
  const issues: string[] = [];
  if (typeof request.requestId !== "string" || !request.requestId.trim()) {
    issues.push("requestId must not be empty");
  }
  if (typeof request.viewId !== "string" || !request.viewId.trim()) {
    issues.push("viewId must not be empty");
  }
  if (typeof request.title !== "string" || !request.title.trim()) {
    issues.push("title must not be empty");
  }
  return issues;
}

/**
 * 只有明确具备父子关系、父窗口保持可交互、可越过父窗口边界且请求带 parentId 时，
 * 才使用桌面非模态对话框；其余情况统一退化为应用内无蒙层浮窗。
 */
export function pnwResolveViewDialogPresentation(
  desktopCapabilities: PnwViewDialogCapabilities | undefined,
  parentId: string | undefined,
): PnwViewDialogPresentation {
  return desktopCapabilities?.presentation === "desktop-dialog"
    && desktopCapabilities.supportsParentRelationship
    && desktopCapabilities.keepsParentInteractive
    && desktopCapabilities.supportsOutsideParentBounds
    && Boolean(parentId?.trim())
    ? "desktop-dialog"
    : "web-floating";
}

interface PnwActiveViewDialog {
  readonly request: PnwResolvedViewDialogRequest<unknown>;
  readonly adapter: PnwViewDialogHostAdapter;
}

function pnwFailure(
  code: Extract<PnwViewDialogOutcome, { status: "failed" }>['code'],
  message: string,
): PnwViewDialogOutcome {
  return { status: "failed", code, message };
}

/**
 * 创建应用级 View 对话框控制器。控制器只仲裁呈现与实例数，不持有 View 业务状态。
 * 桌面 adapter 不可用或能力不完整时自动选择 webFloating。
 */
export function pnwCreateViewDialogController(
  options: PnwViewDialogControllerOptions,
): PnwViewDialogController {
  if (options.webFloating.capabilities.presentation !== "web-floating"
    || !options.webFloating.capabilities.keepsParentInteractive) {
    throw new TypeError("webFloating adapter must be a non-modal web-floating host");
  }
  const pnwActive = new Map<string, PnwActiveViewDialog>();

  return {
    async open<TProps, TResult = unknown>(
      input: PnwViewDialogRequest<TProps>,
    ): Promise<PnwViewDialogOutcome<TResult>> {
      const issues = pnwValidateViewDialogRequest(input as PnwViewDialogRequest<unknown>);
      if (issues.length > 0) {
        return pnwFailure("invalid-request", issues.join("; ")) as PnwViewDialogOutcome<TResult>;
      }
      if (pnwActive.has(input.requestId)) {
        return pnwFailure("already-open", `request ${input.requestId} is already open`) as PnwViewDialogOutcome<TResult>;
      }

      const request = pnwNormalizeViewDialogRequest(input);
      const presentation = pnwResolveViewDialogPresentation(
        options.desktopDialog?.capabilities,
        request.parentId,
      );
      const adapter = presentation === "desktop-dialog" && options.desktopDialog
        ? options.desktopDialog
        : options.webFloating;
      const sameViewCount = [...pnwActive.values()]
        .filter((active) => active.request.viewId === request.viewId)
        .length;
      const adapterLimitSource = adapter.capabilities.maxOpenDialogs;
      const adapterLimit = Number.isFinite(adapterLimitSource) && adapterLimitSource > 0
        ? Math.max(1, Math.floor(adapterLimitSource))
        : 1;
      const adapterActiveCount = [...pnwActive.values()]
        .filter((active) => active.adapter === adapter)
        .length;

      if (request.instancePolicy === "single" && sameViewCount > 0) {
        return pnwFailure("already-open", `view ${request.viewId} already has an active dialog`) as PnwViewDialogOutcome<TResult>;
      }
      if (sameViewCount >= request.maxInstances || adapterActiveCount >= adapterLimit) {
        return pnwFailure("instance-limit", "view dialog instance limit reached") as PnwViewDialogOutcome<TResult>;
      }

      const resolved = request as PnwResolvedViewDialogRequest<unknown>;
      pnwActive.set(request.requestId, { request: resolved, adapter });
      try {
        return await adapter.open(resolved) as PnwViewDialogOutcome<TResult>;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return pnwFailure("host-error", message) as PnwViewDialogOutcome<TResult>;
      } finally {
        pnwActive.delete(request.requestId);
      }
    },

    async close(
      requestId: string,
      reason: PnwViewDialogCloseReason = "programmatic",
    ): Promise<void> {
      const active = pnwActive.get(requestId);
      if (!active) return;
      await active.adapter.close(requestId, reason);
    },

    activeRequests(): readonly PnwResolvedViewDialogRequest<unknown>[] {
      return [...pnwActive.values()].map((active) => active.request);
    },
  };
}
