// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { pnwCreateFloatingWindowStack } from "../utils/pnwFloatingWindowStack.js";
import PnwFloatingWindowMenu from "./PnwFloatingWindowMenu.vue";

describe("PnwFloatingWindowMenu", () => {
  it("显示 Tool/View 统一计数，可聚焦并收回 View", async () => {
    const stack = pnwCreateFloatingWindowStack();
    const focusTool = vi.fn();
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
      focus: vi.fn(),
      requestReattach: reattachView,
    });
    const wrapper = mount(PnwFloatingWindowMenu, { props: { stack } });
    expect(wrapper.get(".pnw-floating-window-menu__count").text()).toBe("2");
    await wrapper.get(".pnw-floating-window-menu__trigger").trigger("click");
    expect(wrapper.text()).toContain("Resource Library");
    expect(wrapper.text()).toContain("工程分析");

    await wrapper.findAll(".pnw-floating-window-menu__focus")[0]?.trigger("click");
    expect(focusTool).toHaveBeenCalledTimes(1);
    await wrapper.get(".pnw-floating-window-menu__trigger").trigger("click");
    await wrapper.get(".pnw-floating-window-menu__reattach").trigger("click");
    expect(reattachView).toHaveBeenCalledTimes(1);
  });
});
