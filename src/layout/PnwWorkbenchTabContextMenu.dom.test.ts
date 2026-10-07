// @vitest-environment happy-dom
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import PnwWorkbenchTabBar from "./PnwWorkbenchTabBar.vue";
import PnwWorkbenchTabContextMenu from "./PnwWorkbenchTabContextMenu.vue";
import type { PnwWorkbenchTabAction } from "../utils/pnwWorkbenchTabActions.js";

const PNW_ACTIONS: PnwWorkbenchTabAction[] = ["refresh", "close", "close-others", "close-right", "close-all"];
const PNW_TABS = ["a", "b", "c"].map(id => ({ id, pageId: "example", title: id, dirty: false }));
let pnwWrapper: VueWrapper;
function pnwMount(props = {}) {
  pnwWrapper = mount(PnwWorkbenchTabBar, { attachTo: document.body, props: {
    tabs: PNW_TABS, activeTabId: "a", tabContextActions: PNW_ACTIONS, ...props,
  } });
  return pnwWrapper;
}
function pnwItem(action: string) { return document.querySelector<HTMLButtonElement>(`[data-pnw-tab-action="${action}"]`)!; }
function pnwMenu() { return document.querySelector<HTMLElement>('[role="menu"]'); }
async function pnwOpen(index = 1, keyboard = false) {
  const tab = pnwWrapper.findAll('[role="tab"]')[index];
  await tab.trigger(keyboard ? "keydown" : "contextmenu", keyboard ? { key: "F10", shiftKey: true } : { clientX: 120, clientY: 80 });
  await nextTick();
}
async function pnwKey(key: string) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  document.activeElement!.dispatchEvent(event); await nextTick(); return event;
}
afterEach(() => { pnwWrapper?.unmount(); document.body.innerHTML = ""; vi.restoreAllMocks(); });

