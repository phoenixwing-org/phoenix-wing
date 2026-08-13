// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createSSRApp, h, type Component } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";
import type {
  PnwDockableToolDefinition,
  PnwDockableToolState,
} from "../types/PnwDockableTool.js";
import PnwDockableToolWindow from "./PnwDockableToolWindow.vue";
import PnwFloatingPanel from "./PnwFloatingPanel.vue";
import PnwDockablePrimarySection from "../layout/PnwDockablePrimarySection.vue";

const PNW_TOOL_DEFINITION = {
  id: "fixture.tool",
  title: "Fixture 工具",
  scope: "application",
} as const satisfies PnwDockableToolDefinition;

const PNW_PRIMARY_STATE: PnwDockableToolState = {
  mode: "primary",
  floatingPosition: { x: 48, y: 72 },
  primaryPlacement: "last",
  primaryExpanded: true,
};

afterEach(() => {
  document.body.innerHTML = "";
});

async function pnwRenderWithTeleports(
  component: Component,
  props: Record<string, unknown>,
): Promise<string> {
  const context: SSRContext = {};
  const html = await renderToString(createSSRApp({
    render: () => h(component, props, { default: () => "Tool content" }),
  }), context);
  return html + Object.values(context.teleports ?? {}).join("");
}

describe("PnwDockableToolWindow", () => {
  it("只在 floating 模式呈现并复用 dark Teleport 主题根", async () => {
    const hiddenHtml = await pnwRenderWithTeleports(PnwDockableToolWindow, {
      definition: PNW_TOOL_DEFINITION,
      state: PNW_PRIMARY_STATE,
      colorScheme: "dark",
    });
    const floatingHtml = await pnwRenderWithTeleports(PnwDockableToolWindow, {
      definition: PNW_TOOL_DEFINITION,
      state: { ...PNW_PRIMARY_STATE, mode: "floating" },
      colorScheme: "dark",
    });

    expect(hiddenHtml).not.toContain("pnw-floating-panel");
    expect(floatingHtml).toContain("pnw-dockable-tool-window");
    expect(floatingHtml).toContain('data-pnw-color-scheme="dark"');
    expect(floatingHtml).toContain("停靠到 Primary");
    expect(floatingHtml).toContain("Tool content");
  });

  it("浮窗停靠、关闭与拖动都只发出受控新状态", async () => {
    const wrapper = mount(PnwDockableToolWindow, {
      attachTo: document.body,
      props: {
        definition: PNW_TOOL_DEFINITION,
        state: { ...PNW_PRIMARY_STATE, mode: "floating" },
      },
      slots: { default: "Tool body" },
    });

    await document.body.querySelector<HTMLButtonElement>(
      '[aria-label="停靠到 Primary"]',
    )?.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("update:state")?.[0]?.[0]).toMatchObject({ mode: "primary" });
    expect(wrapper.props("state").mode).toBe("floating");

    wrapper.findComponent(PnwFloatingPanel).vm.$emit(
      "update:position",
      { x: 208, y: 144 },
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("update:state")?.[1]?.[0]).toMatchObject({
      floatingPosition: { x: 208, y: 144 },
    });
    expect(wrapper.emitted("update:position")).toEqual([[{ x: 208, y: 144 }]]);

    await document.body.querySelector<HTMLButtonElement>(
      '.pnw-floating-panel__close',
    )?.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("update:state")?.[2]?.[0]).toMatchObject({ mode: "closed" });
    expect(wrapper.emitted("close")).toHaveLength(1);

    wrapper.unmount();
  });
});

describe("PnwDockablePrimarySection", () => {
  it("标题栏含首尾移动、浮出与 X 关闭动作", async () => {
    const wrapper = mount(PnwDockablePrimarySection, {
      props: {
        definition: PNW_TOOL_DEFINITION,
        state: PNW_PRIMARY_STATE,
      },
      slots: { default: "Primary tool body" },
    });

    expect(wrapper.attributes("data-pnw-primary-placement")).toBe("last");
    expect(wrapper.get(".pnw-primary-section-body").text()).toBe("Primary tool body");

    await wrapper.get('[aria-label="移动到 Primary 首部"]').trigger("click");
    await wrapper.get('[aria-label="浮出工具"]').trigger("click");
    await wrapper.get('[aria-label="关闭工具"]').trigger("click");

    expect(wrapper.emitted("update:state")?.[0]?.[0]).toMatchObject({
      primaryPlacement: "first",
    });
    expect(wrapper.emitted("update:state")?.[1]?.[0]).toMatchObject({ mode: "floating" });
    expect(wrapper.emitted("update:state")?.[2]?.[0]).toMatchObject({ mode: "closed" });
    expect(wrapper.emitted("move")).toEqual([["first"]]);
    expect(wrapper.emitted("float")).toHaveLength(1);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("折叠状态完全受控并通过统一状态机更新", async () => {
    const wrapper = mount(PnwDockablePrimarySection, {
      props: {
        definition: PNW_TOOL_DEFINITION,
        state: PNW_PRIMARY_STATE,
      },
      slots: { default: "Primary tool body" },
    });

    await wrapper.get(".pnw-primary-section-toggle").trigger("click");
    expect(wrapper.emitted("update:state")?.[0]?.[0]).toMatchObject({
      primaryExpanded: false,
    });
    expect(wrapper.get(".pnw-primary-section-toggle").attributes("aria-expanded")).toBe("true");
  });

  it("view 作用域离开 owner View 暂时隐藏，返回后恢复同一状态", async () => {
    const definition = {
      id: "view.tool",
      title: "View 工具",
      scope: "view",
      ownerViewId: "bom.parts",
    } as const satisfies PnwDockableToolDefinition;
    const wrapper = mount(PnwDockablePrimarySection, {
      props: {
        definition,
        state: { ...PNW_PRIMARY_STATE, primaryExpanded: false },
        activeViewId: "dashboard",
      },
    });

    expect(wrapper.find(".pnw-primary-section").exists()).toBe(false);
    await wrapper.setProps({ activeViewId: "bom.parts" });
    expect(wrapper.get(".pnw-primary-section-toggle").attributes("aria-expanded")).toBe("false");
    expect(wrapper.attributes("data-pnw-primary-placement")).toBe("last");
  });
});
