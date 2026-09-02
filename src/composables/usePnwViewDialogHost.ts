import {
  inject,
  provide,
  type InjectionKey,
} from "vue";
import type {
  PnwResolvedViewDialogHostRequest,
  PnwViewDialogHostController,
  PnwViewDialogHostControllerOptions,
  PnwViewDialogHostEntry,
  PnwViewDialogHostListener,
  PnwViewDialogHostRequest,
  PnwViewDialogRendererDefinition,
} from "../types/PnwViewDialogHost.js";
import type {
  PnwViewDialogCloseReason,
  PnwViewDialogHostAdapter,
  PnwViewDialogOutcome,
} from "../types/PnwViewDialog.js";
import {
  pnwCreateViewDialogController,
  pnwValidateViewDialogRequest,
} from "../utils/pnwViewDialog.js";

const PNW_VIEW_DIALOG_HOST_INJECTION_KEY: InjectionKey<PnwViewDialogHostController> = Symbol(
  "pnwViewDialogHost",
);

interface PnwPendingHostRequest {
  readonly request: PnwViewDialogHostRequest<unknown>;
}

interface PnwSettledHostEntry extends PnwViewDialogHostEntry {
  readonly identity: string;
  readonly settle: (outcome: PnwViewDialogOutcome<unknown>) => void;
}

function pnwPositiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.max(1, Math.floor(value))
    : fallback;
}

/** JSON/IPC 安全值点检；renderer、函数、DOM、循环引用不会进入 request.props。 */
export function pnwIsSerializableViewDialogValue(value: unknown): boolean {
  const visiting = new Set<object>();
  const visit = (candidate: unknown): boolean => {
    if (candidate === null) return true;
    if (typeof candidate === "string" || typeof candidate === "boolean") return true;
    if (typeof candidate === "number") return Number.isFinite(candidate);
    if (typeof candidate !== "object") return false;
    if (visiting.has(candidate)) return false;
    visiting.add(candidate);
    try {
      if (Array.isArray(candidate)) return candidate.every(visit);
      const prototype = Object.getPrototypeOf(candidate);
      if (prototype !== Object.prototype && prototype !== null) return false;
      return Object.entries(candidate).every(([key, item]) => key.length > 0 && visit(item));
    } catch {
      return false;
    } finally {
      visiting.delete(candidate);
    }
  };
  return visit(value);
}

/** owner View、renderer 与显式 instanceKey 共同形成稳定单例身份。 */
export function pnwCreateViewDialogHostIdentity(
  request: Pick<PnwViewDialogHostRequest<unknown>, "viewId" | "rendererId" | "instanceKey">,
): string {
  return [request.viewId.trim(), request.rendererId.trim(), request.instanceKey?.trim() ?? ""]
    .join("\u0000");
}

/**
 * 创建一个 Vue renderer 内唯一的 View Dialog Host controller。
 * 它复用低层 pnwCreateViewDialogController 做实例仲裁，并内置 Web Floating adapter。
 */
