// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";

type FakeEventListener = (event: { readonly type: string }) => void;

class FakeNode {
  readonly children: FakeNode[] = [];
  readonly attributes = new Map<string, string>();
  readonly dataset: Record<string, string> = {};
  readonly listeners = new Map<string, FakeEventListener[]>();
  readonly style = { width: "", minWidth: "" };
  parentNode: FakeNode | null = null;
  textContent = "";
  title = "";
  type = "";
  value = "";
  id = "";
  scope = "";
  hidden = false;
  disabled = false;
  checked = false;
  spellcheck = true;
  private classTokens = new Set<string>();

  readonly classList = {
    toggle: (name: string, force?: boolean): boolean => {
      const enabled = force ?? !this.classTokens.has(name);
      if (enabled) this.classTokens.add(name);
      else this.classTokens.delete(name);
      return enabled;
    },
  };

  constructor(readonly tagName = "") {}

  get className(): string {
    return [...this.classTokens].join(" ");
  }

  set className(value: string) {
    this.classTokens = new Set(value.split(/\s+/u).filter(Boolean));
  }

  append(...nodes: FakeNode[]): void {
    for (const node of nodes) this.adopt(node);
  }

  replaceChildren(...nodes: FakeNode[]): void {
    for (const child of this.children) child.parentNode = null;
    this.children.splice(0, this.children.length);
    this.append(...nodes);
  }

  private adopt(node: FakeNode): void {
    if (node.tagName === "#fragment") {
      for (const child of [...node.children]) this.adopt(child);
      node.children.splice(0, node.children.length);
      return;
    }
    node.parentNode = this;
    this.children.push(node);
  }

  addEventListener(type: string, listener: FakeEventListener): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  click(): void {
    if (this.disabled || this.hidden) return;
    for (const listener of this.listeners.get("click") ?? []) listener({ type: "click" });
  }

  focus(): void {
    let current: FakeNode | null = this;
    while (current?.parentNode) current = current.parentNode;
    if (current instanceof FakeShadowRoot) current.activeElement = this;
  }

  contains(node: FakeNode | null): boolean {
    if (!node) return false;
    if (node === this) return true;
    return this.children.some((child) => child.contains(node));
  }

  setAttribute(name: string, value: string): void {
    const oldValue = this.getAttribute(name);
    this.attributes.set(name, String(value));
    if (name === "class") this.className = String(value);
    if (name === "id") this.id = String(value);
    this.notifyAttributeChanged(name, oldValue, String(value));
  }

  removeAttribute(name: string): void {
    const oldValue = this.getAttribute(name);
    if (oldValue === null) return;
    this.attributes.delete(name);
    this.notifyAttributeChanged(name, oldValue, null);
  }

  toggleAttribute(name: string, force?: boolean): boolean {
    const enabled = force ?? !this.hasAttribute(name);
    if (enabled) this.setAttribute(name, "");
    else this.removeAttribute(name);
    return enabled;
  }

  hasAttribute(name: string): boolean {
    return this.getAttribute(name) !== null;
  }

  getAttribute(name: string): string | null {
    if (name === "class") return this.className || null;
    if (name === "id") return this.id || null;
    if (name.startsWith("data-")) {
      const key = name.slice(5).replace(/-([a-z])/gu, (_match, letter: string) => letter.toUpperCase());
      return this.dataset[key] ?? this.attributes.get(name) ?? null;
    }
    return this.attributes.get(name) ?? null;
  }

  private notifyAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    const constructor = this.constructor as typeof FakeNode & { readonly observedAttributes?: readonly string[] };
    const callback = (this as FakeNode & {
      attributeChangedCallback?: (
        attribute: string,
        oldAttributeValue: string | null,
        newAttributeValue: string | null,
      ) => void;
    }).attributeChangedCallback;
    if (constructor.observedAttributes?.includes(name)) callback?.call(this, name, oldValue, newValue);
  }

  querySelector<T extends FakeNode = FakeNode>(selector: string): T | null {
    return this.querySelectorAll<T>(selector)[0] ?? null;
  }

  querySelectorAll<T extends FakeNode = FakeNode>(selector: string): T[] {
    const selectors = selector.split(",").map((value) => value.trim()).filter(Boolean);
    return this.descendants().filter((node) => selectors.some((value) => matchesSelector(node, value))) as T[];
  }

  private descendants(): FakeNode[] {
    return this.children.flatMap((child) => [child, ...child.descendants()]);
  }
}

class FakeShadowRoot extends FakeNode {
  activeElement: FakeNode | null = null;

