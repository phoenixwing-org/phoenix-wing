// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { h, nextTick } from "vue";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import PnwTabContainer from "./PnwTabContainer.vue";

const PNW_TEST_TABS = [
  { id: "first", title: "First" },
  { id: "disabled", title: "Disabled", disabled: true },
  { id: "last", title: "Last" },
] as const;

describe("PnwTabContainer", () => {
  it("页签栏只使用已定义的 Workbench 明暗主题 token", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "src/components/PnwTabContainer.vue"),
      "utf8",
    );

    expect(source).toContain(
      "var(--pnw-tab-list-bg, var(--pnw-workbench-bg, var(--pnw-workbench-default-bg, #f8fafc)))",
    );
    expect(source).not.toContain("--pnw-workbench-chrome");
    expect(source).not.toContain("--pnw-workbench-default-chrome");
  });

  it("提供受控活动页签与完整 tablist/tab/tabpanel 关系", async () => {
    const wrapper = mount(PnwTabContainer, {
      props: {
        tabs: PNW_TEST_TABS,
        activeTabId: "first",
        ariaLabel: "Content views",
      },
      slots: {
        default: ({ tab }: { tab: { id: string } }) => h("span", tab.id),
      },
    });

    const tabList = wrapper.get('[role="tablist"]');
    expect(tabList.attributes("aria-label")).toBe("Content views");
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(3);
    expect(tabs[0].attributes("aria-selected")).toBe("true");
    expect(tabs[0].attributes("aria-controls")).toBe(
      wrapper.get('[data-pnw-tab-panel-id="first"]').attributes("id"),
    );
    expect(wrapper.findAll('[role="tabpanel"]')).toHaveLength(3);

    await tabs[2].trigger("click");
    expect(wrapper.emitted("update:activeTabId")?.at(-1)).toEqual(["last"]);
    expect(wrapper.emitted("change")?.at(-1)).toEqual(["last", "first", "pointer"]);
    expect(tabs[0].attributes("aria-selected")).toBe("true");

    await wrapper.setProps({ activeTabId: "last" });
    expect(wrapper.get('[data-pnw-tab-id="last"]').attributes("aria-selected")).toBe("true");
    expect(wrapper.get('[data-pnw-tab-panel-id="first"]').attributes()).toHaveProperty("hidden");
    expect(wrapper.get('[data-pnw-tab-panel-id="last"]').attributes()).not.toHaveProperty("hidden");
  });

  it("不同原始页签 ID 始终生成无碰撞的 ARIA DOM ID", () => {
    const wrapper = mount(PnwTabContainer, {
      props: {
        tabs: [
          { id: "a b", title: "Encoded" },
          { id: "a-20-b", title: "Literal" },
        ],
        activeTabId: "a b",
      },
    });

    const tabs = wrapper.findAll('[role="tab"]');
    const panels = wrapper.findAll('[role="tabpanel"]');
    expect(tabs[0].attributes("id")).not.toBe(tabs[1].attributes("id"));
    expect(panels[0].attributes("id")).not.toBe(panels[1].attributes("id"));
    expect(tabs[0].attributes("aria-controls")).toBe(panels[0].attributes("id"));
    expect(tabs[1].attributes("aria-controls")).toBe(panels[1].attributes("id"));
  });

  it("首次延迟挂载，并在切换后保留已挂载 DOM 与未保存输入", async () => {
    const wrapper = mount(PnwTabContainer, {
      props: {
        tabs: PNW_TEST_TABS,
        activeTabId: "first",
        lazyMount: true,
      },
      slots: {
        default: ({ tab }: { tab: { id: string } }) => h("div", [
          h("input", { "data-input-id": tab.id }),
          h("iframe", { "data-frame-id": tab.id, title: tab.id }),
        ]),
      },
    });

    expect(wrapper.findAll('[role="tabpanel"]')).toHaveLength(1);
    const firstInput = wrapper.get('[data-input-id="first"]');
    const firstFrame = wrapper.get('[data-frame-id="first"]');
    await firstInput.setValue("unsaved draft");

    await wrapper.get('[data-pnw-tab-id="last"]').trigger("click");
    await wrapper.setProps({ activeTabId: "last" });
    expect(wrapper.findAll('[role="tabpanel"]')).toHaveLength(2);

    await wrapper.get('[data-pnw-tab-id="first"]').trigger("click");
    await wrapper.setProps({ activeTabId: "first" });
    const restoredInput = wrapper.get('[data-input-id="first"]');
    expect(restoredInput.element).toBe(firstInput.element);
    expect(wrapper.get('[data-frame-id="first"]').element).toBe(firstFrame.element);
    expect((restoredInput.element as HTMLInputElement).value).toBe("unsaved draft");
  });

  it("用方向键循环并跳过 disabled 页签", async () => {
    const wrapper = mount(PnwTabContainer, {
      attachTo: document.body,
      props: {
        tabs: PNW_TEST_TABS,
        activeTabId: "first",
      },
    });

    await wrapper.get('[data-pnw-tab-id="first"]').trigger("keydown", { key: "ArrowRight" });
    await nextTick();
    expect(wrapper.emitted("change")?.at(-1)).toEqual(["last", "first", "keyboard"]);
    expect(document.activeElement).toBe(wrapper.get('[data-pnw-tab-id="last"]').element);

    await wrapper.setProps({ activeTabId: "last" });
    await wrapper.get('[data-pnw-tab-id="last"]').trigger("keydown", { key: "Home" });
    await nextTick();
    expect(wrapper.emitted("update:activeTabId")?.at(-1)).toEqual(["first"]);
    expect(document.activeElement).toBe(wrapper.get('[data-pnw-tab-id="first"]').element);
    wrapper.unmount();
  });

  it("禁用页签不发送切换事件", async () => {
    const wrapper = mount(PnwTabContainer, {
      props: {
        tabs: PNW_TEST_TABS,
        activeTabId: "first",
      },
    });
    await wrapper.get('[data-pnw-tab-id="disabled"]').trigger("click");
    expect(wrapper.emitted("change")).toBeUndefined();
  });
});
