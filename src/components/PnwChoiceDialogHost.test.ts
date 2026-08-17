// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import {
  pnwChoiceDialogOpen,
  pnwChoiceDialogRequest,
  pnwResolveChoice,
} from "../composables/pnwChoiceDialog.js";
import PnwChoiceDialogHost from "./PnwChoiceDialogHost.vue";

async function pnwFlushDialogFocus(): Promise<void> {
  await nextTick();
  await nextTick();
}

afterEach(() => {
  pnwResolveChoice(null);
  document.body.innerHTML = "";
});

describe("PnwChoiceDialogHost focus contract", () => {
  it("动态请求打开后聚焦 defaultChoiceId，关闭后恢复触发元素", async () => {
    const trigger = document.createElement("button");
    trigger.textContent = "关闭工作空间";
    document.body.append(trigger);
    trigger.focus();
    const wrapper = mount(PnwChoiceDialogHost, { attachTo: document.body });

    pnwChoiceDialogRequest.value = {
      title: "确认关闭",
      message: "关闭当前工作空间？",
      choices: [
        { id: "confirm", label: "关闭", variant: "danger" },
        { id: "cancel", label: "取消", variant: "default" },
      ],
      defaultChoiceId: "cancel",
    };
    pnwChoiceDialogOpen.value = true;
    await pnwFlushDialogFocus();

    expect((document.activeElement as HTMLElement).dataset.pnwChoiceId).toBe("cancel");

    pnwResolveChoice(null);
    await pnwFlushDialogFocus();
    expect(document.activeElement).toBe(trigger);
    wrapper.unmount();
  });

  it("替换请求时重新聚焦安全动作，缺失默认值时优先取消", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const wrapper = mount(PnwChoiceDialogHost, { attachTo: document.body });

    pnwChoiceDialogRequest.value = {
      title: "第一请求",
      message: "第一请求",
      choices: [{ id: "ok", label: "确定", variant: "primary" }],
      defaultChoiceId: "ok",
    };
    pnwChoiceDialogOpen.value = true;
    await pnwFlushDialogFocus();
    expect((document.activeElement as HTMLElement).dataset.pnwChoiceId).toBe("ok");

    pnwChoiceDialogRequest.value = {
      title: "替换请求",
      message: "替换请求",
      choices: [
        { id: "danger", label: "删除", variant: "danger" },
        { id: "cancel", label: "取消", variant: "default" },
      ],
      defaultChoiceId: "missing",
    };
    await pnwFlushDialogFocus();
    expect((document.activeElement as HTMLElement).dataset.pnwChoiceId).toBe("cancel");

    wrapper.unmount();
  });

  it("Tab 保持在对话框内，Escape 只关闭当前请求并恢复焦点", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const wrapper = mount(PnwChoiceDialogHost, { attachTo: document.body });

    pnwChoiceDialogRequest.value = {
      title: "选择",
      message: "选择动作",
      choices: [
        { id: "confirm", label: "确认", variant: "primary" },
        { id: "cancel", label: "取消", variant: "default" },
      ],
      defaultChoiceId: "cancel",
    };
    pnwChoiceDialogOpen.value = true;
    await pnwFlushDialogFocus();

    const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-pnw-choice-id]")];
    buttons.at(-1)?.focus();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(buttons[0]);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await pnwFlushDialogFocus();
    expect(pnwChoiceDialogOpen.value).toBe(false);
    expect(document.activeElement).toBe(trigger);
    wrapper.unmount();
  });
});
