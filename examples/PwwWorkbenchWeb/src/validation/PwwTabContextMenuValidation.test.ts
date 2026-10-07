// @vitest-environment happy-dom
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import { PnwWorkbenchShell } from "phoenix-wing";
import PwwTabContextMenuValidation from "./PwwTabContextMenuValidation.vue";

let pwwWrapper: VueWrapper;
function pwwMount() { pwwWrapper = mount(PwwTabContextMenuValidation, { attachTo: document.body }); return pwwWrapper; }
async function pwwOpen(id = "b") {
  const tab = pwwWrapper.findAll('[role="tab"]').find(item => item.text().startsWith(`示例 ${id.toUpperCase()}`))!;
  await tab.trigger("contextmenu", { clientX: 100, clientY: 100 }); await flushPromises();
}
async function pwwAction(action: string) {
  document.querySelector<HTMLButtonElement>(`[data-pnw-tab-action="${action}"]`)!.click(); await flushPromises();
}
afterEach(() => { pwwWrapper?.unmount(); document.body.innerHTML = ""; });
describe("public-entry tab-menu example", () => {
  it.each(["header", "after-navigation", "editor-bottom"])("forwards actions through Shell in %s placement", async placement => {
    const wrapper = pwwMount(); await wrapper.get('[aria-label="标签位置"]').setValue(placement);
    await pwwOpen(); await pwwAction("refresh");
    expect(wrapper.get('[data-pww-active]').text()).toContain("a");
    expect(wrapper.get('[data-pww-refresh="b"]').text()).toContain("1");
    expect(wrapper.get('[data-pww-refresh="a"]').text()).toContain("0");
    expect(wrapper.get('[data-pww-action-log]').text()).toContain("refresh @ b → [b]");
    await pwwOpen(); await pwwAction("close-right");
    expect(wrapper.get('[data-pww-tabs]').text()).toBe("剩余标签：a, b");
    await pwwOpen(); await pwwAction("close-others");
    expect(wrapper.get('[data-pww-tabs]').text()).toBe("剩余标签：b");
    expect(wrapper.get('[data-pww-active]').text()).toContain("b");
    await pwwOpen(); await pwwAction("close-all");
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(0);
    expect(document.activeElement?.textContent).toBe("重置示例");
  });
  it("protects dirty/busy targets at both UI and host execution boundaries", async () => {
    const wrapper = pwwMount();
    await wrapper.findAll('input[type="checkbox"]')[1].setValue(true);
    await pwwOpen("a");
    expect(document.querySelector<HTMLButtonElement>('[data-pnw-tab-action="close-others"]')!.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('[data-pnw-tab-action="refresh"]')!.disabled).toBe(false);
    wrapper.getComponent(PnwWorkbenchShell).vm.$emit("tabAction", { action: "close-all", tabId: "a" }); await nextTick();
    expect(wrapper.get('[data-pww-tabs]').text()).toBe("剩余标签：a, b, c");
    expect(wrapper.get('[data-pww-action-log]').text()).toContain("已阻止");
    await wrapper.findAll('input[type="checkbox"]')[2].setValue(true); await nextTick();
    expect([...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].every(item => item.disabled)).toBe(true);
    wrapper.getComponent(PnwWorkbenchShell).vm.$emit("tabAction", { action: "refresh", tabId: "a" }); await nextTick();
    expect(wrapper.get('[data-pww-refresh="a"]').text()).toContain("0");
  });
  it("supports English menu labels and disables opt-in without changing tabs", async () => {
    const wrapper = pwwMount(); await wrapper.get('[aria-label="菜单语言"]').setValue("en-US");
    await pwwOpen(); expect(document.querySelector('[role="menu"]')!.textContent).toContain("Close");
    await wrapper.findAll('input[type="checkbox"]')[0].setValue(false); await flushPromises();
    expect(document.querySelector('[role="menu"]')).toBeNull();
    await pwwOpen(); expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(wrapper.get('[data-pww-tabs]').text()).toBe("剩余标签：a, b, c");
  });
});