export function pnwCreateViewDialogHost(
  options: PnwViewDialogHostControllerOptions = {},
): PnwViewDialogHostController {
  const pnwRenderers = new Map<string, PnwViewDialogRendererDefinition>();
  const pnwPreparing = new Map<string, PnwPendingHostRequest>();
  const pnwActive = new Map<string, PnwSettledHostEntry>();
  const pnwOutcomeByIdentity = new Map<string, Promise<PnwViewDialogOutcome<unknown>>>();
  const pnwListeners = new Set<PnwViewDialogHostListener>();
  const pnwMaxOpenDialogs = pnwPositiveInteger(options.maxOpenDialogs, 6);
  const pnwDefaultPosition = {
    x: Number.isFinite(options.defaultPosition?.x) ? Number(options.defaultPosition?.x) : 48,
    y: Number.isFinite(options.defaultPosition?.y) ? Number(options.defaultPosition?.y) : 72,
  };
  const pnwPositionStep = pnwPositiveInteger(options.positionStep, 24);

  function pnwSnapshot(): readonly PnwViewDialogHostEntry[] {
    return [...pnwActive.values()].map(({ request, bounds, focusRevision }) => ({
      request,
      bounds,
      focusRevision,
    }));
  }

  function pnwNotify(): void {
    const snapshot = pnwSnapshot();
    for (const listener of pnwListeners) {
      try {
        listener(snapshot);
      } catch (error) {
        // 一个 Host 观察者失败不能让已经打开的 Dialog 失去 renderer 或 settle 通道。
        console.error("[phoenix-wing] PnwViewDialogHost listener failed", error);
      }
    }
  }

  function pnwRestoreFocusWhenUnclaimed(returnFocus: HTMLElement): void {
    setTimeout(() => {
      if (!returnFocus.isConnected || typeof document === "undefined") return;
      const activeElement = document.activeElement;
      // 统一 floating stack 可能已把焦点交给前一个 Tool/View/Dialog；此时不得抢回。
      if (
        activeElement !== null
        && activeElement !== document.body
        && activeElement !== returnFocus
        && activeElement.isConnected
      ) return;
      returnFocus.focus({ preventScroll: true });
    }, 0);
  }

  function pnwSettle(requestId: string, outcome: PnwViewDialogOutcome<unknown>): void {
    const entry = pnwActive.get(requestId);
    if (!entry) return;
    pnwActive.delete(requestId);
    pnwNotify();
    entry.settle(outcome);
  }

  const pnwWebFloatingAdapter: PnwViewDialogHostAdapter = {
    capabilities: {
      presentation: "web-floating",
      supportsParentRelationship: false,
      keepsParentInteractive: true,
      supportsOutsideParentBounds: false,
      maxOpenDialogs: pnwMaxOpenDialogs,
    },
    open(resolved) {
      const pending = pnwPreparing.get(resolved.requestId);
      if (!pending) {
        return Promise.resolve({
          status: "failed",
          code: "host-error",
          message: `request ${resolved.requestId} was not prepared by PnwViewDialogHost`,
        });
      }
      const offset = pnwActive.size * pnwPositionStep;
      const position = pending.request.position ?? {
        x: pnwDefaultPosition.x + offset,
        y: pnwDefaultPosition.y + offset,
      };
      const request: PnwResolvedViewDialogHostRequest<unknown> = {
        ...resolved,
        viewId: pending.request.viewId,
        rendererId: pending.request.rendererId,
        ...(pending.request.instanceKey === undefined
          ? {}
          : { instanceKey: pending.request.instanceKey }),
        position,
      };
      return new Promise<PnwViewDialogOutcome<unknown>>((settle) => {
        pnwActive.set(request.requestId, {
          identity: pnwCreateViewDialogHostIdentity(pending.request),
          request,
          bounds: {
            position,
            size: { width: request.size.width, height: request.size.height },
          },
          focusRevision: 0,
          settle,
        });
        pnwNotify();
      });
    },
    async close(requestId, reason) {
      pnwSettle(requestId, { status: "closed", reason });
    },
  };

  const pnwLowLevelController = pnwCreateViewDialogController({
    webFloating: pnwWebFloatingAdapter,
  });

  async function pnwOpen<TProps, TResult = unknown>(
    request: PnwViewDialogHostRequest<TProps>,
  ): Promise<PnwViewDialogOutcome<TResult>> {
    const issues = [...pnwValidateViewDialogRequest(request)];
    if (!request.rendererId?.trim()) issues.push("rendererId must not be empty");
    if (!pnwRenderers.has(request.rendererId)) {
      issues.push(`renderer ${request.rendererId || "<empty>"} is not registered`);
    }
    if (!pnwIsSerializableViewDialogValue(request.props)) {
      issues.push("props must be a finite JSON-serializable value");
    }
    if (issues.length > 0) {
      return {
        status: "failed",
        code: "invalid-request",
        message: issues.join("; "),
      };
    }
    const identity = pnwCreateViewDialogHostIdentity(
      request as PnwViewDialogHostRequest<unknown>,
    );
    const existing = [...pnwActive.values()].find((entry) => entry.identity === identity);
    const existingOutcome = pnwOutcomeByIdentity.get(identity);
    if (existing && existingOutcome) {
      controller.focus(existing.request.requestId);
      return existingOutcome as Promise<PnwViewDialogOutcome<TResult>>;
    }
    const returnFocus = typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    pnwPreparing.set(request.requestId, {
      request: request as PnwViewDialogHostRequest<unknown>,
    });
    let wasPresented = false;
    let trackedOutcome: Promise<PnwViewDialogOutcome<unknown>> | undefined;
    try {
      const resultPromise = pnwLowLevelController.open<TProps, TResult>({
        ...request,
        // 低层 controller 继续按 viewId 做单实例；高层把 owner/renderer/instance
        // 组合身份映射进去，因此同一 owner 的不同 renderer 不会互相阻塞。
        viewId: identity,
      });
      wasPresented = pnwActive.has(request.requestId);
      if (wasPresented) {
        trackedOutcome = resultPromise as Promise<PnwViewDialogOutcome<unknown>>;
        pnwOutcomeByIdentity.set(identity, trackedOutcome);
      }
      return await resultPromise;
    } finally {
      pnwPreparing.delete(request.requestId);
      if (trackedOutcome && pnwOutcomeByIdentity.get(identity) === trackedOutcome) {
        pnwOutcomeByIdentity.delete(identity);
      }
      if (wasPresented && pnwActive.size === 0 && returnFocus?.isConnected) {
        pnwRestoreFocusWhenUnclaimed(returnFocus);
      }
    }
  }

  const controller: PnwViewDialogHostController = {
    registerRenderer(definition) {
      const rendererId = definition.rendererId.trim();
      if (!rendererId) throw new TypeError("rendererId must not be empty");
      if (pnwRenderers.has(rendererId)) {
        throw new TypeError(`renderer ${rendererId} is already registered`);
      }
      pnwRenderers.set(rendererId, { ...definition, rendererId });
      let registered = true;
      return () => {
        if (!registered) return;
        registered = false;
        pnwRenderers.delete(rendererId);
        for (const entry of [...pnwActive.values()]) {
          if (entry.request.rendererId === rendererId) {
            pnwSettle(entry.request.requestId, { status: "closed", reason: "parent-close" });
          }
        }
      };
    },
    resolveRenderer(rendererId) {
      return pnwRenderers.get(rendererId);
    },
    open: pnwOpen,
    submit(requestId, value) {
      pnwSettle(requestId, { status: "submitted", value });
    },
    async cancel(requestId) {
      await pnwLowLevelController.close(requestId, "cancelled");
    },
    async close(requestId, reason = "programmatic") {
      await pnwLowLevelController.close(requestId, reason);
    },
    async closeByView(viewId, reason = "parent-close") {
      await Promise.all(pnwSnapshot()
        .filter((entry) => entry.request.viewId === viewId)
        .map((entry) => pnwLowLevelController.close(entry.request.requestId, reason)));
    },
    async closeAll(reason = "app-exit") {
      await Promise.all(pnwSnapshot()
        .map((entry) => pnwLowLevelController.close(entry.request.requestId, reason)));
    },
    focus(requestId) {
      const current = pnwActive.get(requestId);
      if (!current) return false;
      pnwActive.set(requestId, {
        ...current,
        focusRevision: current.focusRevision + 1,
      });
      pnwNotify();
      return true;
    },
    updateBounds(requestId, bounds) {
      const current = pnwActive.get(requestId);
      if (!current) return;
      pnwActive.set(requestId, { ...current, bounds });
      pnwNotify();
    },
    activeDialogs: pnwSnapshot,
    subscribe(listener) {
      pnwListeners.add(listener);
      listener(pnwSnapshot());
      return () => pnwListeners.delete(listener);
    },
  };
  return controller;
}

/** 在应用根 setup 中提供唯一 Host；Wing 不持久化 controller。 */
export function pnwProvideViewDialogHost(
  host: PnwViewDialogHostController,
): PnwViewDialogHostController {
  provide(PNW_VIEW_DIALOG_HOST_INJECTION_KEY, host);
  return host;
}

/** 业务插件只读取注入的高层 controller；缺失全局 Host 时立即失败，不静默 pending。 */
export function usePnwViewDialogHost(): PnwViewDialogHostController {
  const host = inject(PNW_VIEW_DIALOG_HOST_INJECTION_KEY, undefined);
  if (!host) throw new Error("usePnwViewDialogHost() 需在已提供 PnwViewDialogHost 的应用内调用");
  return host;
}
