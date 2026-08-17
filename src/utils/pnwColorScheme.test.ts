// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PNW_DEFAULT_COLOR_SCHEME_TRANSITION_DURATION,
  pnwToggleColorSchemeWithTransition,
} from "./pnwColorScheme.js";

const pnwOriginalStartViewTransition = (
  document as Document & { startViewTransition?: unknown }
).startViewTransition;
const pnwOriginalAnimate = document.documentElement.animate;
const pnwOriginalMatchMedia = window.matchMedia;

function pnwSetDocumentMethod(name: "startViewTransition", value: unknown): void {
  Object.defineProperty(document, name, { configurable: true, writable: true, value });
}

function pnwSetRootAnimate(value: unknown): void {
  Object.defineProperty(document.documentElement, "animate", {
    configurable: true,
    writable: true,
    value,
  });
}

afterEach(() => {
  pnwSetDocumentMethod("startViewTransition", pnwOriginalStartViewTransition);
  pnwSetRootAnimate(pnwOriginalAnimate);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: pnwOriginalMatchMedia,
  });
  delete document.documentElement.dataset.pnwColorSchemeTransition;
  vi.restoreAllMocks();
});

describe("pnwToggleColorSchemeWithTransition", () => {
  it("浏览器不支持 View Transition 时仍立即更新受控主题", async () => {
    pnwSetDocumentMethod("startViewTransition", undefined);
    const update = vi.fn();

    await expect(pnwToggleColorSchemeWithTransition({
      value: "light",
      update,
      ownerDocument: document,
    })).resolves.toEqual({ value: "dark", animated: false });
    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith("dark");
  });

  it("从按钮中心向最远角揭示新 dark root", async () => {
    const update = vi.fn();
    const animate = vi.fn((
      _frames: Keyframe[] | PropertyIndexedKeyframes,
      _options?: number | KeyframeAnimationOptions,
    ) => ({ finished: Promise.resolve() }));
    const startViewTransition = vi.fn((callback: () => void | Promise<void>) => {
      const updated = Promise.resolve().then(callback);
      return { ready: updated, finished: updated, skipTransition: vi.fn() };
    });
    pnwSetRootAnimate(animate);
    pnwSetDocumentMethod("startViewTransition", startViewTransition);

    const result = await pnwToggleColorSchemeWithTransition({
      value: "light",
      origin: { x: 20, y: 30 },
      duration: 400,
      update,
      ownerDocument: document,
    });

    expect(result).toEqual({ value: "dark", animated: true });
    expect(update).toHaveBeenCalledWith("dark");
    expect(animate).toHaveBeenCalledOnce();
    const [frames, options] = animate.mock.calls[0] ?? [];
    expect(frames).toMatchObject({ clipPath: ["circle(0px at 20px 30px)", expect.any(String)] });
    expect(options).toMatchObject({
      duration: 400,
      pseudoElement: "::view-transition-new(root)",
    });
    expect(document.documentElement.dataset.pnwColorSchemeTransition).toBeUndefined();
  });

  it("进入 light 时收缩 old root，system 先解析实际 dark", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn((query: string) => ({ matches: query.includes("dark") })),
    });
    const animate = vi.fn((
      _frames: Keyframe[] | PropertyIndexedKeyframes,
      _options?: number | KeyframeAnimationOptions,
    ) => ({ finished: Promise.resolve() }));
    pnwSetRootAnimate(animate);
    pnwSetDocumentMethod("startViewTransition", (callback: () => void | Promise<void>) => {
      const updated = Promise.resolve().then(callback);
      return { ready: updated, finished: updated };
    });

    const result = await pnwToggleColorSchemeWithTransition({
      value: "system",
      update: vi.fn(),
      ownerDocument: document,
    });

    expect(result.value).toBe("light");
    expect(animate.mock.calls[0]?.[1]).toMatchObject({
      duration: PNW_DEFAULT_COLOR_SCHEME_TRANSITION_DURATION,
      pseudoElement: "::view-transition-old(root)",
    });
  });

  it("减少动态效果时不启动动画", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn((query: string) => ({ matches: query.includes("reduced-motion") })),
    });
    const startViewTransition = vi.fn();
    pnwSetRootAnimate(vi.fn());
    pnwSetDocumentMethod("startViewTransition", startViewTransition);
    const update = vi.fn();

    const result = await pnwToggleColorSchemeWithTransition({
      value: "light",
      update,
      ownerDocument: document,
    });

    expect(result).toEqual({ value: "dark", animated: false });
    expect(update).toHaveBeenCalledWith("dark");
    expect(startViewTransition).not.toHaveBeenCalled();
  });

  it("动画 API 失败时保留已经完成的主题更新并清理临时标记", async () => {
    const update = vi.fn();
    const skipTransition = vi.fn();
    pnwSetRootAnimate(vi.fn(() => { throw new Error("animation unavailable"); }));
    pnwSetDocumentMethod("startViewTransition", (callback: () => void | Promise<void>) => {
      const updated = Promise.resolve().then(callback);
      return { ready: updated, finished: updated, skipTransition };
    });

    const result = await pnwToggleColorSchemeWithTransition({
      value: "light",
      update,
      ownerDocument: document,
    });

    expect(result).toEqual({ value: "dark", animated: false });
    expect(update).toHaveBeenCalledOnce();
    expect(skipTransition).toHaveBeenCalledOnce();
    expect(document.documentElement.dataset.pnwColorSchemeTransition).toBeUndefined();
  });

  it("同一 document 的并发点击合并为一次受控更新", async () => {
    let release!: () => void;
    const finished = new Promise<void>((resolve) => { release = resolve; });
    const update = vi.fn();
    pnwSetRootAnimate(vi.fn(() => ({ finished })));
    pnwSetDocumentMethod("startViewTransition", (callback: () => void | Promise<void>) => {
      const ready = Promise.resolve().then(callback);
      return { ready, finished };
    });

    const first = pnwToggleColorSchemeWithTransition({
      value: "light",
      update,
      ownerDocument: document,
    });
    const second = pnwToggleColorSchemeWithTransition({
      value: "light",
      update,
      ownerDocument: document,
    });
    await Promise.resolve();
    release();

    await expect(Promise.all([first, second])).resolves.toEqual([
      { value: "dark", animated: true },
      { value: "dark", animated: true },
    ]);
    expect(update).toHaveBeenCalledOnce();
  });
});
