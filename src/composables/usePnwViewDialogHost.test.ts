// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import type { PnwViewDialogRendererContext } from "../types/PnwViewDialogHost.js";
import {
  pnwCreateViewDialogHost,
  pnwIsSerializableViewDialogValue,
  pnwProvideViewDialogHost,
  usePnwViewDialogHost,
} from "./usePnwViewDialogHost.js";
import PnwViewDialogHost from "../components/PnwViewDialogHost.vue";

afterEach(() => {
  document.body.innerHTML = "";
});

const PnwFixtureRenderer = defineComponent({
  name: "PnwFixtureViewDialogRenderer",
  props: {
    dialog: {
      type: Object as () => PnwViewDialogRendererContext<{ label: string }, { saved: boolean }>,
      required: true,
    },
  },
  setup(props) {
    return () => h("div", { class: "pnw-fixture-renderer" }, [
      h("span", props.dialog.props.label),
      h("button", {
        class: "pnw-fixture-submit",
        onClick: () => props.dialog.submit({ saved: true }),
      }, "提交"),
      h("button", {
        class: "pnw-fixture-cancel",
        onClick: () => props.dialog.cancel(),
      }, "取消"),
    ]);
  },
});

function pnwRequest(requestId = "fixture.edit") {
  return {
    requestId,
    rendererId: "fixture.editor",
    viewId: "fixture",
    title: "编辑 Fixture",
    props: { label: "可序列化内容" },
    colorScheme: "dark" as const,
  };
}

