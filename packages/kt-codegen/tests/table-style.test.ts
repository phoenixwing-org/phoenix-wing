// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  KT_CODEGEN_TABLE_CLASSES,
  KT_CODEGEN_TABLE_STYLE,
} from "../src/table/KtCodegenTableStyle.js";

describe("KtCodegenTable visual primitive", () => {
  it("以唯一 pnw 类名同时驱动 DOM 与样式选择器", () => {
    const classNames = Object.values(KT_CODEGEN_TABLE_CLASSES);
    const componentSource = readFileSync(
      new URL("../src/table/KtCodegenTable.ts", import.meta.url),
      "utf8",
    );

    expect(Object.isFrozen(KT_CODEGEN_TABLE_CLASSES)).toBe(true);
    expect(new Set(classNames).size).toBe(classNames.length);
    for (const [key, className] of Object.entries(KT_CODEGEN_TABLE_CLASSES)) {
      expect(className).toMatch(/^pnw-kt-codegen-table-/);
      expect(KT_CODEGEN_TABLE_STYLE).toContain(`.${className}`);
      expect(componentSource).toContain(`KT_CODEGEN_TABLE_CLASSES.${key}`);
    }
  });

  it("保留 VS Code token 回退与宿主换肤变量", () => {
    expect(KT_CODEGEN_TABLE_STYLE).toContain("--pnw-kt-codegen-border: var(--vscode-panel-border");
    expect(KT_CODEGEN_TABLE_STYLE).toContain("--pnw-kt-codegen-input-background: var(--vscode-input-background");
    expect(KT_CODEGEN_TABLE_STYLE).toContain("--pnw-kt-codegen-selection-foreground: var(--vscode-list-activeSelectionForeground");
    expect(KT_CODEGEN_TABLE_STYLE).toContain("--pnw-kt-codegen-selection: var(--vscode-list-activeSelectionBackground, Highlight)");
    expect(KT_CODEGEN_TABLE_STYLE).toContain("--pnw-kt-codegen-selection-foreground: var(--vscode-list-activeSelectionForeground, HighlightText)");
    expect(KT_CODEGEN_TABLE_STYLE).toContain("--pnw-kt-codegen-inactive-selection: var(--vscode-list-inactiveSelectionBackground");
    expect(KT_CODEGEN_TABLE_STYLE).toContain("--pnw-kt-codegen-inactive-selection-foreground: var(--vscode-list-inactiveSelectionForeground");
    expect(KT_CODEGEN_TABLE_STYLE).toContain("color-scheme: light dark");
  });

  it("冻结工具栏、双向表格滚动与 sticky 表头边界", () => {
    expect(KT_CODEGEN_TABLE_STYLE).toContain("overflow-x: auto");
    expect(KT_CODEGEN_TABLE_STYLE).toContain("scrollbar-width: thin");
    expect(KT_CODEGEN_TABLE_STYLE).toContain(
      `.${KT_CODEGEN_TABLE_CLASSES.shell} { position: relative; flex: 1 1 auto; min-height: 0; overflow: auto; }`,
    );
    expect(KT_CODEGEN_TABLE_STYLE).toContain("position: sticky");
    expect(KT_CODEGEN_TABLE_STYLE).toContain("top: 0");
    expect(KT_CODEGEN_TABLE_STYLE).toContain("left: 0");
  });

  it("contained 保持内部滚动，page 改为自然高度且只承担横向溢出", () => {
    expect(KT_CODEGEN_TABLE_STYLE).toContain(":host([layout=\"page\"]) {");
    expect(KT_CODEGEN_TABLE_STYLE).toContain("height: auto;");
    expect(KT_CODEGEN_TABLE_STYLE).toContain("overflow: visible;");
    expect(KT_CODEGEN_TABLE_STYLE).toContain(
      `.${KT_CODEGEN_TABLE_CLASSES.shell} { position: relative; flex: 1 1 auto; min-height: 0; overflow: auto; }`,
    );
    expect(KT_CODEGEN_TABLE_STYLE).toContain(
      `:host([layout="page"]) .${KT_CODEGEN_TABLE_CLASSES.shell} {`,
    );
    expect(KT_CODEGEN_TABLE_STYLE).toContain("flex: 0 0 auto;");
    expect(KT_CODEGEN_TABLE_STYLE).toContain("overflow-x: auto;");
    expect(KT_CODEGEN_TABLE_STYLE).toContain("overflow-y: hidden;");
    expect(KT_CODEGEN_TABLE_STYLE).toContain(
      `:host([layout="page"]) .${KT_CODEGEN_TABLE_CLASSES.empty} {`,
    );
    expect(KT_CODEGEN_TABLE_STYLE).toContain("position: static;");
  });

  it("折叠时允许 Host 收缩到 Header，并以 hidden 统一隐藏受控内容", () => {
    expect(KT_CODEGEN_TABLE_STYLE).toContain(":host([collapsible][collapsed]) {");
    expect(KT_CODEGEN_TABLE_STYLE).toContain("height: auto !important;");
    expect(KT_CODEGEN_TABLE_STYLE).toContain("[hidden] { display: none !important; }");
    expect(KT_CODEGEN_TABLE_STYLE).toContain(
      `.${KT_CODEGEN_TABLE_CLASSES.collapseToggle}:disabled { opacity: 1; cursor: default; }`,
    );
  });

  it("保留选中前景、键盘焦点和状态反馈", () => {
    expect(KT_CODEGEN_TABLE_STYLE).toContain(
      "color: var(--pnw-kt-codegen-selection-foreground);",
    );
    expect(KT_CODEGEN_TABLE_STYLE).toContain(
      ".pnw-kt-codegen-table-shell:focus-within tr.pnw-kt-codegen-table-selected-row td",
    );
    expect(KT_CODEGEN_TABLE_STYLE).toContain(
      `tr.${KT_CODEGEN_TABLE_CLASSES.selectedRow} td > select { color: inherit; }`,
    );
    expect(KT_CODEGEN_TABLE_STYLE).toContain("button:focus-visible, input:focus-visible, select:focus-visible");
    expect(KT_CODEGEN_TABLE_STYLE).toContain(
      `.${KT_CODEGEN_TABLE_CLASSES.status}.${KT_CODEGEN_TABLE_CLASSES.error}`,
    );
    expect(KT_CODEGEN_TABLE_STYLE).toContain(
      `.${KT_CODEGEN_TABLE_CLASSES.status}.${KT_CODEGEN_TABLE_CLASSES.dirty}`,
    );
  });

  it("原生popup option不继承选中行白字，配对dropdown前景背景且保留未知值提示", () => {
    const optionRule = KT_CODEGEN_TABLE_STYLE.match(/td > select > option \{([^}]+)\}/u)![1]!;
    expect(optionRule).toContain("color: var(--vscode-dropdown-foreground, var(--vscode-input-foreground, var(--vscode-foreground, CanvasText)))");
    expect(optionRule).toContain("background: var(--vscode-dropdown-background, var(--vscode-input-background, var(--vscode-editor-background, Canvas)))");
    expect(optionRule).not.toContain("selection-foreground");
    expect(optionRule).not.toContain("inherit");
    expect(KT_CODEGEN_TABLE_STYLE).toContain(`option.${KT_CODEGEN_TABLE_CLASSES.unknownOption} { color: var(--vscode-editorWarning-foreground`);
    expect(KT_CODEGEN_TABLE_STYLE).toContain("@media (forced-colors: active) { td > select > option { color: CanvasText; background: Canvas; } }");
  });
});
