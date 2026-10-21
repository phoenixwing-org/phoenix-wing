// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PnwWorkbenchLayoutState } from "../types/PnwWorkbenchWeb.js";
import PnwWorkbenchLayout from "./PnwWorkbenchLayout.vue";

let pnwOuterWidth = 3840, pnwViewWidth = 3840, pnwViewHeight = 1200;
let pnwResizeCallback: ResizeObserverCallback | undefined;
const pnwObserved: Element[] = [];
const pnwWrappers: Array<{ unmount(): void }> = [];
const pnwDisconnected = vi.fn();

beforeEach(() => {
  pnwOuterWidth = 3840; pnwViewWidth = 3840; pnwViewHeight = 1200;
  pnwObserved.length = 0; pnwResizeCallback = undefined; pnwDisconnected.mockReset();
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: ResizeObserverCallback) { pnwResizeCallback = callback; }
    observe(element: Element) { pnwObserved.push(element); }
    unobserve() {}
    disconnect() { pnwDisconnected(); }
  });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("pnw-workbench-main") ? pnwViewWidth
      : this.classList.contains("pnw-workbench-layout") ? pnwOuterWidth : 0;
  });
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("pnw-workbench-main") ? pnwViewHeight : 0;
  });
});

afterEach(() => {
  pnwWrappers.splice(0).forEach(wrapper => wrapper.unmount());
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

function pnwMount(sizes = { primaryWidth: 2000, secondaryWidth: 400, bottomHeight: 240 }, secondary = false) {
  const layoutState: PnwWorkbenchLayoutState = {
    visibility: { primary: true, secondary, bottom: true }, sizes,
  };
  const wrapper = mount(PnwWorkbenchLayout, {
    props: { layoutState, contributions: { primary: true, secondary, bottom: true } },
    slots: {
      default: "Editor", primary: "Primary", secondary: "Secondary", bottom: "Bottom",
      header: () => [], activity: () => [], "view-tabs": () => [],
      "bottom-summary": () => [], footer: () => [],
    },
  });
  pnwWrappers.push(wrapper);
  return wrapper;
}

async function pnwObserveResize() {
  pnwResizeCallback?.([], {} as ResizeObserver);
  await nextTick();
}

describe("PnwWorkbench Primary responsive resize", () => {
  it("uses the measured View for the 4K maximum and agrees with keyboard and pointer resizing", async () => {
    const wrapper = pnwMount(); await nextTick();
    const handle = wrapper.get(".pnw-workbench-resize-handle--primary");
    expect(handle.attributes("aria-valuemax")).toBe("2304");
    expect(handle.attributes("aria-valuenow")).toBe("2000");
    await handle.trigger("keydown", { key: "End" });
    const keyboard = wrapper.emitted("update:layoutState")!.at(-1)![0] as PnwWorkbenchLayoutState;
    expect(keyboard.sizes.primaryWidth).toBe(2304);
    await handle.trigger("pointerdown", { button: 0, pointerId: 7, clientX: 2000 });
    await handle.trigger("pointermove", { pointerId: 7, clientX: 10000 });
    await handle.trigger("pointerup", { pointerId: 7 });
    const pointer = wrapper.emitted("update:layoutState")!.at(-1)![0] as PnwWorkbenchLayoutState;
    expect(pointer.sizes.primaryWidth).toBe(keyboard.sizes.primaryWidth);
    expect(document.body.style.cursor).toBe("");
  });

  it("observes Tree-driven View changes, clamps presentation only and restores the saved wide preference", async () => {
    const wrapper = pnwMount(); await nextTick();
    expect(pnwObserved).toContain(wrapper.element);
    expect(pnwObserved).toContain(wrapper.get(".pnw-workbench-main").element);
    pnwViewWidth = 2500;
    await pnwObserveResize();
    expect(wrapper.get(".pnw-workbench-primary-region").attributes("style")).toContain("1500px");
    expect(wrapper.get(".pnw-workbench-resize-handle--primary").attributes("aria-valuemax")).toBe("1500");
    expect(wrapper.emitted("update:layoutState")).toBeUndefined();
    pnwViewWidth = 3840;
    await pnwObserveResize();
    expect(wrapper.get(".pnw-workbench-primary-region").attributes("style")).toContain("2000px");
    expect(wrapper.emitted("update:layoutState")).toBeUndefined();
    wrapper.unmount();
    expect(pnwDisconnected).toHaveBeenCalledOnce();
    pnwWrappers.pop();
  });

  it("uses the same effective Editor/Secondary budget for aria and End without overwriting other preferences", async () => {
    pnwViewWidth = 1000;
    const wrapper = pnwMount({ primaryWidth: 2000, secondaryWidth: 500, bottomHeight: 240 }, true);
    await nextTick();
    const primary = wrapper.get(".pnw-workbench-resize-handle--primary");
    expect(primary.attributes("aria-valuemax")).toBe("520");
    expect(primary.attributes("aria-valuenow")).toBe("520");
    await primary.trigger("keydown", { key: "End" });
    const resized = wrapper.emitted("update:layoutState")!.at(-1)![0] as PnwWorkbenchLayoutState;
    expect(resized.sizes).toEqual({ primaryWidth: 520, secondaryWidth: 500, bottomHeight: 240 });
    await wrapper.get(".pnw-workbench-resize-handle--bottom").trigger("keydown", { key: "ArrowUp" });
    const bottom = wrapper.emitted("update:layoutState")!.at(-1)![0] as PnwWorkbenchLayoutState;
    expect(bottom.sizes).toEqual({ primaryWidth: 2000, secondaryWidth: 500, bottomHeight: 252 });
  });

  it("toggles visibility without saving a temporarily constrained Primary width", async () => {
    pnwViewWidth = 1000;
    const wrapper = pnwMount(); await nextTick();
    const exposed = wrapper.vm as unknown as { toggleBlock(blockId: "primary"): void };
    exposed.toggleBlock("primary");
    const state = wrapper.emitted("update:layoutState")!.at(-1)![0] as PnwWorkbenchLayoutState;
    expect(state.visibility.primary).toBe(false);
    expect(state.sizes.primaryWidth).toBe(2000);
    await wrapper.setProps({ layoutState: state });
    pnwViewWidth = 3840; await pnwObserveResize();
    exposed.toggleBlock("primary");
    const reopened = wrapper.emitted("update:layoutState")!.at(-1)![0] as PnwWorkbenchLayoutState;
    expect(reopened.visibility.primary).toBe(true);
    expect(reopened.sizes.primaryWidth).toBe(2000);
  });

  it("does not invent a viewport or retain a 560px aria ceiling when layout is not measurable", async () => {
    pnwViewWidth = 0; pnwOuterWidth = 0;
    const wrapper = pnwMount({ primaryWidth: 1300, secondaryWidth: 280, bottomHeight: 240 });
    await nextTick();
    expect(wrapper.get(".pnw-workbench-primary-region").attributes("style")).toContain("1300px");
    expect(wrapper.get(".pnw-workbench-resize-handle--primary").attributes("aria-valuemax")).toBeUndefined();
  });
});