describe("PnwViewDialogHost", () => {
  it("renderer registry + 全局 Host 提交结构化 result，浮窗无 aria-modal", async () => {
    const host = pnwCreateViewDialogHost();
    host.registerRenderer({ rendererId: "fixture.editor", component: PnwFixtureRenderer });
    const wrapper = mount(PnwViewDialogHost, {
      attachTo: document.body,
      props: { controller: host },
    });
    const outcome = host.open(pnwRequest());
    await nextTick();

    expect(document.body.querySelector(".pnw-fixture-renderer")?.textContent)
      .toContain("可序列化内容");
    expect(document.body.querySelector(".pnw-floating-panel")?.getAttribute("aria-modal"))
      .toBeNull();
    expect(document.body.querySelector(".pnw-overlay-theme-root")?.getAttribute("data-pnw-color-scheme"))
      .toBe("dark");
    document.body.querySelector<HTMLButtonElement>(".pnw-fixture-submit")?.click();
    await expect(outcome).resolves.toEqual({ status: "submitted", value: { saved: true } });
    await nextTick();
    expect(host.activeDialogs()).toHaveLength(0);
    wrapper.unmount();
  });

  it("取消、窗口 X、父 View 销毁和 Host 卸载均恰好 settle", async () => {
    const host = pnwCreateViewDialogHost({ maxOpenDialogs: 4 });
    host.registerRenderer({
      rendererId: "fixture.editor",
      component: PnwFixtureRenderer,
      resizable: false,
    });
    const wrapper = mount(PnwViewDialogHost, {
      attachTo: document.body,
      props: { controller: host },
    });

    const cancelled = host.open(pnwRequest("fixture.cancel"));
    await nextTick();
    document.body.querySelector<HTMLButtonElement>(".pnw-fixture-cancel")?.click();
    await expect(cancelled).resolves.toEqual({ status: "closed", reason: "cancelled" });

    const windowClosed = host.open(pnwRequest("fixture.window"));
    await nextTick();
    document.body.querySelector<HTMLButtonElement>(".pnw-floating-panel__close")?.click();
    await expect(windowClosed).resolves.toEqual({ status: "closed", reason: "window-close" });

    const parentClosed = host.open(pnwRequest("fixture.parent"));
    await nextTick();
    await host.closeByView("fixture");
    await expect(parentClosed).resolves.toEqual({ status: "closed", reason: "parent-close" });

    const unmounted = host.open(pnwRequest("fixture.unmount"));
    await nextTick();
    wrapper.unmount();
    await expect(unmounted).resolves.toEqual({ status: "closed", reason: "parent-close" });
  });

  it("多个实例使用统一栈，Escape 只关闭当前活动浮窗", async () => {
    const host = pnwCreateViewDialogHost({ maxOpenDialogs: 3 });
    host.registerRenderer({ rendererId: "fixture.editor", component: PnwFixtureRenderer });
    const wrapper = mount(PnwViewDialogHost, {
      attachTo: document.body,
      props: { controller: host },
    });
    const first = host.open({
      ...pnwRequest("fixture.first"),
      instanceKey: "first",
    });
    const second = host.open({
      ...pnwRequest("fixture.second"),
      instanceKey: "second",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();
    const panels = [...document.body.querySelectorAll<HTMLElement>(".pnw-floating-panel")];
    expect(panels).toHaveLength(2);
    expect(panels[1]?.dataset.pnwFloatingActive).toBe("true");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await expect(second).resolves.toEqual({ status: "closed", reason: "window-close" });
    expect(host.activeDialogs().map((entry) => entry.request.requestId)).toEqual(["fixture.first"]);
    await host.closeAll("programmatic");
    await first;
    wrapper.unmount();
  });

  it("同 owner 的不同 renderer 可并存，稳定身份重复打开只聚焦并复用结果", async () => {
    const host = pnwCreateViewDialogHost({ maxOpenDialogs: 4 });
    host.registerRenderer({ rendererId: "fixture.editor", component: PnwFixtureRenderer });
    host.registerRenderer({ rendererId: "fixture.preview", component: PnwFixtureRenderer });
    const wrapper = mount(PnwViewDialogHost, {
      attachTo: document.body,
      props: { controller: host },
    });
    const editor = host.open(pnwRequest("fixture.editor.open"));
    const preview = host.open({
      ...pnwRequest("fixture.preview.open"),
      rendererId: "fixture.preview",
    });
    await nextTick();
    expect(host.activeDialogs()).toHaveLength(2);

    const repeated = host.open({
      ...pnwRequest("fixture.editor.repeated"),
      // requestId 可由调用者重新签发，但 owner/renderer/instance 身份仍指向已打开实例。
    });
    await nextTick();
    expect(host.activeDialogs()).toHaveLength(2);
    expect(host.activeDialogs().find((entry) => (
      entry.request.requestId === "fixture.editor.open"
    ))?.focusRevision).toBe(1);

    host.submit("fixture.editor.open", { saved: true });
    await expect(Promise.all([editor, repeated])).resolves.toEqual([
      { status: "submitted", value: { saved: true } },
      { status: "submitted", value: { saved: true } },
    ]);
    await host.close("fixture.preview.open", "parent-close");
    await preview;
    wrapper.unmount();
  });

  it("最后一个窗口关闭后恢复触发点焦点", async () => {
    const trigger = document.createElement("button");
    trigger.textContent = "打开编辑器";
    document.body.append(trigger);
    trigger.focus();
    const host = pnwCreateViewDialogHost();
    host.registerRenderer({ rendererId: "fixture.editor", component: PnwFixtureRenderer });
    const wrapper = mount(PnwViewDialogHost, { attachTo: document.body, props: { controller: host } });
    const outcome = host.open(pnwRequest("fixture.focus"));
    await nextTick();
    document.body.querySelector<HTMLElement>(".pnw-floating-panel")?.focus();
    await host.close("fixture.focus", "window-close");
    await outcome;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(trigger);
    wrapper.unmount();
  });

  it("拒绝未注册 renderer、非 JSON props 和重复注册", async () => {
    const host = pnwCreateViewDialogHost();
    expect(pnwIsSerializableViewDialogValue({ ok: [1, "two", true, null] })).toBe(true);
    expect(pnwIsSerializableViewDialogValue({ callback: () => undefined })).toBe(false);
    expect(pnwIsSerializableViewDialogValue(new Date())).toBe(false);
    await expect(host.open(pnwRequest())).resolves.toMatchObject({
      status: "failed",
      code: "invalid-request",
    });
    host.registerRenderer({ rendererId: "fixture.editor", component: PnwFixtureRenderer });
    expect(() => host.registerRenderer({
      rendererId: "fixture.editor",
      component: PnwFixtureRenderer,
    })).toThrow("already registered");
    await expect(host.open({
      ...pnwRequest(),
      props: { callback: () => undefined },
    })).resolves.toMatchObject({ status: "failed", code: "invalid-request" });
  });

  it("provide/use 返回唯一 controller，缺失时立即失败", () => {
    const host = pnwCreateViewDialogHost();
    let injected: unknown;
    const Child = defineComponent({
      setup() {
        injected = usePnwViewDialogHost();
        return () => h("span");
      },
    });
    const Root = defineComponent({
      setup() {
        pnwProvideViewDialogHost(host);
        return () => h(Child);
      },
    });
    const wrapper = mount(Root);
    expect(injected).toBe(host);
    wrapper.unmount();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      expect(() => mount(defineComponent({
        setup() {
          usePnwViewDialogHost();
          return () => h("span");
        },
      }))).toThrow("需在已提供 PnwViewDialogHost");
    } finally {
      warning.mockRestore();
    }
  });

  it("renderer 注销会关闭其仍存活请求", async () => {
    const host = pnwCreateViewDialogHost();
    const unregister = host.registerRenderer({
      rendererId: "fixture.editor",
      component: PnwFixtureRenderer,
    });
    const wrapper = mount(PnwViewDialogHost, { attachTo: document.body, props: { controller: host } });
    const outcome = host.open(pnwRequest("fixture.unregister"));
    await nextTick();
    unregister();
    await expect(outcome).resolves.toEqual({ status: "closed", reason: "parent-close" });
    expect(host.activeDialogs()).toHaveLength(0);
    wrapper.unmount();
  });
});
