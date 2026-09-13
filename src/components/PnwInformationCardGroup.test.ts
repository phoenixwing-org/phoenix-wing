// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { PnwInformationCardGroupDefinition } from "../types/PnwInformationCardGroup.js";
import PnwInformationCardGroup from "./PnwInformationCardGroup.vue";

const PNW_GROUP: PnwInformationCardGroupDefinition = {
  id: "runtime-cards",
  ariaLabel: "运行信息卡片",
  cards: [
    {
      id: "runtime",
      title: "运行环境",
      status: "Ready",
      items: [{ id: "version", label: "版本", value: "0.7.0" }],
    },
    {
      id: "adapter",
      title: "Host Adapter",
      collapsible: true,
      defaultExpanded: false,
      items: [{ id: "mode", label: "模式", value: "local", note: "由 Host DTO 提供" }],
    },
  ],
};

describe("PnwInformationCardGroup", () => {
  it("仅凭 DTO 渲染多卡片，默认卡片不可折叠且组具备 ARIA", () => {
    const wrapper = mount(PnwInformationCardGroup, {
      props: { definition: PNW_GROUP },
    });

    expect(wrapper.attributes("role")).toBe("region");
    expect(wrapper.attributes("aria-label")).toBe("运行信息卡片");
    expect(wrapper.attributes("data-pnw-information-card-group-id")).toBe("runtime-cards");
    expect(wrapper.findAll(".pnw-information-card-group-card")).toHaveLength(2);
    expect(wrapper.findAll(".pnw-information-block-toggle")).toHaveLength(1);
    expect(wrapper.text()).toContain("运行环境");
    expect(wrapper.text()).toContain("Host Adapter");
  });

  it("仅为显式可折叠卡片提供受控状态和 scoped slots", async () => {
    const wrapper = mount(PnwInformationCardGroup, {
      props: { definition: PNW_GROUP, expandedCardIds: [] },
      slots: {
        "card-header": ({ card }: { card: PnwInformationCardGroupDefinition["cards"][number] }) => h(
          "strong", { class: "custom-card-header" }, card.id,
        ),
        "card-item": ({ item }: { item: PnwInformationCardGroupDefinition["cards"][number]["items"][number] }) => h(
          "p", { class: "custom-card-item" }, `${item.label}:${item.value}`,
        ),
      },
    });

    expect(wrapper.findAll(".custom-card-header")).toHaveLength(2);
    expect(wrapper.findAll(".custom-card-item")).toHaveLength(2);
    const toggle = wrapper.get(".pnw-information-block-toggle");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    await toggle.trigger("click");
    expect(wrapper.emitted("update:expandedCardIds")).toEqual([[["adapter"]]]);
    expect(wrapper.emitted("toggle")).toEqual([[{ cardId: "adapter", expanded: true }]]);
  });

  it("SSR 与 auto-fit、inset、主题 token、窄容器 CSS 契约保持稳定", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(PnwInformationCardGroup, { definition: PNW_GROUP }),
    }));
    const source = readFileSync("src/components/PnwInformationCardGroup.vue", "utf8")
      .replace(/\r\n/g, "\n");
    const cardSource = readFileSync("src/components/PnwInformationBlock.vue", "utf8")
      .replace(/\r\n/g, "\n");

    expect(html).toContain("aria-label=\"运行信息卡片\"");
    expect(html).toContain("data-pnw-information-card-group-id=\"runtime-cards\"");
    expect(source).toContain("repeat(\n    auto-fit");
    expect(source).toContain("min(100%, var(--pnw-information-card-min-width, 240px))");
    expect(source).toContain("--pnw-information-card-group-padding, 8px 12px");
    expect(source).toContain("--pnw-information-card-group-gap, 8px");
    expect(source).toContain("box-sizing: border-box");
    expect(source).not.toContain("@media");
    expect(cardSource).toContain("--pnw-workbench-surface");
    expect(cardSource).toContain("--pnw-workbench-border");
  });
});
