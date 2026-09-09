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
});

describe("PnwCombo", () => {
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
    expect(combo.shadowRoot?.querySelector(".pnw-combo-clear")?.textContent)
      .toBe("全部清空");
  });

  it("只发送 select/remove/clear 语义事件", () => {
    const combo = pnwMountCombo();
    const actions: PnwComboActionDetail[] = [];
    combo.addEventListener(PNW_COMBO_ACTION, (event) => {
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
    expect(PnwCombo.toString()).not.toMatch(
      /acquireVsCodeApi|postMessage|workspaceState|localStorage|projectRename|searchReplace/iu,
    );
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
});
