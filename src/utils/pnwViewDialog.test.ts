import { describe, expect, it, vi } from "vitest";
import type {
  PnwResolvedViewDialogRequest,
  PnwViewDialogHostAdapter,
  PnwViewDialogOutcome,
} from "../types/PnwViewDialog.js";
import {
  pnwCreateViewDialogController,
  pnwNormalizeViewDialogRequest,
  pnwResolveViewDialogPresentation,
} from "./pnwViewDialog.js";

function pnwDeferred<TResult>() {
  let resolve!: (value: TResult) => void;
  const promise = new Promise<TResult>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

function pnwAdapter(
  presentation: "desktop-dialog" | "web-floating",
  outcome: Promise<PnwViewDialogOutcome<unknown>>,
  overrides: Partial<PnwViewDialogHostAdapter["capabilities"]> = {},
): PnwViewDialogHostAdapter {
  return {
    capabilities: {
      presentation,
      supportsParentRelationship: presentation === "desktop-dialog",
      keepsParentInteractive: true,
      supportsOutsideParentBounds: presentation === "desktop-dialog",
      maxOpenDialogs: 2,
      ...overrides,
    },
    open: vi.fn(() => outcome),
    close: vi.fn(async () => undefined),
  };
}

const PNW_REQUEST = {
  requestId: "parts.properties.edit",
  viewId: "parts.properties",
  title: "编辑属性",
  parentId: "main",
  props: { partId: "P-001" },
} as const;

describe("pnwViewDialog", () => {
  it("归一化尺寸与单实例默认值且不改写 View props", () => {
    const request = pnwNormalizeViewDialogRequest({
      ...PNW_REQUEST,
      size: { width: 200, minWidth: 420, height: Number.NaN, maxHeight: 480 },
    });
    expect(request.size).toEqual({
      width: 420,
      height: 480,
      minWidth: 420,
      minHeight: 240,
      maxHeight: 480,
    });
    expect(request.instancePolicy).toBe("single");
    expect(request.maxInstances).toBe(1);
    expect(request.props).toBe(PNW_REQUEST.props);
  });

  it("只有非模态父子关系且可越过父窗口边界时选择 desktop-dialog", () => {
    expect(pnwResolveViewDialogPresentation({
      presentation: "desktop-dialog",
      supportsParentRelationship: true,
      keepsParentInteractive: true,
      supportsOutsideParentBounds: true,
      maxOpenDialogs: 2,
    }, "main")).toBe("desktop-dialog");
    expect(pnwResolveViewDialogPresentation({
      presentation: "desktop-dialog",
      supportsParentRelationship: true,
      keepsParentInteractive: false,
      supportsOutsideParentBounds: true,
      maxOpenDialogs: 2,
    }, "main")).toBe("web-floating");
    expect(pnwResolveViewDialogPresentation({
      presentation: "desktop-dialog",
      supportsParentRelationship: true,
      keepsParentInteractive: true,
      supportsOutsideParentBounds: false,
      maxOpenDialogs: 2,
    }, "main")).toBe("web-floating");
    expect(pnwResolveViewDialogPresentation(undefined, "main")).toBe("web-floating");
    expect(pnwResolveViewDialogPresentation({
      presentation: "desktop-dialog",
      supportsParentRelationship: true,
      keepsParentInteractive: true,
      supportsOutsideParentBounds: true,
      maxOpenDialogs: 2,
    }, undefined)).toBe("web-floating");
  });

  it("Tauri 能力完整时走 desktop adapter，Web 环境自动退化无蒙层浮窗", async () => {
    const desktopOutcome = Promise.resolve({ status: "submitted", value: { saved: true } } as const);
    const floatingOutcome = Promise.resolve({ status: "closed", reason: "cancelled" } as const);
    const desktop = pnwAdapter("desktop-dialog", desktopOutcome);
    const floating = pnwAdapter("web-floating", floatingOutcome);
    const controller = pnwCreateViewDialogController({ desktopDialog: desktop, webFloating: floating });

    await expect(controller.open(PNW_REQUEST)).resolves.toEqual({ status: "submitted", value: { saved: true } });
    expect(desktop.open).toHaveBeenCalledOnce();
    expect(floating.open).not.toHaveBeenCalled();

    await expect(controller.open({ ...PNW_REQUEST, requestId: "web", parentId: undefined }))
      .resolves.toEqual({ status: "closed", reason: "cancelled" });
    expect(floating.open).toHaveBeenCalledOnce();
  });

  it("单实例拒绝同 View 重入，close 路由到当前 adapter", async () => {
    const deferred = pnwDeferred<PnwViewDialogOutcome<unknown>>();
    const floating = pnwAdapter("web-floating", deferred.promise);
    const controller = pnwCreateViewDialogController({ webFloating: floating });
    const first = controller.open({ ...PNW_REQUEST, parentId: undefined });

    expect(controller.activeRequests()).toHaveLength(1);
    await expect(controller.open({
      ...PNW_REQUEST,
      requestId: "parts.properties.second",
      parentId: undefined,
    })).resolves.toMatchObject({ status: "failed", code: "already-open" });
    await controller.close(PNW_REQUEST.requestId, "programmatic");
    expect(floating.close).toHaveBeenCalledWith(PNW_REQUEST.requestId, "programmatic");

    deferred.resolve({ status: "closed", reason: "programmatic" });
    await first;
    expect(controller.activeRequests()).toHaveLength(0);
  });

  it("parallel 仍受 View 与 Host 上限约束，adapter 异常转为可序列化失败", async () => {
    const deferred = pnwDeferred<PnwViewDialogOutcome<unknown>>();
    const floating = pnwAdapter("web-floating", deferred.promise, { maxOpenDialogs: 1 });
    const controller = pnwCreateViewDialogController({ webFloating: floating });
    const first = controller.open({
      ...PNW_REQUEST,
      parentId: undefined,
      instancePolicy: "parallel",
      maxInstances: 3,
    });
    await expect(controller.open({
      ...PNW_REQUEST,
      requestId: "parts.properties.second",
      parentId: undefined,
      instancePolicy: "parallel",
      maxInstances: 3,
    })).resolves.toMatchObject({ status: "failed", code: "instance-limit" });
    deferred.resolve({ status: "closed", reason: "cancelled" });
    await first;

    const failing = pnwAdapter("web-floating", Promise.reject(new Error("floating host failed")));
    await expect(pnwCreateViewDialogController({ webFloating: failing }).open({
      ...PNW_REQUEST,
      parentId: undefined,
    })).resolves.toEqual({ status: "failed", code: "host-error", message: "floating host failed" });
  });

  it("不同 adapter 分别计算 Host 并行上限", async () => {
    const desktopDeferred = pnwDeferred<PnwViewDialogOutcome<unknown>>();
    const floatingDeferred = pnwDeferred<PnwViewDialogOutcome<unknown>>();
    const desktop = pnwAdapter("desktop-dialog", desktopDeferred.promise, { maxOpenDialogs: 1 });
    const floating = pnwAdapter("web-floating", floatingDeferred.promise, { maxOpenDialogs: 1 });
    const controller = pnwCreateViewDialogController({ desktopDialog: desktop, webFloating: floating });

    const first = controller.open({
      ...PNW_REQUEST,
      instancePolicy: "parallel",
      maxInstances: 2,
    });
    const second = controller.open({
      ...PNW_REQUEST,
      requestId: "parts.properties.web",
      parentId: undefined,
      instancePolicy: "parallel",
      maxInstances: 2,
    });
    expect(controller.activeRequests()).toHaveLength(2);

    desktopDeferred.resolve({ status: "closed", reason: "window-close" });
    floatingDeferred.resolve({ status: "closed", reason: "window-close" });
    await Promise.all([first, second]);
  });

  it("拒绝空 requestId/viewId/title", async () => {
    const floating = pnwAdapter(
      "web-floating",
      Promise.resolve({ status: "closed", reason: "cancelled" }),
    );
    const controller = pnwCreateViewDialogController({ webFloating: floating });
    const outcome = await controller.open({
      requestId: " ",
      viewId: "",
      title: " ",
      props: null,
    });
    expect(outcome).toMatchObject({ status: "failed", code: "invalid-request" });
    expect(floating.open).not.toHaveBeenCalled();
  });

  it("启动时拒绝会禁用主界面的 Web fallback", () => {
    const floating = pnwAdapter(
      "web-floating",
      Promise.resolve({ status: "closed", reason: "cancelled" }),
      { keepsParentInteractive: false },
    );
    expect(() => pnwCreateViewDialogController({ webFloating: floating }))
      .toThrow("non-modal web-floating host");
  });
});
