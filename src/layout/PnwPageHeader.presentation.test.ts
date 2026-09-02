// @vitest-environment happy-dom

import { defineComponent, h, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { pnwProvideViewPresentationContext } from "../composables/usePnwViewPresentationContext.js";
import type { PnwViewPresentationMode } from "../types/PnwViewPresentation.js";
import PnwPageHeader from "./PnwPageHeader.vue";

describe("PnwPageHeader presentation context", () => {
  it("在 Host context 的嵌入态提供浮出，浮出态交给窗口标题栏收回", async () => {
    const mode = ref<PnwViewPresentationMode>("embedded");
    const detach = vi.fn();
    const reattach = vi.fn();
    const release = vi.fn();
    const registerHeader = vi.fn(() => release);
    const Host = defineComponent({
      setup() {
        pnwProvideViewPresentationContext({ mode, detach, reattach, registerHeader });
        return () => h(PnwPageHeader, { title: "插件页面" });
      },
    });
    const wrapper = mount(Host);
    const button = wrapper.get(".pnw-head-presentation-action");

    expect(registerHeader).toHaveBeenCalledTimes(1);
    await button.trigger("click");
    expect(detach).toHaveBeenCalledTimes(1);

    mode.value = "floating";
    await nextTick();
    expect(wrapper.find(".pnw-head-presentation-action").exists()).toBe(false);
    expect(reattach).not.toHaveBeenCalled();

    wrapper.unmount();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("允许页面显式关闭默认 presentation 动作", () => {
    const mode = ref<PnwViewPresentationMode>("embedded");
    const Host = defineComponent({
      setup() {
        pnwProvideViewPresentationContext({
          mode,
          detach: vi.fn(),
          reattach: vi.fn(),
        });
        return () => h(PnwPageHeader, {
          title: "固定页面",
          presentationDetachable: false,
        });
      },
    });

    expect(mount(Host).find(".pnw-head-presentation-action").exists()).toBe(false);
  });

  it("页面显式管理 presentationMode 时不混入 Host 默认动作", () => {
    const hostMode = ref<PnwViewPresentationMode>("embedded");
    const Host = defineComponent({
      setup() {
        pnwProvideViewPresentationContext({
          mode: hostMode,
          detach: vi.fn(),
          reattach: vi.fn(),
        });
        return () => h(PnwPageHeader, {
          title: "自管理页面",
          presentationMode: "floating",
        });
      },
    });

    expect(mount(Host).find(".pnw-head-presentation-action").exists()).toBe(false);
  });
});
