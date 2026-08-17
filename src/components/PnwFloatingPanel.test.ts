// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { pnwCreateFloatingWindowStack } from "../utils/pnwFloatingWindowStack.js";
import PnwFloatingPanel from "./PnwFloatingPanel.vue";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("PnwFloatingPanel resize", () => {
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
    await document.body.querySelector<HTMLButtonElement>(".pnw-floating-panel__reset-size")?.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("resetToRecommendedSize")?.[0]?.[0]).toEqual({
      width: 640,
      height: 480,
    });
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
});
