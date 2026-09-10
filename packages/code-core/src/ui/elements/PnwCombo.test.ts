// @vitest-environment happy-dom
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  PNW_COMBO_ACTION,
  PnwCombo,
  pnwCodeDefineCombo,
  pnwNormalizeComboModel,
  type PnwComboActionDetail,
  type PnwComboModel,
} from "./PnwCombo.js";

const PNW_TEST_COMBO_TAG = "pnw-combo-test";

const PNW_TEST_COMBO_MODEL: PnwComboModel = {
  ariaLabel: "选择方案",
  placeholder: "最近方案…",
  emptyText: "暂无方案",
  items: [
    { id: "local", label: "本机方案", group: "本机", removable: true },
    {
      id: "shared",
      label: "共享方案",
      group: "共享",
      removable: false,
      removeDisabledReason: "共享方案不能删除",
    },
  ],
  selectedId: "local",
  disabled: false,
  clearEnabled: true,
  clearLabel: "全部清空",
};

function pnwMountCombo(parent: HTMLElement = document.body): PnwCombo {
  const combo = document.createElement(PNW_TEST_COMBO_TAG) as PnwCombo;
  parent.append(combo);
  combo.model = PNW_TEST_COMBO_MODEL;
  return combo;
}

beforeAll(() => {
  pnwCodeDefineCombo(PNW_TEST_COMBO_TAG);
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("PnwCombo", () => {
  it("保留 200 个有效唯一项上限，并只允许清空可删除项", () => {
    const items = Array.from({ length: 205 }, (_, index) => ({
      id: `item-${index}`, label: `条目 ${index}`, removable: false,
    }));
    const model = pnwNormalizeComboModel({
      ...PNW_TEST_COMBO_MODEL,
      selectedId: "item-204",
      items: [{ id: "", label: "无效", removable: true }, items[0]!, ...items],
    });
    expect(model.items).toHaveLength(200);
    expect(model.items.at(-1)?.id).toBe("item-199");
    expect(model.items.every(Object.isFrozen)).toBe(true);
    expect(model.selectedId).toBeUndefined();
    expect(model.clearEnabled).toBe(false);
  });

  it("规范化、去重并冻结 Host 投影", () => {
    const normalized = pnwNormalizeComboModel({
      ...PNW_TEST_COMBO_MODEL,
      selectedId: "missing",
      items: [
        ...PNW_TEST_COMBO_MODEL.items,
        { id: "local", label: "重复", removable: true },
      ],
    });

    expect(normalized.items.map(({ id }) => id)).toEqual(["local", "shared"]);
    expect(normalized.selectedId).toBeUndefined();
    expect(Object.isFrozen(normalized)).toBe(true);
    expect(Object.isFrozen(normalized.items)).toBe(true);
  });

  it("每行保留删除位置，共享项禁用删除，底部提供全部清空", () => {
    const combo = pnwMountCombo();
    const removeButtons = combo.shadowRoot?.querySelectorAll<HTMLButtonElement>(
      ".pnw-combo-remove",
    );

    expect(removeButtons).toHaveLength(2);
    expect(removeButtons?.[0]?.disabled).toBe(false);
    expect(removeButtons?.[1]?.disabled).toBe(true);
    expect(removeButtons?.[1]?.title).toBe("共享方案不能删除");
    expect(removeButtons?.[1]?.getAttribute("aria-label")).toContain("共享方案不能删除");
    const trigger = combo.shadowRoot?.querySelector<HTMLButtonElement>(".pnw-combo-trigger");
    const list = combo.shadowRoot?.querySelector('[role="listbox"]');
    expect(trigger?.getAttribute("aria-controls")).toBe(list?.id);
    expect(list?.getAttribute("aria-label")).toBe("选择方案");
    expect(combo.shadowRoot?.querySelector(".pnw-combo-clear")?.textContent)
      .toBe("全部清空");
  });

  it("只发送 select/remove/clear 语义事件", () => {
    const combo = pnwMountCombo();
    const actions: PnwComboActionDetail[] = [];
    combo.addEventListener(PNW_COMBO_ACTION, (event) => {
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
      actions.push((event as CustomEvent<PnwComboActionDetail>).detail);
    });

    combo.shadowRoot?.querySelectorAll<HTMLButtonElement>(".pnw-combo-select")[1]?.click();
    combo.shadowRoot?.querySelector<HTMLButtonElement>(".pnw-combo-trigger")?.click();
    combo.shadowRoot?.querySelector<HTMLButtonElement>(".pnw-combo-remove")?.click();
    combo.shadowRoot?.querySelector<HTMLButtonElement>(".pnw-combo-clear")?.click();

    expect(actions).toEqual([
      { kind: "select", itemId: "shared" },
      { kind: "remove", itemId: "local" },
      { kind: "clear" },
    ]);
    expect(actions.every(Object.isFrozen)).toBe(true);
    expect(PnwCombo.toString()).not.toMatch(
      /acquireVsCodeApi|postMessage|workspaceState|localStorage|projectRename|searchReplace/iu,
    );
  });

  it("选择与清空关闭后返回触发器，Host 的后续焦点决定不被覆盖", async () => {
    const combo = pnwMountCombo();
    const root = combo.shadowRoot!;
    const trigger = root.querySelector<HTMLButtonElement>(".pnw-combo-trigger")!;
    const other = document.createElement("button");
    document.body.append(other);
    trigger.click();
    await Promise.resolve();
    root.querySelector<HTMLButtonElement>(".pnw-combo-select")!.click();
    expect(root.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.click();
    await Promise.resolve();
    const clear = root.querySelector<HTMLButtonElement>(".pnw-combo-clear")!;
    clear.focus();
    clear.click();
    expect(root.activeElement).toBe(trigger);
    combo.addEventListener(PNW_COMBO_ACTION, () => other.focus());
    trigger.click();
    root.querySelector<HTMLButtonElement>(".pnw-combo-select")!.click();
    await Promise.resolve();
    expect(document.activeElement).toBe(other);
  });

  it("删除后的 Host 模型刷新保留邻近焦点，最后一项消失返回触发器", async () => {
    const combo = pnwMountCombo();
    const root = combo.shadowRoot!;
    const trigger = root.querySelector<HTMLButtonElement>(".pnw-combo-trigger")!;
    trigger.click();
    await Promise.resolve();
    const remove = root.querySelector<HTMLButtonElement>(".pnw-combo-remove")!;
    remove.focus();
    combo.model = { ...PNW_TEST_COMBO_MODEL };
    expect(root.activeElement?.classList.contains("pnw-combo-remove")).toBe(true);
    combo.model = { ...PNW_TEST_COMBO_MODEL, items: PNW_TEST_COMBO_MODEL.items.slice(1) };
    expect(root.activeElement?.textContent).toBe("共享方案");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    combo.model = { ...PNW_TEST_COMBO_MODEL, items: [] };
    expect(root.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("方向键、Home、End、Escape 与 Tab 保持原有键盘出口", async () => {
    const combo = pnwMountCombo();
    const root = combo.shadowRoot!;
    const trigger = root.querySelector<HTMLButtonElement>(".pnw-combo-trigger")!;
    const options = root.querySelectorAll<HTMLButtonElement>(".pnw-combo-select");
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    await Promise.resolve();
    expect(root.activeElement).toBe(options[1]);
    for (const [key, index] of [["Home", 0], ["End", 1], ["ArrowDown", 0], ["ArrowUp", 1]] as const) {
      root.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      expect(root.activeElement).toBe(options[index]);
    }
    root.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(root.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    for (const shiftKey of [false, true]) {
      trigger.click();
      await Promise.resolve();
      const tab = new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true });
      root.activeElement?.dispatchEvent(tab);
      expect(tab.defaultPrevented).toBe(false);
      expect(root.activeElement).toBe(trigger);
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    }
  });

  it("点外或断开后，延迟的初始焦点不能重新进入已关闭弹层", async () => {
    const combo = pnwMountCombo();
    const trigger = combo.shadowRoot!.querySelector<HTMLButtonElement>(".pnw-combo-trigger")!;
    const other = document.createElement("button");
    document.body.append(other);
    trigger.click();
    other.dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }));
    other.focus();
    await Promise.resolve();
    expect(document.activeElement).toBe(other);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.click();
    combo.remove();
    await Promise.resolve();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(other);
  });

  it("整体禁用或受保护操作不发送业务事件", () => {
    const combo = pnwMountCombo();
    const listener = vi.fn();
    combo.addEventListener(PNW_COMBO_ACTION, listener);
    combo.shadowRoot!.querySelectorAll<HTMLButtonElement>(".pnw-combo-remove")[1]!.click();
    combo.model = { ...PNW_TEST_COMBO_MODEL, disabled: true };
    for (const button of combo.shadowRoot!.querySelectorAll<HTMLButtonElement>("button")) {
      expect(button.disabled).toBe(true);
      button.click();
    }
    expect(listener).not.toHaveBeenCalled();
  });

  it("模型刷新不抢走组件外的焦点", () => {
    const combo = pnwMountCombo();
    const other = document.createElement("button");
    document.body.append(other);
    other.focus();
    combo.model = { ...PNW_TEST_COMBO_MODEL, selectedId: "shared" };
    expect(document.activeElement).toBe(other);
  });

  it("下方空间不足时自动向上展开并保留 300px 高度上限", () => {
    const combo = pnwMountCombo();
    const trigger = combo.shadowRoot?.querySelector<HTMLButtonElement>(".pnw-combo-trigger");
    const popup = combo.shadowRoot?.querySelector<HTMLDivElement>(".pnw-combo-popup");
    vi.spyOn(trigger!, "getBoundingClientRect").mockReturnValue({
      top: 520,
      right: 240,
      bottom: 548,
      left: 40,
      width: 200,
      height: 28,
      x: 40,
      y: 520,
      toJSON: () => undefined,
    });
    Object.defineProperty(popup, "scrollHeight", { configurable: true, value: 420 });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 800 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 600 });

    trigger?.click();

    expect(popup?.dataset.placement).toBe("top");
    expect(popup?.style.top).toBe("218px");
    expect(popup?.style.left).toBe("40px");
    expect(popup?.style.width).toBe("200px");
    expect(popup?.style.maxHeight).toBe("300px");
  });

  it("按滚动裁剪祖先计算可见高度", () => {
    const ancestor = document.createElement("section");
    ancestor.style.overflow = "hidden";
    document.body.append(ancestor);
    vi.spyOn(ancestor, "getBoundingClientRect").mockReturnValue({
      top: 100,
      right: 300,
      bottom: 400,
      left: 20,
      width: 280,
      height: 300,
      x: 20,
      y: 100,
      toJSON: () => undefined,
    });
    const combo = pnwMountCombo(ancestor);
    const trigger = combo.shadowRoot?.querySelector<HTMLButtonElement>(".pnw-combo-trigger");
    const popup = combo.shadowRoot?.querySelector<HTMLDivElement>(".pnw-combo-popup");
    vi.spyOn(trigger!, "getBoundingClientRect").mockReturnValue({
      top: 300,
      right: 240,
      bottom: 328,
      left: 40,
      width: 200,
      height: 28,
      x: 40,
      y: 300,
      toJSON: () => undefined,
    });
    Object.defineProperty(popup, "scrollHeight", { configurable: true, value: 260 });

    trigger?.click();

    expect(popup?.dataset.placement).toBe("top");
    expect(popup?.style.top).toBe("100px");
    expect(popup?.style.maxHeight).toBe("198px");
  });

  it("跨 Shadow Host 的裁剪边界与滚动/缩放仍可重新定位", () => {
    const ancestor = document.createElement("section");
    ancestor.style.overflow = "hidden";
    document.body.append(ancestor);
    vi.spyOn(ancestor, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 100, 280, 300));
    const shadow = ancestor.attachShadow({ mode: "open" });
    const holder = document.createElement("div");
    shadow.append(holder);
    const combo = pnwMountCombo(holder);
    const trigger = combo.shadowRoot!.querySelector<HTMLButtonElement>(".pnw-combo-trigger")!;
    const popup = combo.shadowRoot!.querySelector<HTMLDivElement>(".pnw-combo-popup")!;
    const rect = vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(new DOMRect(40, 300, 200, 28));
    Object.defineProperty(popup, "scrollHeight", { configurable: true, value: 260 });
    trigger.click();
    expect(popup.dataset.placement).toBe("top");
    expect(popup.style.maxHeight).toBe("198px");
    rect.mockReturnValue(new DOMRect(40, 110, 200, 28));
    ancestor.dispatchEvent(new Event("scroll"));
    expect(popup.dataset.placement).toBe("bottom");
    expect(popup.style.top).toBe("140px");
    rect.mockReturnValue(new DOMRect(40, 300, 200, 28));
    window.dispatchEvent(new Event("resize"));
    expect(popup.dataset.placement).toBe("top");
    expect(popup.style.maxHeight).toBe("198px");
  });
});
