import { describe, expect, it } from "vitest";
import type { PnwViewPresentationIdentity } from "../types/PnwViewPresentation.js";
import {
  PNW_DEFAULT_VIEW_PRESENTATION_DIALOG_POSITION,
  PNW_DEFAULT_VIEW_PRESENTATION_DIALOG_SIZE,
  pnwCreateViewPresentationManagerState,
  pnwCreateViewPresentationRecord,
  pnwIsViewPresentationDetached,
  pnwIsViewPresentationOwnerTabEditorActive,
  pnwReduceViewPresentationManagerState,
  pnwReduceViewPresentationRecord,
  pnwResolveNextEmbeddedViewId,
  pnwResolveOpenViewPresentationAction,
  pnwResolveViewPresentationContribution,
  pnwResolveViewPresentationOwnerTabAction,
  pnwSelectMostRecentEmbeddedEditorView,
  pnwShouldProjectViewPresentationOwnerTab,
  pnwValidateViewPresentationIdentity,
} from "./pnwViewPresentation.js";

const PNW_IDENTITY: PnwViewPresentationIdentity = {
  rendererId: "fixture.canvas",
  viewInstanceId: "fixture.canvas:1",
  ownerTabId: "tab.fixture.canvas:1",
  instanceKey: "fixture-canvas-1",
};

