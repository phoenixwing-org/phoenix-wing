// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mount } from "@vue/test-utils";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import PnwPrimaryPanel from "./PnwPrimaryPanel.vue";
import PnwPrimarySection from "./PnwPrimarySection.vue";

const PNW_PRIMARY_PANEL_SOURCE = readFileSync(
  resolve(process.cwd(), "src/layout/PnwPrimaryPanel.vue"),
  "utf8",
);
const PNW_PRIMARY_SECTION_SOURCE = readFileSync(
  resolve(process.cwd(), "src/layout/PnwPrimarySection.vue"),
  "utf8",
);

describe("PnwPrimaryPanel", () => {
  it("SSR 输出稳定的 Primary/Section 结构和无障碍状态", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(PnwPrimaryPanel, { title: "BOM Primary" }, {
        default: () => h(PnwPrimarySection, { title: "搜索与排序" }, {
          default: () => "Section body",
        }),
      }),
    }));

    expect(html).toContain("pnw-primary-panel");
    expect(html).toContain("pnw-sidebar-block--body-inset-none");
    expect(html).toContain('aria-label="BOM Primary"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("Section body");
  });

  it("提供无 inset、零 gap、满宽且可滚动的 Primary 内容容器", () => {
    const wrapper = mount(PnwPrimaryPanel, {
      props: { title: "BOM Primary" },
      slots: {
        summary: "当前对象摘要",
        default: "Primary content",
      },
    });

    expect(wrapper.get(".pnw-sidebar-block").classes()).toContain("pnw-sidebar-block--body-inset-none");
    expect(wrapper.get(".pnw-sidebar-block").classes()).toContain("pnw-sidebar-block--body-scroll");
    expect(wrapper.get(".pnw-primary-panel-summary").text()).toBe("当前对象摘要");
    expect(wrapper.get(".pnw-primary-panel-content").text()).toBe("Primary content");
    expect(PNW_PRIMARY_PANEL_SOURCE).toMatch(
      /\.pnw-primary-panel-content\s*\{[\s\S]*?gap:\s*0;[\s\S]*?width:\s*100%;[\s\S]*?padding:\s*0;/u,
    );
    expect(PNW_PRIMARY_PANEL_SOURCE).toContain("--pnw-workbench-view-header-height, 40px");
    expect(PNW_PRIMARY_PANEL_SOURCE).not.toContain("--pnw-primary-panel-header-end-safe-area");
  });
});

describe("PnwPrimarySection", () => {
  it("默认可折叠并在非受控模式切换正文和两个事件", async () => {
    const wrapper = mount(PnwPrimarySection, {
      props: { title: "搜索与排序" },
      slots: { default: "Section body" },
    });

    const toggle = wrapper.get("button.pnw-primary-section-toggle");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(toggle.element.firstElementChild?.classList.contains("pnw-expand-twistie")).toBe(true);
    expect(wrapper.get(".pnw-primary-section-body").isVisible()).toBe(true);

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(wrapper.get(".pnw-primary-section-body").attributes("style")).toContain("display: none");
    expect(wrapper.emitted("update:expanded")).toEqual([[false]]);
    expect(wrapper.emitted("toggle")).toEqual([[false]]);
  });

  it("受控状态只发出请求并由 Host 更新后展开", async () => {
    const wrapper = mount(PnwPrimarySection, {
      props: { title: "统计", expanded: false },
      slots: { body: "Statistics" },
    });

    await wrapper.get("button.pnw-primary-section-toggle").trigger("click");
    expect(wrapper.emitted("update:expanded")).toEqual([[true]]);
    expect(wrapper.get("button").attributes("aria-expanded")).toBe("false");

    await wrapper.setProps({ expanded: true });
    expect(wrapper.get("button").attributes("aria-expanded")).toBe("true");
    expect(wrapper.get(".pnw-primary-section-body").isVisible()).toBe(true);
  });

  it("支持不可折叠、suffix/actions/body slots 且 actions 不属于折叠按钮", () => {
    const wrapper = mount(PnwPrimarySection, {
      props: { title: "固定信息", collapsible: false },
      slots: {
        suffix: "3",
        actions: "Action",
        body: "Readonly body",
      },
    });

    expect(wrapper.find("button").exists()).toBe(false);
    expect(wrapper.get(".pnw-primary-section-static-title").text()).toContain("固定信息");
    expect(wrapper.get(".pnw-primary-section-suffix").text()).toBe("3");
    expect(wrapper.get(".pnw-primary-section-actions").text()).toBe("Action");
    expect(wrapper.get(".pnw-primary-section-body").text()).toBe("Readonly body");
  });

  it("冻结 BOM 金样本的标题条尺寸、动画与主题 token", () => {
    expect(PNW_PRIMARY_SECTION_SOURCE).toMatch(
      /\.pnw-primary-section-header\s*\{[\s\S]*?min-height:\s*28px;/u,
    );
    expect(PNW_PRIMARY_SECTION_SOURCE).toMatch(
      /\.pnw-primary-section-toggle,[\s\S]*?padding:\s*4px 8px;/u,
    );
    expect(PNW_PRIMARY_SECTION_SOURCE).toContain("--pnw-workbench-border");
    expect(PNW_PRIMARY_SECTION_SOURCE).toContain("--pnw-control-hover-bg");
    expect(PNW_PRIMARY_SECTION_SOURCE).toContain("--pnw-focus-ring");
  });
});