  constructor() {
    super("#shadow-root");
  }
}

class FakeHTMLElement extends FakeNode {
  readonly shadow = new FakeShadowRoot();
  readonly events: FakeCustomEvent<unknown>[] = [];
  readonly isConnected = true;

  attachShadow(): FakeShadowRoot {
    return this.shadow;
  }

  dispatchEvent(event: FakeCustomEvent<unknown>): boolean {
    this.events.push(event);
    return true;
  }
}

class FakeCustomEvent<T> {
  readonly bubbles: boolean;
  readonly composed: boolean;
  readonly detail: T;

  constructor(
    readonly type: string,
    init: { readonly bubbles?: boolean; readonly composed?: boolean; readonly detail: T },
  ) {
    this.bubbles = init.bubbles ?? false;
    this.composed = init.composed ?? false;
    this.detail = init.detail;
  }
}

function matchesSelector(node: FakeNode, selector: string): boolean {
  const parts = selector.split(/\s+/u).filter(Boolean);
  let current: FakeNode | null = node;
  if (!current || !matchesSimpleSelector(current, parts.at(-1) ?? "")) return false;
  for (let index = parts.length - 2; index >= 0; index -= 1) {
    current = current.parentNode;
    while (current && !matchesSimpleSelector(current, parts[index]!)) current = current.parentNode;
    if (!current) return false;
  }
  return true;
}

function matchesSimpleSelector(node: FakeNode, selector: string): boolean {
  const tag = selector.match(/^[a-z][a-z0-9-]*/iu)?.[0];
  if (tag && node.tagName.toLowerCase() !== tag.toLowerCase()) return false;
  for (const match of selector.matchAll(/\.([a-z0-9_-]+)/giu)) {
    if (!node.className.split(/\s+/u).includes(match[1]!)) return false;
  }
  for (const match of selector.matchAll(/\[([^\]=]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]/gu)) {
    const actual = node.getAttribute(match[1]!);
    const expected = match[2] ?? match[3] ?? match[4]?.trim();
    if (actual === null || (expected !== undefined && actual !== expected)) return false;
  }
  return true;
}

function installFakeDom(): void {
  const registry = new Map<string, CustomElementConstructor>();
  vi.stubGlobal("HTMLElement", FakeHTMLElement);
  vi.stubGlobal("document", {
    createElement: (name: string) => new FakeNode(name),
    createDocumentFragment: () => new FakeNode("#fragment"),
  });
  vi.stubGlobal("CustomEvent", FakeCustomEvent);
  vi.stubGlobal("customElements", {
    get: (name: string) => registry.get(name),
    define: (name: string, value: CustomElementConstructor) => registry.set(name, value),
  });
}

