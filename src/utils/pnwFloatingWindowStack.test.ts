import { describe, expect, it, vi } from "vitest";
import { pnwCreateFloatingWindowStack } from "./pnwFloatingWindowStack.js";

describe("Pnw 非模态浮窗栈", () => {
  it("register/activate 使用有界 live order，不持久化单调 z-index", () => {
    const stack = pnwCreateFloatingWindowStack();
    const unregisterA = stack.register({
      presentationId: "tool:resource",
      baseZIndex: 1400,
      focus: vi.fn(),
    });
    const unregisterB = stack.register({
      presentationId: "view:analysis",
      baseZIndex: 1400,
      focus: vi.fn(),
    });
    expect(stack.snapshot()).toEqual({
      activePresentationId: "view:analysis",
      orderedPresentationIds: ["tool:resource", "view:analysis"],
      windows: [
        {
          presentationId: "tool:resource",
          title: "tool:resource",
          ownerKind: undefined,
          active: false,
          canReattach: false,
        },
        {
          presentationId: "view:analysis",
          title: "view:analysis",
          ownerKind: undefined,
          active: true,
          canReattach: false,
        },
      ],
    });
    expect(stack.resolveZIndex("tool:resource")).toBe(1400);
    expect(stack.resolveZIndex("view:analysis")).toBe(1401);

    stack.activate("tool:resource");
    expect(stack.snapshot().orderedPresentationIds).toEqual([
      "view:analysis",
      "tool:resource",
    ]);
    expect(stack.resolveZIndex("tool:resource")).toBe(1401);
    unregisterA();
    unregisterB();
  });

  it("关闭活动窗口后恢复前一窗口焦点", () => {
    const stack = pnwCreateFloatingWindowStack();
    const focusA = vi.fn();
    const unregisterA = stack.register({
      presentationId: "tool:resource",
      baseZIndex: 1400,
      focus: focusA,
    });
    const unregisterB = stack.register({
      presentationId: "view:analysis",
      baseZIndex: 1400,
      focus: vi.fn(),
    });
    unregisterB();
    expect(stack.snapshot().activePresentationId).toBe("tool:resource");
    expect(focusA).toHaveBeenCalledTimes(1);
    unregisterA();
    expect(stack.snapshot().activePresentationId).toBeUndefined();
  });

  it("不同历史 base 仍归一到同一 presentation 平面并可跨 Tool/View 置顶", () => {
    const stack = pnwCreateFloatingWindowStack();
    stack.register({
      presentationId: "tool:resource",
      baseZIndex: 1800,
      focus: vi.fn(),
    });
    stack.register({
      presentationId: "view:analysis",
      baseZIndex: 1600,
      focus: vi.fn(),
    });

    expect(stack.resolveZIndex("tool:resource")).toBe(1800);
    expect(stack.resolveZIndex("view:analysis")).toBe(1801);

    stack.activate("tool:resource");
    expect(stack.resolveZIndex("view:analysis")).toBe(1800);
    expect(stack.resolveZIndex("tool:resource")).toBe(1801);
  });

  it("拒绝空 presentationId", () => {
    const stack = pnwCreateFloatingWindowStack();
    expect(() => stack.register({
      presentationId: " ",
      baseZIndex: 1400,
      focus: () => undefined,
    })).toThrow("presentationId");
  });

  it("统一窗口入口可聚焦 Tool/View，并只对支持的 View 请求收回", () => {
    const stack = pnwCreateFloatingWindowStack();
    const focusTool = vi.fn();
    const focusView = vi.fn();
    const reattachView = vi.fn();
    stack.register({
      presentationId: "tool:resource",
      title: "Resource Library",
      ownerKind: "tool",
      baseZIndex: 1400,
      focus: focusTool,
    });
    stack.register({
      presentationId: "view:analysis",
      title: "工程分析",
      ownerKind: "view",
      baseZIndex: 1400,
      focus: focusView,
      requestReattach: reattachView,
    });

    stack.focus("tool:resource");
    expect(focusTool).toHaveBeenCalledTimes(1);
    expect(stack.snapshot().activePresentationId).toBe("tool:resource");
    stack.reattach("view:analysis");
    stack.reattachAll();
    expect(reattachView).toHaveBeenCalledTimes(2);
    expect(stack.snapshot().windows).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: "Resource Library", ownerKind: "tool" }),
      expect.objectContaining({ title: "工程分析", ownerKind: "view", canReattach: true }),
    ]));
    expect(focusView).not.toHaveBeenCalled();
  });
});
