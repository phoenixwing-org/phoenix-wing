// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import type { PnwInformationBlockDefinition } from "../types/PnwInformationBlock.js";
import PnwInformationBlock from "./PnwInformationBlock.vue";

const PNW_DEFINITION: PnwInformationBlockDefinition = {
  id: "runtime",
  title: "运行信息",
  status: "Ready",
  defaultExpanded: false,
  items: [
    { id: "version", label: "版本", value: "0.7.0" },
    { id: "mode", label: "模式", value: "local", note: "由 Host 自有 DTO 提供" },
  ],
};

describe("PnwInformationBlock", () => {
  it("渲染中立 DTO，并以原生按钮提供默认折叠和 ARIA", async () => {
    const wrapper = mount(PnwInformationBlock, {
      props: { definition: PNW_DEFINITION },
    });

    const toggle = wrapper.get(".pnw-information-block-toggle");
    const content = wrapper.get(".pnw-information-block-content");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(toggle.attributes("aria-controls")).toBe(content.attributes("id"));
    expect(content.attributes("style")).toContain("display: none");
    expect(wrapper.text()).toContain("Ready");

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(wrapper.emitted("update:expanded")).toEqual([[true]]);
    expect(wrapper.findAll(".pnw-information-block-item")).toHaveLength(2);
    expect(wrapper.text()).toContain("由 Host 自有 DTO 提供");
  });

  it("支持受控开合、不可折叠与 header/item/footer slots", async () => {
    const wrapper = mount(PnwInformationBlock, {
      props: { definition: PNW_DEFINITION, expanded: true },
      slots: {
        header: ({ definition }: { definition: PnwInformationBlockDefinition }) => h(
          "strong", { class: "custom-header" }, definition.id,
        ),
        item: ({ item }: { item: PnwInformationBlockDefinition["items"][number] }) => h(
          "p", { class: "custom-item" }, `${item.label}:${item.value}`,
        ),
        footer: "自定义页脚",
      },
    });

    expect(wrapper.get(".custom-header").text()).toBe("runtime");
    expect(wrapper.findAll(".custom-item")).toHaveLength(2);
    expect(wrapper.get(".pnw-information-block-footer").text()).toBe("自定义页脚");
    await wrapper.get(".pnw-information-block-toggle").trigger("click");
    expect(wrapper.emitted("update:expanded")).toEqual([[false]]);
    expect(wrapper.get(".pnw-information-block-toggle").attributes("aria-expanded")).toBe("true");

    await wrapper.setProps({ collapsible: false, expanded: false });
    expect(wrapper.find(".pnw-information-block-toggle").exists()).toBe(false);
    expect(wrapper.find(".pnw-information-block-static-header").exists()).toBe(true);
    expect(wrapper.get(".pnw-information-block-content").attributes("style") ?? "").not.toContain("display: none");
  });

  it("SSR 输出稳定 section、definition identity 与定义列表", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(PnwInformationBlock, {
        definition: { ...PNW_DEFINITION, defaultExpanded: true },
      }),
    }));

    expect(html).toContain("data-pnw-information-block-id=\"runtime\"");
    expect(html).toContain("<dl");
    expect(html).toContain("版本");
    expect(html).toContain("aria-expanded=\"true\"");
  });
});