describe("PnwViewPresentation 状态机", () => {
  it("创建可持久化纯数据记录并归一化默认值", () => {
    const record = pnwCreateViewPresentationRecord(PNW_IDENTITY, {
      dialogPosition: { x: Number.NaN, y: 64 },
      dialogSize: { width: -1, height: 540 },
      revision: 3.8,
    });

    expect(record).toEqual({
      identity: PNW_IDENTITY,
      mode: "embedded",
      dialogPosition: {
        x: PNW_DEFAULT_VIEW_PRESENTATION_DIALOG_POSITION.x,
        y: 64,
      },
      dialogSize: {
        width: PNW_DEFAULT_VIEW_PRESENTATION_DIALOG_SIZE.width,
        height: 540,
      },
      revision: 3,
    });
    expect(JSON.parse(JSON.stringify(record))).toEqual(record);
  });

  it("按 target-ready 与 frames-returned 两阶段原子推进", () => {
    const embedded = pnwCreateViewPresentationRecord(PNW_IDENTITY);
    const opening = pnwReduceViewPresentationRecord(embedded, { type: "detach" });
    const floating = pnwReduceViewPresentationRecord(opening, {
      type: "targets-ready",
      revision: opening.revision,
    });
    const reattaching = pnwReduceViewPresentationRecord(floating, { type: "reattach" });
    const returned = pnwReduceViewPresentationRecord(reattaching, {
      type: "frames-returned",
      revision: reattaching.revision,
    });

    expect(opening.mode).toBe("opening");
    expect(floating.mode).toBe("floating");
    expect(reattaching.mode).toBe("reattaching");
    expect(returned.mode).toBe("embedded");
    expect(returned.identity).toBe(embedded.identity);
    expect(pnwIsViewPresentationDetached(floating)).toBe(true);
    expect(pnwIsViewPresentationDetached(returned)).toBe(false);
  });

  it("拒绝陈旧 revision 且重复命令保持引用稳定", () => {
    const opening = pnwReduceViewPresentationRecord(
      pnwCreateViewPresentationRecord(PNW_IDENTITY),
      { type: "detach" },
    );
    expect(pnwReduceViewPresentationRecord(opening, {
      type: "targets-ready",
      revision: opening.revision - 1,
    })).toBe(opening);
    expect(pnwReduceViewPresentationRecord(opening, { type: "detach" })).toBe(opening);

    const reattaching = pnwReduceViewPresentationRecord(opening, { type: "reattach" });
    expect(pnwReduceViewPresentationRecord(reattaching, {
      type: "frames-returned",
      revision: opening.revision,
    })).toBe(reattaching);
  });

  it("位置和尺寸更新不改变 mode 与身份", () => {
    const initial = pnwCreateViewPresentationRecord(PNW_IDENTITY);
    const positioned = pnwReduceViewPresentationRecord(initial, {
      type: "set-dialog-position",
      position: { x: 108, y: 92 },
    });
    const sized = pnwReduceViewPresentationRecord(positioned, {
      type: "set-dialog-size",
      size: { width: 840, height: 620 },
    });
    expect(sized).toMatchObject({
      identity: PNW_IDENTITY,
      mode: "embedded",
      dialogPosition: { x: 108, y: 92 },
      dialogSize: { width: 840, height: 620 },
    });
  });

  it("使用 frame 推荐尺寸初始化但不把临时活动栈写入 record", () => {
    const record = pnwCreateViewPresentationRecord(PNW_IDENTITY, {
      frame: {
        ownerKind: "view",
        recommendedSize: { width: 880, height: 640 },
        rememberBounds: true,
        closeBehavior: "reattach",
      },
    });
    expect(record.dialogSize).toEqual({ width: 880, height: 640 });
    expect(record).not.toHaveProperty("active");
  });

  it("拒绝空身份", () => {
    const invalid = { ...PNW_IDENTITY, ownerTabId: " " };
    expect(pnwValidateViewPresentationIdentity(invalid)).toEqual([
      "ownerTabId must not be empty",
    ]);
    expect(() => pnwCreateViewPresentationRecord(invalid)).toThrow("ownerTabId");
  });

  it("按 Editor 激活历史选择仍 open 且 embedded 的 MRU，而不是标签相邻项", () => {
    expect(pnwResolveNextEmbeddedViewId(
      ["view-a", "view-c", "view-b", "view-d"],
      ["view-b", "view-d"],
      "view-a",
    )).toBe("view-b");
    expect(pnwResolveNextEmbeddedViewId(["view-a"], [], "view-a")).toBeUndefined();
  });

  it("detach 将 Editor 切到 MRU embedded View，并把浮窗焦点与 Editor 焦点分开", () => {
    const initial = pnwCreateViewPresentationManagerState(
      "view-a",
      ["view-a", "view-c", "view-b"],
    );
    const detached = pnwReduceViewPresentationManagerState(initial, {
      type: "detach",
      viewInstanceId: "view-a",
      views: [
        { viewInstanceId: "view-a", open: true, presentationMode: "floating" },
        { viewInstanceId: "view-b", open: true, presentationMode: "embedded" },
        { viewInstanceId: "view-c", open: true, presentationMode: "floating" },
      ],
    });

    expect(detached).toEqual({
      activeEditorViewId: "view-b",
      activeFloatingViewId: "view-a",
      editorActivationHistory: ["view-c", "view-b"],
    });
  });

  it("无可用 embedded View 时回到 Home，reattach 后重新激活并进入 Editor MRU", () => {
    const detached = pnwReduceViewPresentationManagerState(
      pnwCreateViewPresentationManagerState("view-a", ["view-a"]),
      { type: "detach", viewInstanceId: "view-a", views: [] },
    );
    expect(detached.activeEditorViewId).toBeUndefined();

    const reattached = pnwReduceViewPresentationManagerState(detached, {
      type: "reattach",
      viewInstanceId: "view-a",
    });
    expect(reattached).toEqual({
      activeEditorViewId: "view-a",
      activeFloatingViewId: undefined,
      editorActivationHistory: ["view-a"],
    });
  });

  it("隐藏 floating owner Tab 只是投影，不改变 owner record 或点击语义", () => {
    const embedded = pnwCreateViewPresentationRecord(PNW_IDENTITY);
    const opening = pnwReduceViewPresentationRecord(embedded, { type: "detach" });
    const floating = pnwReduceViewPresentationRecord(opening, {
      type: "targets-ready",
      revision: opening.revision,
    });

    expect(pnwShouldProjectViewPresentationOwnerTab(floating)).toBe(false);
    expect(pnwShouldProjectViewPresentationOwnerTab(floating, "keep")).toBe(true);
    expect(pnwResolveViewPresentationOwnerTabAction(floating)).toEqual({
      type: "focus-floating",
      viewInstanceId: PNW_IDENTITY.viewInstanceId,
    });
    expect(pnwResolveViewPresentationOwnerTabAction(embedded)).toEqual({
      type: "activate-editor",
      viewInstanceId: PNW_IDENTITY.viewInstanceId,
    });
    expect(floating.identity.ownerTabId).toBe(PNW_IDENTITY.ownerTabId);
    expect(pnwIsViewPresentationOwnerTabEditorActive(floating, {
      activeEditorViewId: PNW_IDENTITY.viewInstanceId,
      activeFloatingViewId: PNW_IDENTITY.viewInstanceId,
      editorActivationHistory: [PNW_IDENTITY.viewInstanceId],
    })).toBe(false);
  });

  it("公共 selector 自动排除 closed、floating、过渡态与 closing View", () => {
    const views = [
      { viewInstanceId: "view-a", open: true, presentationMode: "floating" },
      { viewInstanceId: "view-b", open: false, presentationMode: "embedded" },
      { viewInstanceId: "view-c", open: true, presentationMode: "closing" },
      { viewInstanceId: "view-d", open: true, presentationMode: "opening" },
      { viewInstanceId: "view-e", open: true, presentationMode: "embedded" },
    ] as const;
    expect(pnwSelectMostRecentEmbeddedEditorView(
      ["view-a", "view-b", "view-c", "view-d", "view-e"],
      views,
    )).toBe("view-e");
  });

  it("普通稳定 View 默认可浮出，Home/无 owner/能力不足自动禁用", () => {
    const ordinary = pnwResolveViewPresentationContribution(undefined, {
      hasStableOwner: true,
    });
    expect(ordinary).toMatchObject({
      detachable: true,
      tabPresentation: "hide-when-floating",
      frame: { ownerKind: "view", closeBehavior: "reattach" },
    });
    expect(pnwResolveViewPresentationContribution(undefined, {
      hasStableOwner: true,
      isHome: true,
    }).detachable).toBe(false);
    expect(pnwResolveViewPresentationContribution({ detachable: true }, {
      hasStableOwner: false,
    }).detachable).toBe(false);
    expect(pnwResolveViewPresentationContribution(undefined, {
      hasStableOwner: true,
      supportsFloating: false,
    }).detachable).toBe(false);
  });

  it("openView 默认单实例：结果 View 首次直接 floating，重复点击只聚焦", () => {
    const contribution = pnwResolveViewPresentationContribution(undefined, {
      hasStableOwner: true,
    });
    expect(pnwResolveOpenViewPresentationAction({
      viewId: "analysis.result-preview",
      preferredPresentation: "floating",
    }, contribution, [])).toEqual({
      type: "create",
      viewId: "analysis.result-preview",
      presentation: "floating",
    });
    expect(pnwResolveOpenViewPresentationAction({
      viewId: "analysis.result-preview",
      preferredPresentation: "floating",
    }, contribution, [{
      viewId: "analysis.result-preview",
      viewInstanceId: "analysis.result-preview:1",
      instanceKey: "result-preview",
      mode: "floating",
    }])).toEqual({
      type: "focus-existing",
      viewInstanceId: "analysis.result-preview:1",
    });
  });

  it("floating 不可用时降级 embedded；parallel 必须显式 instanceKey", () => {
    const contribution = pnwResolveViewPresentationContribution(undefined, {
      hasStableOwner: true,
      supportsFloating: false,
    });
    expect(pnwResolveOpenViewPresentationAction({
      viewId: "fixture.view",
      preferredPresentation: "floating",
    }, contribution, [])).toMatchObject({ type: "create", presentation: "embedded" });
    expect(() => pnwResolveOpenViewPresentationAction({
      viewId: "fixture.view",
      allowParallel: true,
    }, contribution, [])).toThrow("instanceKey");
  });
});