describe("KtCodegenTable DOM contract", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("异步保存快照不重建当前输入 DOM、不移动焦点，保留新草稿与新 checkpoint", async () => {
    vi.resetModules();
    installFakeDom();
    const browser = await import("../src/table/index.js");
    const { KtCodegenItem } = await import("../src/index.js");
    const table = new browser.KtCodegenTable() as unknown as FakeHTMLElement
      & InstanceType<typeof browser.KtCodegenTable>;
    table.connectedCallback();
    table.setData({ kind: "kt.codegen.table-data", schemaVersion: 1, documentRevision: 0,
      selectedRow: 0, items: [new KtCodegenItem({ name: "Saved" })] });
    const saved = table.getData();
    const input = table.shadow.querySelectorAll("input").find((node) => node.getAttribute("aria-label") === "Title，第 1 行")!;
    input.value = "Newer";
    input.focus();
    for (const listener of input.listeners.get("input") ?? []) listener({ type: "input" });
    table.markCheckpoint(1, saved.items);
    expect(table.getData().items[0]!.name).toBe("Newer");
    expect(table.getData().documentRevision).toBe(1);
    expect(table.shadow.querySelectorAll("input").find((node) => node.getAttribute("aria-label") === "Title，第 1 行")).toBe(input);
    expect(table.shadow.activeElement).toBe(input);
    expect(table.shadow.querySelector("[data-role='status']")!.textContent).toContain("未保存");
    table.revertToCheckpoint();
    expect(table.getData().items[0]!.name).toBe("Saved");
  });

  it("默认工具栏渲染九个纯文字按钮，保持 title、ARIA 与空表可用性", async () => {
    vi.resetModules();
    installFakeDom();
    const browser = await import("../src/table/index.js");
    const table = new browser.KtCodegenTable() as unknown as FakeHTMLElement
      & InstanceType<typeof browser.KtCodegenTable>;
    table.connectedCallback();

    const tools = table.shadow.querySelectorAll("button[data-action]");
    expect(tools.map((button) => [button.dataset.action, button.textContent, button.title,
      button.getAttribute("aria-label"), button.disabled])).toEqual([
      ["autoFit", "自适应", "根据当前内容调整列宽", "根据当前内容调整列宽", false],
      ["sort", "排序", "按旧 Qt 规则规范 Suffix 和 ID", "按旧 Qt 规则规范 Suffix 和 ID", true],
      ["copy", "复制", "复制当前行", "复制当前行", true],
      ["paste", "粘贴", "用复制内容替换当前行", "用复制内容替换当前行", true],
      ["insert", "插入", "在当前行后插入", "在当前行后插入", false],
      ["duplicate", "副本", "在当前行后创建副本", "在当前行后创建副本", true],
      ["moveUp", "上移", "上移", "上移", true],
      ["moveDown", "下移", "下移", "下移", true],
      ["delete", "删除", "删除当前行", "删除当前行", true],
    ]);
  });

  it("反射布局与折叠属性，只有用户 Header 动作发出折叠事件", async () => {
    vi.resetModules();
    installFakeDom();
    const browser = await import("../src/table/index.js");
    const table = new browser.KtCodegenTable() as unknown as FakeHTMLElement
      & InstanceType<typeof browser.KtCodegenTable>;
    table.connectedCallback();

    const plainCaption = table.shadow.querySelector("[data-role=plain-caption]")!;
    const toggle = table.shadow.querySelector("[data-role=collapse-toggle]")!;
    const shell = table.shadow.querySelector("[data-role=table-shell]")!;
    const statusbar = table.shadow.querySelector("[data-role=statusbar]")!;
    const tools = table.shadow.querySelectorAll("button[data-action]");
    expect(table.layout).toBe("contained");
    expect(plainCaption.hidden).toBe(false);
    expect(toggle.hidden).toBe(true);
    expect(tools).toHaveLength(9);

    table.layout = "page";
    expect(table.getAttribute("layout")).toBe("page");
    table.setAttribute("layout", "viewport");
    expect(table.layout).toBe("contained");
    expect(table.getAttribute("layout")).toBe("contained");

    table.collapsible = true;
    expect(table.hasAttribute("collapsible")).toBe(true);
    expect(plainCaption.hidden).toBe(true);
    expect(toggle.hidden).toBe(false);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-controls")).toBe(
      "pnw-kt-codegen-table-shell pnw-kt-codegen-table-statusbar",
    );

    const eventCount = table.events.length;
    toggle.click();
    expect(table.collapsed).toBe(true);
    expect(table.hasAttribute("collapsed")).toBe(true);
    expect(shell.hidden).toBe(true);
    expect(statusbar.hidden).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-label")).toBe("展开参数表");
    expect(table.shadow.querySelectorAll("button[data-action]")).toHaveLength(9);
    expect(table.events.slice(eventCount)).toEqual([
      expect.objectContaining({
        type: "kt-codegen-table-collapse-change",
        detail: { collapsed: true },
        bubbles: true,
        composed: true,
      }),
    ]);

    table.events.splice(0, table.events.length);
    table.collapsed = false;
    table.setAttribute("collapsed", "");
    expect(table.events).toHaveLength(0);
    expect(table.events.some((event) => event.type === "kt-codegen-table-change")).toBe(false);
    expect(table.events.some((event) => event.type === "kt-codegen-table-dirty-change")).toBe(false);
  });

  it("程序收起时把隐藏区焦点移到 disclosure button，且不销毁工具或数据 DOM", async () => {
    vi.resetModules();
    installFakeDom();
    const browser = await import("../src/table/index.js");
    const table = new browser.KtCodegenTable() as unknown as FakeHTMLElement
      & InstanceType<typeof browser.KtCodegenTable>;
    table.connectedCallback();
    table.collapsible = true;

    table.shadow.querySelector("button[data-action='insert']")!.click();
    const editor = table.shadow.querySelector("[data-row='0'] input")!;
    const toggle = table.shadow.querySelector("[data-role=collapse-toggle]")!;
    editor.focus();
    expect(table.shadow.activeElement).toBe(editor);
    table.events.splice(0, table.events.length);

    table.collapsed = true;
    expect(table.shadow.activeElement).toBe(toggle);
    expect(table.shadow.querySelectorAll("button[data-action]")).toHaveLength(9);
    expect(table.shadow.querySelectorAll("[data-row='0']")).not.toHaveLength(0);
    expect(table.events).toHaveLength(0);
  });
});
