// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { pnwCreateFloatingWindowStack } from "../utils/pnwFloatingWindowStack.js";
import PnwFloatingPanel from "./PnwFloatingPanel.vue";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("PnwFloatingPanel resize", () => {
  it("resize hit areas stay inside the clipped panel", () => {
    const source = readFileSync("src/components/PnwFloatingPanel.vue", "utf8");
    const directions = {
      north: ["top"], south: ["bottom"], east: ["right"], west: ["left"],
      "north-east": ["top", "right"], "south-east": ["bottom", "right"],
      "south-west": ["bottom", "left"], "north-west": ["top", "left"],
    };
    for (const [direction, edges] of Object.entries(directions)) {
      const rules = [...source.matchAll(new RegExp(`\\.pnw-floating-panel__resize-handle--${direction}\\s*\\{([^}]+)\\}`, "g"))];
      expect(rules.length).toBeGreaterThan(0);
      const rule = rules.map(match => match[1]).join("\n");
      for (const edge of edges) expect(rule).toMatch(new RegExp(`${edge}:\\s*0;`));
    }
  });
  it("header controls retain pointer events while blank header space remains draggable", () => {
    const wrapper = mount(PnwFloatingPanel, {
      attachTo: document.body,
      props: { open: true, position: { x: 20, y: 20 }, title: 'Controls' },
      slots: { header: '<button><span>Action</span></button><input><a href="#fixture">Link</a><div role="slider">Slider</div><div contenteditable="true">Edit</div>' },
    });
    const header = document.body.querySelector<HTMLElement>('.pnw-floating-panel__header')!;
    for (const selector of ['button span', 'input', 'a', '[role="slider"]', '[contenteditable]']) {
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 });
      header.querySelector(selector)!.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(document.body.style.cursor).not.toBe('move');
    }
    const drag = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 });
    header.dispatchEvent(drag);
    expect(drag.defaultPrevented).toBe(true);
    expect(document.body.style.cursor).toBe('move');
    header.dispatchEvent(new PointerEvent('pointerup'));
    wrapper.unmount();
  });
  it("resizable 输出八向可聚焦手柄与语义名称", () => {
    const wrapper = mount(PnwFloatingPanel, {
      attachTo: document.body,
      props: {
        open: true,
        position: { x: 48, y: 72 },
        size: { width: 640, height: 480 },
        resizable: true,
        title: "Fixture panel",
      },
    });

    const handles = document.body.querySelectorAll("[data-pnw-resize-direction]");
    expect(handles).toHaveLength(8);
    expect(document.body.querySelector(
      '[data-pnw-resize-direction="south-east"]',
    )?.getAttribute("aria-label")).toBe("向右下调整浮动面板大小");
    expect(document.body.querySelector(".pnw-floating-panel")?.getAttribute("aria-modal")).toBeNull();
    wrapper.unmount();
  });

  it("键盘方向键按受控 bounds 更新尺寸，Shift 使用大步长", async () => {
    const wrapper = mount(PnwFloatingPanel, {
      attachTo: document.body,
      props: {
        open: true,
        position: { x: 48, y: 72 },
        size: { width: 640, height: 480 },
        resizable: true,
        minSize: { width: 360, height: 240 },
        title: "Fixture panel",
      },
    });
    const handle = document.body.querySelector<HTMLElement>(
      '[data-pnw-resize-direction="south-east"]',
    );
    expect(handle).not.toBeNull();
    handle?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    handle?.dispatchEvent(new KeyboardEvent("keydown", {
      key: "ArrowDown",
      shiftKey: true,
      bubbles: true,
    }));
    await wrapper.vm.$nextTick();

    const bounds = wrapper.emitted("update:bounds");
    expect(bounds?.[0]?.[0]).toMatchObject({ size: { width: 644, height: 480 } });
    expect(bounds?.[1]?.[0]).toMatchObject({ size: { width: 644, height: 496 } });
    wrapper.unmount();
  });

  it("horizontal 只呈现左右手柄，推荐尺寸可一键恢复", async () => {
    const wrapper = mount(PnwFloatingPanel, {
      attachTo: document.body,
      props: {
        open: true,
        position: { x: 20, y: 20 },
        size: { width: 520, height: 360 },
        resizable: "horizontal",
        recommendedSize: { width: 640, height: 480 },
      },
    });
    expect([...document.body.querySelectorAll<HTMLElement>("[data-pnw-resize-direction]")]
      .map((handle) => handle.dataset.pnwResizeDirection)).toEqual(["east", "west"]);
    await wrapper.vm.$nextTick();
    const reset = document.body.querySelector<HTMLButtonElement>(".pnw-floating-panel__reset-size");
    expect(reset?.disabled).toBe(false);
    await reset?.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("resetToRecommendedSize")?.[0]?.[0]).toEqual({
      width: 640,
      height: 480,
    });
    wrapper.unmount();
  });

  it("推荐尺寸已恢复时禁用，受控尺寸改变后重新启用", async () => {
    const wrapper = mount(PnwFloatingPanel, {
      attachTo: document.body,
      props: {
        open: true,
        position: { x: 20, y: 20 },
        size: { width: 640, height: 480 },
        resizable: true,
        recommendedSize: { width: 640, height: 480 },
      },
    });
    await wrapper.vm.$nextTick();
    const reset = document.body.querySelector<HTMLButtonElement>(".pnw-floating-panel__reset-size");
    expect(reset?.disabled).toBe(true);
    expect(reset?.getAttribute("aria-label")).toBe("恢复推荐尺寸");

    await wrapper.setProps({ size: { width: 720, height: 520 } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(reset?.disabled).toBe(false);
    wrapper.unmount();
  });

  it("共享栈按 pointer/focus 置顶，Escape 只关闭活动窗口", async () => {
    const stack = pnwCreateFloatingWindowStack();
    const first = mount(PnwFloatingPanel, {
      attachTo: document.body,
      props: {
        open: true,
        position: { x: 20, y: 20 },
        presentationId: "tool:resource",
        stack,
      },
    });
    const second = mount(PnwFloatingPanel, {
      attachTo: document.body,
      props: {
        open: true,
        position: { x: 40, y: 40 },
        presentationId: "view:analysis",
        stack,
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await second.vm.$nextTick();
    expect(stack.snapshot().activePresentationId).toBe("view:analysis");
    const firstPanel = document.body.querySelector<HTMLElement>(
      '[data-pnw-presentation-id="tool:resource"]',
    );
    const secondPanel = document.body.querySelector<HTMLElement>(
      '[data-pnw-presentation-id="view:analysis"]',
    );
    expect(secondPanel?.dataset.pnwFloatingActive).toBe("true");
    firstPanel?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await first.vm.$nextTick();
    expect(firstPanel?.dataset.pnwFloatingActive).toBe("true");
    expect(secondPanel?.dataset.pnwFloatingActive).toBe("false");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await first.vm.$nextTick();
    expect(first.emitted("close")).toHaveLength(1);
    expect(second.emitted("close")).toBeUndefined();
    first.unmount();
    second.unmount();
  });

  it("默认不增加 resize 手柄，保持既有消费者兼容", () => {
    const wrapper = mount(PnwFloatingPanel, {
      attachTo: document.body,
      props: {
        open: true,
        position: { x: 20, y: 20 },
        title: "Compat panel",
      },
    });
    expect(document.body.querySelectorAll("[data-pnw-resize-direction]")).toHaveLength(0);
    wrapper.unmount();
  });

  it("允许 owner 用明确图标和名称替代有歧义的 X", () => {
    const wrapper = mount(PnwFloatingPanel, {
      attachTo: document.body,
      props: {
        open: true,
        position: { x: 20, y: 20 },
        title: "Detached View",
        closeIcon: "editor-restore",
        closeLabel: "收回到 Editor",
      },
    });
    const action = document.body.querySelector<HTMLButtonElement>(".pnw-floating-panel__close");
    expect(action?.getAttribute("aria-label")).toBe("收回到 Editor");
    expect(action?.getAttribute("title")).toBe("收回到 Editor");
    expect(action?.querySelector("svg")).not.toBeNull();
    wrapper.unmount();
  });
});
