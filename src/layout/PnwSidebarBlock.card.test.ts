// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import PnwSidebarBlock from "./PnwSidebarBlock.vue";

describe("SidebarBlock card", () => {
  it("collapses independently of actions and keeps a single body", async () => {
    const wrapper = mount(PnwSidebarBlock, { props: { title: "属性", variant: "card" }, slots: {
      actions: () => h("button", "保存"), default: () => h("p", "正文"),
    } });
    await wrapper.get(".pnw-sidebar-block-actions button").trigger("click");
    expect(wrapper.emitted("toggle")).toBeUndefined();
    await wrapper.get(".pnw-sidebar-block-head-toggle").trigger("click");
    expect(wrapper.classes()).toContain("pnw-sidebar-block--collapsed");
    expect(wrapper.get(".pnw-sidebar-block-body").attributes("style")).toContain("display: none");
    await wrapper.get(".pnw-sidebar-block-head-toggle").trigger("click");
    expect(wrapper.get(".pnw-sidebar-block-body").isVisible()).toBe(true);
    expect(wrapper.findAll(".pnw-sidebar-block-body")).toHaveLength(1);
  });
  it("keeps non-collapsible cards open even with expanded false", () => {
    const wrapper = mount(PnwSidebarBlock, { props: { title: "属性", variant: "card", collapsible: false, expanded: false }, slots: { default: "正文" } });
    expect(wrapper.get(".pnw-sidebar-block-body").isVisible()).toBe(true);
    expect(wrapper.classes()).not.toContain("pnw-sidebar-block--collapsed");
  });
});
