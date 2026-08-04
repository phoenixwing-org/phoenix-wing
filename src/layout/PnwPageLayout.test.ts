// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mount } from "@vue/test-utils";
import { h } from "vue";
import { describe, expect, it } from "vitest";
import PnwPageLayout from "./PnwPageLayout.vue";
import PnwPageMainBlock from "./PnwPageMainBlock.vue";
import PnwWorkbenchLayout from "./PnwWorkbenchLayout.vue";

const PNW_PAGE_LAYOUT_SOURCE = readFileSync(
  resolve(process.cwd(), "src/layout/PnwPageLayout.vue"),
  "utf8",
);

describe("PnwPageLayout", () => {
  it("组合零 inset Header/Body 与默认 10px MainBlock", () => {
    const wrapper = mount(PnwPageLayout, {
      props: { title: "用户列表", subtitle: "COOL" },
      slots: {
        actions: "刷新",
        default: "CRUD body",
      },
    });

    expect(wrapper.get(".pnw-page-head").text()).toContain("用户列表");
    expect(wrapper.get(".pnw-page-head").text()).toContain("COOL");
    expect(wrapper.get(".pnw-head-actions").text()).toBe("刷新");
    expect(wrapper.get(".pnw-page-layout-body").text()).toBe("CRUD body");
    expect(wrapper.findComponent(PnwPageMainBlock).exists()).toBe(true);
    expect(wrapper.classes()).toContain("pnw-page-layout--body-scroll");
    expect(wrapper.classes()).not.toContain("pnw-page-layout--body-inset-none");
    expect(PNW_PAGE_LAYOUT_SOURCE).toMatch(
      /\.pnw-page-layout\s*\{[\s\S]*?margin:\s*0;[\s\S]*?padding:\s*0;/u,
    );
    expect(PNW_PAGE_LAYOUT_SOURCE).toMatch(
      /\.pnw-page-layout-body\s*\{[\s\S]*?padding:\s*0;/u,
    );
    expect(PNW_PAGE_LAYOUT_SOURCE).toMatch(/bodyInset:\s*true/u);
    expect(PNW_PAGE_LAYOUT_SOURCE).toMatch(
      /<div class="pnw-page-layout-body">[\s\S]*?<PnwPageMainBlock v-if="bodyInset">[\s\S]*?<slot \/>[\s\S]*?<\/PnwPageMainBlock>/u,
    );
  });

  it("允许已有完整 MainBlock 的消费者关闭默认 inset 和内部滚动", () => {
    const wrapper = mount(PnwPageLayout, {
      props: {
        title: "自定义画布",
        bodyInset: false,
        bodyScroll: false,
      },
      slots: { default: "Canvas" },
    });

    expect(wrapper.classes()).toContain("pnw-page-layout--body-inset-none");
    expect(wrapper.classes()).not.toContain("pnw-page-layout--body-scroll");
    expect(wrapper.findComponent(PnwPageMainBlock).exists()).toBe(false);
    expect(wrapper.get(".pnw-page-layout-body").text()).toBe("Canvas");
  });

  it("Primary 开关在 Editor Header 原位发出受控布局事件", async () => {
    const wrapper = mount(PnwWorkbenchLayout, {
      props: {
        contributions: { primary: true },
        visibility: { primary: true, bottom: false, secondary: false },
      },
      slots: {
        default: () => h(PnwPageLayout, { title: "用户列表" }, () => "CRUD"),
        header: () => [],
        activity: () => [],
        "view-tabs": () => [],
        primary: () => h("aside", "Primary"),
        bottom: () => [],
        "bottom-summary": () => [],
        secondary: () => [],
        footer: () => [],
      },
    });

    const toggle = wrapper.get("[data-pnw-workbench-primary-toggle]");
    expect(toggle.attributes("data-pnw-primary-toggle-placement")).toBe("editor-header");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(wrapper.get(".pnw-workbench-editor").attributes("data-pnw-primary-available")).toBe("true");

    await toggle.trigger("click");
    expect(wrapper.emitted("toggle")).toEqual([["primary"]]);
    expect(wrapper.emitted("update:visibility")?.[0]).toEqual([{
      primary: false,
      bottom: false,
      secondary: false,
    }]);

    await wrapper.setProps({
      visibility: { primary: false, bottom: false, secondary: false },
    });
    expect(wrapper.get("[data-pnw-workbench-primary-toggle]").attributes("aria-expanded")).toBe("false");
  });
});
