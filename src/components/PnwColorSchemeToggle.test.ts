// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import PnwColorSchemeToggle from "./PnwColorSchemeToggle.vue";

const pnwOriginalStartViewTransition = (
  document as Document & { startViewTransition?: unknown }
).startViewTransition;
const pnwOriginalAnimate = document.documentElement.animate;

afterEach(() => {
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    writable: true,
    value: pnwOriginalStartViewTransition,
  });
  Object.defineProperty(document.documentElement, "animate", {
    configurable: true,
    writable: true,
    value: pnwOriginalAnimate,
  });
  vi.restoreAllMocks();
});

describe("PnwColorSchemeToggle", () => {
  it("dark 显示太阳并发出明确 light，不接管持久化", async () => {
    const wrapper = mount(PnwColorSchemeToggle, {
      props: { modelValue: "dark" },
    });

    const button = wrapper.get("button");
    expect(button.attributes("title")).toBe("切换到白天模式");
    expect(button.attributes("aria-label")).toBe("切换到白天模式");
    expect(button.attributes("data-pnw-color-scheme-toggle-icon")).toBe("sun");
    await button.trigger("click");
    await flushPromises();

    expect(wrapper.emitted("update:modelValue")).toEqual([["light"]]);
    expect(wrapper.emitted("change")).toEqual([["light"]]);
    expect(wrapper.props("modelValue")).toBe("dark");
  });

  it("light 显示月亮并支持英文无障碍名称", () => {
    const wrapper = mount(PnwColorSchemeToggle, {
      props: { modelValue: "light", locale: "en-US" },
    });

    const button = wrapper.get("button");
    expect(button.attributes("aria-label")).toBe("Switch to dark mode");
    expect(button.attributes("data-pnw-color-scheme-toggle-icon")).toBe("moon");
  });

  it("首次点击立即以当前按钮中心作为圆形揭示原点", async () => {
    const animate = vi.fn((
      _frames: Keyframe[] | PropertyIndexedKeyframes,
      _options?: number | KeyframeAnimationOptions,
    ) => ({ finished: Promise.resolve() }));
    Object.defineProperty(document.documentElement, "animate", {
      configurable: true,
      writable: true,
      value: animate,
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      writable: true,
      value: (callback: () => void | Promise<void>) => {
        const updated = Promise.resolve().then(callback);
        return { ready: updated, finished: updated };
      },
    });
    const wrapper = mount(PnwColorSchemeToggle, {
      props: { modelValue: "light" },
    });
    const button = wrapper.get("button");
    vi.spyOn(button.element, "getBoundingClientRect").mockReturnValue({
      x: 480,
      y: 32,
      left: 480,
      top: 32,
      right: 514,
      bottom: 66,
      width: 34,
      height: 34,
      toJSON: () => ({}),
    });

    await button.trigger("click");
    await flushPromises();

    expect(animate).toHaveBeenCalledOnce();
    expect(animate.mock.calls[0]?.[0]).toMatchObject({
      clipPath: ["circle(0px at 497px 49px)", expect.any(String)],
    });
  });

  it("禁用时不发出切换", async () => {
    const wrapper = mount(PnwColorSchemeToggle, {
      props: { modelValue: "light", disabled: true },
    });

    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