describe("workbench tab context menu DOM", () => {
  it("is opt-in and leaves the native context menu untouched by default", async () => {
    const wrapper = pnwMount({ tabContextActions: [] });
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    wrapper.get('[role="tab"]').element.dispatchEvent(event); await nextTick();
    expect(event.defaultPrevented).toBe(false); expect(pnwMenu()).toBeNull();
    expect(wrapper.get('[role="tab"]').attributes("aria-haspopup")).toBeUndefined();
  });
  it.each(PNW_ACTIONS)("emits %s against the right-clicked inactive tab, never selects or mutates", async action => {
    const wrapper = pnwMount(); await pnwOpen();
    expect(wrapper.findAll('[role="tab"]')[1].attributes("aria-expanded")).toBe("true");
    pnwItem(action).click(); await nextTick();
    expect(wrapper.emitted("tabAction")).toEqual([[{ action, tabId: "b" }]]);
    expect(wrapper.emitted("select")).toBeUndefined(); expect(wrapper.findAll('[role="tab"]')).toHaveLength(3);
    expect(pnwMenu()).toBeNull(); expect(document.activeElement).toBe(wrapper.findAll('[role="tab"]')[1].element);
  });
  it("supports keyboard wrap, skips disabled actions, Home/End and Escape focus restoration", async () => {
    const wrapper = pnwMount({ tabActionDisabled: ({ action }: { action: string }) => action === "close" });
    await pnwOpen(1, true); expect(document.activeElement).toBe(pnwItem("refresh"));
    await pnwKey("ArrowDown"); expect(document.activeElement).toBe(pnwItem("close-others"));
    await pnwKey("End"); expect(document.activeElement).toBe(pnwItem("close-all"));
    await pnwKey("ArrowDown"); expect(document.activeElement).toBe(pnwItem("refresh"));
    await pnwKey("ArrowUp"); expect(document.activeElement).toBe(pnwItem("close-all"));
    await pnwKey("Home"); expect(document.activeElement).toBe(pnwItem("refresh"));
    expect((await pnwKey("Escape")).defaultPrevented).toBe(true);
    expect(pnwMenu()).toBeNull(); expect(document.activeElement).toBe(wrapper.findAll('[role="tab"]')[1].element);
  });
  it("keeps the all-disabled menu escapable and repairs focus when availability changes", async () => {
    const wrapper = pnwMount({ closingAll: true }); await pnwOpen(1, true);
    expect(document.activeElement).toBe(pnwMenu());
    pnwItem("close").click(); expect(wrapper.emitted("tabAction")).toBeUndefined();
    await wrapper.setProps({ closingAll: false }); expect(document.activeElement).toBe(pnwItem("refresh"));
    await wrapper.setProps({ closingAll: true }); expect(document.activeElement).toBe(pnwMenu());
    await pnwKey("Escape"); expect(pnwMenu()).toBeNull();
  });
  it("supports ContextMenu key and Tab dismissal without trapping normal tab order", async () => {
    const wrapper = pnwMount();
    await wrapper.findAll('[role="tab"]')[1].trigger("keydown", { key: "ContextMenu" }); await nextTick();
    expect(pnwMenu()).not.toBeNull();
    expect((await pnwKey("Tab")).defaultPrevented).toBe(false);
    expect(pnwMenu()).toBeNull(); expect(document.activeElement).toBe(wrapper.findAll('[role="tab"]')[1].element);
  });
  it("disables empty batch ranges, deduplicates and rechecks current opt-in/host policy", async () => {
    const wrapper = pnwMount({ tabContextActions: [...PNW_ACTIONS, "close"] }); await pnwOpen(2);
    expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(5);
    expect(pnwItem("close-right").disabled).toBe(true);
    await wrapper.setProps({ tabContextActions: ["refresh"], tabActionDisabled: () => true });
    wrapper.getComponent(PnwWorkbenchTabContextMenu).vm.$emit("action", "close");
    wrapper.getComponent(PnwWorkbenchTabContextMenu).vm.$emit("action", "refresh");
    expect(wrapper.emitted("tabAction")).toBeUndefined();
    await wrapper.setProps({ tabContextActions: [] }); expect(pnwMenu()).toBeNull();
  });
  it("restores a remaining tab after the host removes the target, without stealing host focus", async () => {
    const wrapper = pnwMount(); await pnwOpen();
    pnwItem("close").click(); await wrapper.setProps({ tabs: [PNW_TABS[0], PNW_TABS[2]] }); await nextTick();
    expect(document.activeElement).toBe(wrapper.get('[role="tab"]').element);
    await pnwOpen(1);
    const hostInput = document.createElement("input"); document.body.append(hostInput);
    pnwItem("close").click(); hostInput.focus(); await wrapper.setProps({ tabs: [PNW_TABS[0]] }); await nextTick();
    expect(document.activeElement).toBe(hostInput);
  });
  it("closes a stale target and clamps the teleported menu to the viewport", async () => {
    const wrapper = pnwMount();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 224, height: 200 } as DOMRect);
    await wrapper.get('[role="tab"]').trigger("contextmenu", { clientX: 9999, clientY: 9999 }); await nextTick();
    expect(pnwMenu()!.style.left).toBe(`${window.innerWidth - 232}px`);
    expect(pnwMenu()!.style.top).toBe(`${window.innerHeight - 208}px`);
    await wrapper.setProps({ tabs: [PNW_TABS[1], PNW_TABS[2]], activeTabId: "b" }); await nextTick();
    expect(pnwMenu()).toBeNull(); expect(document.activeElement).toBe(wrapper.get('[role="tab"]').element);
  });
  it("focuses only after viewport clamping without scrolling the page", async () => {
    pnwMount();
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    await pnwOpen(); await nextTick();
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(pnwItem("refresh"));
    await pnwKey("Escape");
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
  });
  it("closes on outside pointer/scroll/resize and removes listeners after unmount", async () => {
    pnwMount(); await pnwOpen();
    pnwMenu()!.dispatchEvent(new Event("scroll")); expect(pnwMenu()).not.toBeNull();
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })); await nextTick(); expect(pnwMenu()).toBeNull();
    await pnwOpen(); document.dispatchEvent(new Event("scroll")); await nextTick(); expect(pnwMenu()).toBeNull();
    await pnwOpen(); window.dispatchEvent(new Event("resize")); await nextTick(); expect(pnwMenu()).toBeNull();
    await pnwOpen(); const removeDocument = vi.spyOn(document, "removeEventListener"); const removeWindow = vi.spyOn(window, "removeEventListener");
    pnwWrapper.unmount(); expect(pnwMenu()).toBeNull();
    expect(removeDocument).toHaveBeenCalledWith("pointerdown", expect.any(Function), true);
    expect(removeDocument).toHaveBeenCalledWith("scroll", expect.any(Function), true);
    expect(removeWindow).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
