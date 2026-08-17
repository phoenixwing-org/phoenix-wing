// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { pnwApplyColorScheme } from "../utils/pnwColorScheme.js";
import PnwSelect from "./PnwSelect.vue";

const PNW_OPTIONS = [
  { value: "draft", label: "草稿" },
  { value: "blocked", label: "已阻塞", disabled: true },
  { value: "ready", label: "一个很长的、需要在紧凑 Header 中省略的就绪状态" },
] as const;

afterEach(() => {
  document.body.innerHTML = "";
  pnwApplyColorScheme("light");
  vi.unstubAllGlobals();
});

describe("PnwSelect", () => {
  it("通过 v-model string 选择简单枚举并输出 listbox ARIA", async () => {
    const wrapper = mount(PnwSelect, {
      attachTo: document.body,
      props: {
        modelValue: "draft",
        options: PNW_OPTIONS,
        ariaLabel: "状态",
      },
    });
    const trigger = wrapper.get(".pnw-select-trigger");

    expect(trigger.attributes("role")).toBe("combobox");
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(trigger.text()).toContain("草稿");
    await trigger.trigger("click");

    const listbox = document.body.querySelector('[role="listbox"]');
    const options = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')];
    expect(listbox?.closest<HTMLElement>("[data-pnw-overlay-theme-root]")?.dataset.pnwColorScheme)
      .toBe("light");
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(options).toHaveLength(3);
    expect(options[0]?.getAttribute("aria-selected")).toBe("true");
    expect(options[1]?.getAttribute("aria-disabled")).toBe("true");

    options[1]?.click();
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    options[2]?.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("update:modelValue")).toEqual([["ready"]]);
    expect(document.body.querySelector('[role="listbox"]')).toBeNull();
    wrapper.unmount();
  });

  it("Arrow/Home/End 跳过 disabled，Enter 选择且焦点留在 trigger", async () => {
    const wrapper = mount(PnwSelect, {
      attachTo: document.body,
      props: { modelValue: "draft", options: PNW_OPTIONS },
    });
    const trigger = wrapper.get(".pnw-select-trigger");
    (trigger.element as HTMLButtonElement).focus();
    await trigger.trigger("keydown", { key: "ArrowDown" });
    await trigger.trigger("keydown", { key: "ArrowDown" });

    expect(trigger.attributes("aria-activedescendant")).toContain("option-2");
    await trigger.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")).toEqual([["ready"]]);
    expect(document.activeElement).toBe(trigger.element);
    wrapper.unmount();
  });

  it("支持 compact、placeholder、disabled，禁用时不创建浮层", async () => {
    const wrapper = mount(PnwSelect, {
      attachTo: document.body,
      props: {
        modelValue: "",
        options: PNW_OPTIONS,
        placeholder: "选择状态",
        size: "compact",
        disabled: true,
      },
    });
    expect(wrapper.classes()).toContain("pnw-select--compact");
    expect(wrapper.get(".pnw-select-value").text()).toBe("选择状态");
    expect(wrapper.get(".pnw-select-trigger").attributes()).toHaveProperty("disabled");
    await wrapper.get(".pnw-select-trigger").trigger("click");
    expect(document.body.querySelector('[role="listbox"]')).toBeNull();
    wrapper.unmount();
  });

  it("Home/End 定位可用项，Escape 关闭且不改变值", async () => {
    const wrapper = mount(PnwSelect, {
      attachTo: document.body,
      props: { modelValue: "draft", options: PNW_OPTIONS },
    });
    const trigger = wrapper.get(".pnw-select-trigger");
    await trigger.trigger("click");
    await trigger.trigger("keydown", { key: "End" });
    expect(trigger.attributes("aria-activedescendant")).toContain("option-2");
    await trigger.trigger("keydown", { key: "Home" });
    expect(trigger.attributes("aria-activedescendant")).toContain("option-0");
    await trigger.trigger("keydown", { key: "Escape" });
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    wrapper.unmount();
  });

  it("Teleport 菜单跟随 Host 的 dark/system 解析主题并保留长文本 title", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => true,
    }));
    const wrapper = mount(PnwSelect, {
      attachTo: document.body,
      props: {
        modelValue: "ready",
        options: PNW_OPTIONS,
        colorScheme: "system",
      },
    });
    expect(wrapper.get(".pnw-select-value").attributes("title")).toBe(PNW_OPTIONS[2].label);
    expect(wrapper.attributes("data-pnw-color-scheme")).toBe("dark");
    await wrapper.get(".pnw-select-trigger").trigger("click");
    const themeRoot = document.body.querySelector<HTMLElement>("[data-pnw-overlay-theme-root]");
    expect(themeRoot?.dataset.pnwColorScheme).toBe("dark");
    expect(themeRoot?.querySelector(".pnw-select-menu")).not.toBeNull();
    wrapper.unmount();
  });
});
