// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

describe("@phoenix-wing/kt-codegen/table", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("只在宿主显式调用时注册一次 Web Component", async () => {
    const registry = new Map<string, CustomElementConstructor>();
    vi.stubGlobal("HTMLElement", class {});
    vi.stubGlobal("customElements", {
      get: (name: string) => registry.get(name),
      define: (name: string, value: CustomElementConstructor) => registry.set(name, value),
    });

    const browser = await import("../src/table/index.js");
    expect(registry.size).toBe(0);
    const first = browser.ktCodegenDefineTableElement();
    const second = browser.ktCodegenDefineTableElement();

    expect(registry.get("kt-codegen-table")).toBe(first);
    expect(second).toBe(first);
    expect(registry.size).toBe(1);
  });

  it("把 Qt 的列宽自适应保留为组件内部布局动作", () => {
    const source = readFileSync(new URL("../src/table/KtCodegenTable.ts", import.meta.url), "utf8");
    expect(source).toContain('["autoFit", "自适应"');
    expect(source).toContain("fitColumnsToContents");
    expect(source).toContain("kt-codegen-table-change");
  });

  it("使用 VS Code 选中态前景色，并让窄窗口工具栏保持可访问", () => {
    const source = readFileSync(new URL("../src/table/KtCodegenTable.ts", import.meta.url), "utf8");
    expect(source).toContain("--vscode-list-activeSelectionForeground");
    expect(source).toContain("--pnw-kt-codegen-selection-foreground");
    expect(source).toContain("overflow-x: auto");
    expect(source).toContain("scrollbar-width: thin");
    expect(source).toContain('tr.selected td > select { color: inherit; }');
  });

  it("为动态表格状态、行选择和单元格编辑器提供读屏语义", () => {
    const source = readFileSync(new URL("../src/table/KtCodegenTable.ts", import.meta.url), "utf8");
    expect(source).toContain('status.setAttribute("aria-live", "polite")');
    expect(source).toContain('table.setAttribute("aria-rowcount"');
    expect(source).toContain('row.setAttribute("aria-selected"');
    expect(source).toContain('selectButton.setAttribute("aria-pressed"');
    expect(source).toContain('button.setAttribute("aria-label", title)');
    expect(source).toContain('cell.scope = "col"');
    expect(source).toContain('input.setAttribute("aria-label", column.title');
    expect(source).toContain('select.setAttribute("aria-label", column.title');
  });
});
