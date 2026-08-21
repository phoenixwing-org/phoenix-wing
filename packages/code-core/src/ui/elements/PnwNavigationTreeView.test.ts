// @vitest-environment happy-dom
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it } from "vitest";
import type {
  PnwNavigationTreeIconKey,
  PnwNavigationTreeModel,
} from "../model/PnwNavigationTreeModel.js";
import {
  PNW_NAVIGATION_TREE_ACTION,
  PnwNavigationTreeView,
  pnwCodeDefineNavigationTree,
  type PnwNavigationTreeActionDetail,
} from "./PnwNavigationTreeView.js";

const TEST_TAG = "pnw-navigation-tree-test";

function model(selectedNodeId = "missing"): PnwNavigationTreeModel {
  return {
    ariaLabel: "代码目录",
    expandedNodeIds: ["catalog"],
    selectedNodeId,
    focusedNodeId: selectedNodeId,
    nodes: [
      {
        id: "catalog",
        label: "Catalog",
        iconKey: "catalog",
        children: [
          {
            id: "missing",
            label: "<img src=x onerror=alert(1)>",
            description: "未找到 Catalog XYC*Frm / XYC*Catalog.m",
            iconKey: "info",
          },
        ],
      },
      { id: "settings", label: "配置", iconKey: "settings" },
    ],
  };
}

function mount(treeModel = model()): PnwNavigationTreeView {
  pnwCodeDefineNavigationTree(TEST_TAG);
  const element = document.createElement(TEST_TAG) as PnwNavigationTreeView;
  document.body.append(element);
  element.model = treeModel;
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("PnwNavigationTreeView", () => {
  it("渲染 ARIA tree、受控图标和安全文本", () => {
    const element = mount();
    const root = element.shadowRoot;
    const rows = root?.querySelectorAll<HTMLElement>("[role=treeitem]");
    const selected = root?.querySelector<HTMLElement>('[data-node-id="missing"]');

    expect(root?.querySelector("[role=tree]")?.getAttribute("aria-label")).toBe("代码目录");
    expect(rows).toHaveLength(3);
    expect(selected?.getAttribute("aria-level")).toBe("2");
    expect(selected?.getAttribute("aria-selected")).toBe("true");
    expect(selected?.classList.contains("pnw-is-selected")).toBe(true);
    expect(selected?.textContent).toContain("<img src=x onerror=alert(1)>");
    expect(root?.querySelector("img")).toBeNull();
    expect(root?.querySelectorAll(".pnw-navigation-tree-icon svg")).toHaveLength(3);
  });

  it("浅色、深色和 system 均使用可覆盖的 VS Code 风格 token", () => {
    const element = mount();
    const style = element.shadowRoot?.querySelector("style")?.textContent ?? "";

    expect(style).toContain("--pnw-navigation-tree-hover-bg");
    expect(style).toContain("--pnw-navigation-tree-selected-bg");
    expect(style).toContain("--pnw-navigation-tree-focus");
    expect(style).toContain("#d4d4d4");
    expect(style).toContain("#37373d");
    expect(style).toContain("#0078d4");
    expect(style).toContain("#007fd4");
    expect(style).toContain("overflow: auto");
    expect(style).toContain("overscroll-behavior: contain");

    element.colorScheme = "dark";
    expect(element.getAttribute("color-scheme")).toBe("dark");
    element.colorScheme = "light";
    expect(element.getAttribute("color-scheme")).toBe("light");
    element.colorScheme = "system";
    expect(element.hasAttribute("color-scheme")).toBe(false);
  });

  it("运行时未知图标不会执行消费者内容，并显示安全 fallback", () => {
    const treeModel = model();
    const element = mount({
      ...treeModel,
      nodes: [
        ...treeModel.nodes,
        {
          id: "unknown-icon",
          label: "未知图标",
          iconKey: "<svg onload=alert(1)>" as PnwNavigationTreeIconKey,
        },
      ],
    });

    expect(
      element.shadowRoot?.querySelector('[data-pnw-icon-fallback="true"]'),
    ).not.toBeNull();
    expect(element.shadowRoot?.querySelector("script")).toBeNull();
  });

  it("以 composed 受控事件报告选择、折叠和激活", () => {
    const element = mount();
    const actions: PnwNavigationTreeActionDetail[] = [];
    element.addEventListener(PNW_NAVIGATION_TREE_ACTION, (event) => {
      actions.push((event as CustomEvent<PnwNavigationTreeActionDetail>).detail);
    });

    element.shadowRoot?.querySelector<HTMLElement>('[data-node-id="settings"]')?.click();
    element.shadowRoot?.querySelector<HTMLButtonElement>(".pnw-navigation-tree-caret")?.click();
    element.shadowRoot
      ?.querySelector<HTMLElement>('[data-node-id="missing"]')
      ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(actions).toEqual([
      { kind: "select", nodeId: "settings" },
      { kind: "toggle", nodeId: "catalog", expanded: false },
      { kind: "activate", nodeId: "missing" },
    ]);
  });

  it("分组整行单击只报告一次受控折叠意图", () => {
    const element = mount();
    const actions: PnwNavigationTreeActionDetail[] = [];
    element.addEventListener(PNW_NAVIGATION_TREE_ACTION, (event) => {
      actions.push((event as CustomEvent<PnwNavigationTreeActionDetail>).detail);
    });
    const catalog = element.shadowRoot?.querySelector<HTMLElement>('[data-node-id="catalog"]');

    catalog?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));

    expect(actions).toEqual([
      { kind: "select", nodeId: "catalog" },
      { kind: "toggle", nodeId: "catalog", expanded: false },
    ]);
    expect(element.model?.expandedNodeIds).toEqual(["catalog"]);
  });

  it("同一行实例收到双击序列时只切换一次，叶子仍激活一次", () => {
    const element = mount();
    const actions: PnwNavigationTreeActionDetail[] = [];
    element.addEventListener(PNW_NAVIGATION_TREE_ACTION, (event) => {
      actions.push((event as CustomEvent<PnwNavigationTreeActionDetail>).detail);
    });
    const dispatchDoubleClick = (target: HTMLElement | null | undefined) => {
      target?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
      target?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 2 }));
      target?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, detail: 2 }));
    };

    dispatchDoubleClick(element.shadowRoot?.querySelector<HTMLElement>('[data-node-id="catalog"]'));
    dispatchDoubleClick(element.shadowRoot?.querySelector<HTMLElement>('[data-node-id="missing"]'));

    expect(actions).toEqual([
      { kind: "select", nodeId: "catalog" },
      { kind: "toggle", nodeId: "catalog", expanded: false },
      { kind: "select", nodeId: "missing" },
      { kind: "activate", nodeId: "missing" },
    ]);
  });

  it("按可见节点执行 roving tabindex 键盘导航", () => {
    const element = mount();
    const selected = element.shadowRoot?.querySelector<HTMLElement>('[data-node-id="missing"]');
    selected?.focus();
    selected?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

    const settings = element.shadowRoot?.querySelector<HTMLElement>('[data-node-id="settings"]');
    expect(element.shadowRoot?.activeElement).toBe(settings);
    expect(selected?.tabIndex).toBe(-1);
    expect(settings?.tabIndex).toBe(0);
  });
});
