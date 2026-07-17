// SPDX-License-Identifier: Apache-2.0

import { KtCodegenOptions } from "../KtCodegenOptions.js";
import { KtCodegenParam } from "../KtCodegenParam.js";
import {
  KT_CODEGEN_TABLE_COLUMNS,
  type KtCodegenTableColumn,
  type KtCodegenTableItemField,
} from "../KtCodegenTableColumns.js";
import { KtCodegenTableCore } from "../KtCodegenTableCore.js";
import type { KtCodegenTableData } from "../KtCodegenTableData.js";

/** 默认 Web Component 标签名。 */
export const KT_CODEGEN_TABLE_TAG_NAME = "kt-codegen-table";

/** 表格 Combo 候选项；未知当前值始终会额外保留。 */
export interface KtCodegenTableOptions {
  readonly tcKind: readonly string[];
  readonly catAttrInOut: readonly string[];
  readonly component: readonly string[];
}

/** 表格可替换的列和候选项配置。 */
export interface KtCodegenTableConfiguration {
  readonly columns: readonly KtCodegenTableColumn[];
  readonly options: KtCodegenTableOptions;
}

/** clean/dirty 状态跃迁事件的数据。 */
export interface KtCodegenTableDirtyChangeDetail {
  readonly dirty: boolean;
  readonly documentRevision: number;
  readonly itemCount: number;
}

/** 组件内部数据发生变化；宿主 View 可据此防抖后交换整表。 */
export interface KtCodegenTableChangeDetail {
  readonly documentRevision: number;
  readonly itemCount: number;
}

export type KtCodegenTableStatus = "idle" | "saving" | "saved" | "error";

const KT_CODEGEN_TABLE_STYLE = `
:host {
  --pnw-kt-codegen-border: var(--vscode-panel-border, color-mix(in srgb, currentColor 18%, transparent));
  --pnw-kt-codegen-background: var(--vscode-editor-background, #fff);
  --pnw-kt-codegen-toolbar-background: var(--vscode-sideBar-background, #f6f6f6);
  --pnw-kt-codegen-input-background: var(--vscode-input-background, #fff);
  --pnw-kt-codegen-input-foreground: var(--vscode-input-foreground, inherit);
  --pnw-kt-codegen-selection: var(--vscode-list-activeSelectionBackground, #dbeafe);
  --pnw-kt-codegen-selection-foreground: var(--vscode-list-activeSelectionForeground, var(--vscode-foreground, inherit));
  --pnw-kt-codegen-hover: var(--vscode-list-hoverBackground, rgba(127, 127, 127, .12));
  --pnw-kt-codegen-focus: var(--vscode-focusBorder, #007acc);
  display: flex;
  min-height: 240px;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  color: var(--vscode-foreground, inherit);
  background: var(--pnw-kt-codegen-background);
  border: 1px solid var(--pnw-kt-codegen-border);
  border-radius: 6px;
  font: var(--vscode-font-size, 13px)/1.4 var(--vscode-font-family, system-ui, sans-serif);
  color-scheme: light dark;
}
* { box-sizing: border-box; }
.toolbar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 5px 8px;
  background: var(--pnw-kt-codegen-toolbar-background);
  border-bottom: 1px solid var(--pnw-kt-codegen-border);
  overflow-x: auto;
  scrollbar-width: thin;
}
.caption { flex: 0 0 auto; margin-right: auto; font-weight: 650; }
button {
  flex: 0 0 auto;
  min-height: 26px;
  padding: 2px 8px;
  color: inherit;
  background: var(--vscode-button-secondaryBackground, transparent);
  border: 1px solid var(--pnw-kt-codegen-border);
  border-radius: 4px;
  font: inherit;
  cursor: pointer;
}
button:hover:not(:disabled) { background: var(--pnw-kt-codegen-hover); }
button:focus-visible, input:focus-visible, select:focus-visible {
  outline: 1px solid var(--pnw-kt-codegen-focus);
  outline-offset: -1px;
}
button:disabled { opacity: .42; cursor: default; }
.shell { position: relative; flex: 1 1 auto; min-height: 0; overflow: auto; }
table { width: max-content; min-width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
th, td {
  height: 34px;
  padding: 0;
  overflow: hidden;
  border-right: 1px solid var(--pnw-kt-codegen-border);
  border-bottom: 1px solid var(--pnw-kt-codegen-border);
  background: var(--pnw-kt-codegen-background);
}
th {
  position: sticky;
  z-index: 2;
  top: 0;
  padding: 0 8px;
  text-align: left;
  white-space: nowrap;
  color: var(--vscode-descriptionForeground, inherit);
  background: var(--pnw-kt-codegen-toolbar-background);
  font-weight: 650;
}
tr:hover td { background: var(--pnw-kt-codegen-hover); }
tr.selected td {
  color: var(--pnw-kt-codegen-selection-foreground);
  background: var(--pnw-kt-codegen-selection);
}
tr.selected td > input:not([type="checkbox"]),
tr.selected td > select { color: inherit; }
.row-number {
  position: sticky;
  z-index: 1;
  left: 0;
  width: 48px;
  min-width: 48px;
  max-width: 48px;
  text-align: center;
  color: var(--vscode-descriptionForeground, inherit);
  background: var(--pnw-kt-codegen-toolbar-background);
}
th.row-number { z-index: 3; }
.row-number button {
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}
td > input:not([type="checkbox"]), td > select {
  width: 100%;
  height: 100%;
  min-width: 0;
  padding: 0 8px;
  color: var(--pnw-kt-codegen-input-foreground);
  background: transparent;
  border: 0;
  border-radius: 0;
  font: inherit;
}
td.boolean { text-align: center; }
td.boolean input { width: 16px; height: 16px; accent-color: var(--vscode-button-background, #007acc); }
option.unknown { color: var(--vscode-editorWarning-foreground, #b89500); }
.empty {
  position: absolute;
  inset: 42px 16px auto;
  padding: 24px;
  text-align: center;
  color: var(--vscode-descriptionForeground, #666);
  border: 1px dashed var(--pnw-kt-codegen-border);
  border-radius: 6px;
}
.statusbar {
  display: flex;
  flex: 0 0 auto;
  justify-content: space-between;
  gap: 12px;
  min-height: 28px;
  padding: 5px 9px;
  color: var(--vscode-descriptionForeground, inherit);
  background: var(--pnw-kt-codegen-toolbar-background);
  border-top: 1px solid var(--pnw-kt-codegen-border);
}
.status.error { color: var(--vscode-errorForeground, #c72e0f); }
.status.dirty { color: var(--vscode-editorWarning-foreground, #b89500); }
`;

type KtCodegenTableAction =
  | "autoFit"
  | "sort"
  | "copy"
  | "paste"
  | "insert"
  | "duplicate"
  | "moveUp"
  | "moveDown"
  | "delete";

const KT_CODEGEN_TABLE_ACTIONS = [
  ["autoFit", "自适应", "根据当前内容调整列宽"],
  ["sort", "排序", "按旧 Qt 规则规范 Suffix 和 ID"],
  ["copy", "复制", "复制当前行"],
  ["paste", "粘贴", "用复制内容替换当前行"],
  ["insert", "＋ 插入", "在当前行后插入"],
  ["duplicate", "⧉ 副本", "在当前行后创建副本"],
  ["moveUp", "↑", "上移"],
  ["moveDown", "↓", "下移"],
  ["delete", "− 删除", "删除当前行"],
] as const satisfies readonly (readonly [KtCodegenTableAction, string, string])[];

/**
 * 独立的 Codegen 17列表格 Web Component。
 *
 * 组件内部使用 KtCodegenTableCore；宿主通过 setData/getData 在文档级动作时
 * 交换整表，只在 clean/dirty 状态跃迁时接收 kt-codegen-table-dirty-change。
 */
export class KtCodegenTable extends HTMLElement {
  private readonly param = new KtCodegenParam();
  private readonly core = new KtCodegenTableCore(this.param);
  private readonly root: ShadowRoot;
  private readonly fittedWidths = new Map<KtCodegenTableItemField, number>();
  private columns: readonly KtCodegenTableColumn[] = KT_CODEGEN_TABLE_COLUMNS;
  private options: KtCodegenTableOptions = {
    tcKind: KtCodegenOptions.tcKinds,
    catAttrInOut: KtCodegenOptions.catAttrInOutValues,
    component: KtCodegenOptions.components,
  };

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.build();
  }

  connectedCallback(): void {
    this.render();
  }

  configure(configuration: Partial<KtCodegenTableConfiguration>): void {
    if (configuration.columns) {
      this.columns = configuration.columns.map((column) => ({ ...column }));
      this.fittedWidths.clear();
    }
    if (configuration.options) {
      this.options = {
        tcKind: [...configuration.options.tcKind],
        catAttrInOut: [...configuration.options.catAttrInOut],
        component: [...configuration.options.component],
      };
    }
    this.render();
  }

  setData(data: KtCodegenTableData): void {
    this.core.setData(data);
    this.render();
    this.setStatus("idle", "");
  }

  getData(): KtCodegenTableData {
    return this.core.getData();
  }

  markCheckpoint(documentRevision = this.core.documentRevision): void {
    const wasDirty = this.core.dirty;
    this.core.markCheckpoint(documentRevision);
    this.render();
    this.emitDirtyTransition(wasDirty);
  }

  revertToCheckpoint(): void {
    const wasDirty = this.core.dirty;
    this.core.revertToCheckpoint();
    this.render();
    this.emitDirtyTransition(wasDirty);
  }

  focusRow(row: number): void {
    this.core.select(row);
    this.syncSelection();
    this.root.querySelector<HTMLElement>("[data-row='" + row + "'] input, [data-row='" + row + "'] select")
      ?.focus();
  }

  setStatus(status: KtCodegenTableStatus, message: string): void {
    const element = this.root.querySelector<HTMLElement>("[data-role=status]");
    if (!element) return;
    element.textContent = message;
    element.className = "status" + (status === "error" ? " error" : "");
  }

  private build(): void {
    const style = document.createElement("style");
    style.textContent = KT_CODEGEN_TABLE_STYLE;

    const toolbar = document.createElement("header");
    toolbar.className = "toolbar";
    const caption = document.createElement("span");
    caption.className = "caption";
    caption.textContent = "参数表";
    toolbar.append(caption);
    for (const [action, label, title] of KT_CODEGEN_TABLE_ACTIONS) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.action = action;
      button.textContent = label;
      button.title = title;
      button.setAttribute("aria-label", title);
      button.addEventListener("click", () => this.handleAction(action));
      toolbar.append(button);
    }

    const shell = document.createElement("main");
    shell.className = "shell";
    const table = document.createElement("table");
    table.setAttribute("aria-label", "Codegen 参数表");
    const head = document.createElement("thead");
    head.dataset.role = "head";
    const body = document.createElement("tbody");
    body.dataset.role = "body";
    table.append(head, body);
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.dataset.role = "empty";
    empty.setAttribute("role", "note");
    empty.textContent = "当前 JSON 没有参数行。点击“插入”创建第一行。";
    shell.append(table, empty);

    const footer = document.createElement("footer");
    footer.className = "statusbar";
    const count = document.createElement("span");
    count.dataset.role = "count";
    const status = document.createElement("span");
    status.className = "status";
    status.dataset.role = "status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    footer.append(count, status);

    this.root.replaceChildren(style, toolbar, shell, footer);
  }

  private render(): void {
    if (!this.isConnected) return;
    this.renderHead();
    this.renderRows();
    this.syncActions();
    this.syncDirtyStatus();
  }

  private renderHead(): void {
    const head = this.root.querySelector<HTMLElement>("[data-role=head]");
    if (!head) return;
    const row = document.createElement("tr");
    const number = document.createElement("th");
    number.className = "row-number";
    number.textContent = "#";
    number.scope = "col";
    row.append(number);
    for (const column of this.columns) {
      const cell = document.createElement("th");
      cell.textContent = column.title;
      cell.title = column.field;
      cell.scope = "col";
      const width = this.columnWidth(column);
      cell.style.width = width + "px";
      cell.style.minWidth = width + "px";
      row.append(cell);
    }
    head.replaceChildren(row);
  }

  private renderRows(): void {
    const body = this.root.querySelector<HTMLElement>("[data-role=body]");
    const empty = this.root.querySelector<HTMLElement>("[data-role=empty]");
    const count = this.root.querySelector<HTMLElement>("[data-role=count]");
    const table = this.root.querySelector<HTMLTableElement>("table");
    if (!body || !empty || !count || !table) return;
    table.setAttribute("aria-rowcount", String(this.param.items.length + 1));
    table.setAttribute("aria-colcount", String(this.columns.length + 1));
    const fragment = document.createDocumentFragment();
    this.param.items.forEach((item, rowIndex) => {
      const row = document.createElement("tr");
      row.dataset.row = String(rowIndex);
      const selected = rowIndex === this.core.selectedRow;
      if (selected) row.className = "selected";
      row.setAttribute("aria-selected", String(selected));
      const number = document.createElement("td");
      number.className = "row-number";
      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.textContent = String(rowIndex + 1);
      selectButton.setAttribute("aria-label", "选择第 " + (rowIndex + 1) + " 行");
      selectButton.setAttribute("aria-pressed", String(selected));
      selectButton.addEventListener("click", () => this.selectRow(rowIndex));
      number.append(selectButton);
      row.append(number);
      for (const column of this.columns) row.append(this.createCell(rowIndex, column));
      fragment.append(row);
    });
    body.replaceChildren(fragment);
    empty.hidden = this.param.items.length > 0;
    count.textContent = this.param.items.length + " 行 · " + this.columns.length + " 列";
  }

  private createCell(row: number, column: KtCodegenTableColumn): HTMLTableCellElement {
    const item = this.param.items[row]!;
    const cell = document.createElement("td");
    const width = this.columnWidth(column);
    cell.style.width = width + "px";
    cell.style.minWidth = width + "px";
    if (column.kind === "boolean") {
      cell.className = "boolean";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(item[column.field]);
      input.setAttribute("aria-label", column.title + "，第 " + (row + 1) + " 行");
      input.addEventListener("focus", () => this.selectRow(row, false));
      input.addEventListener("change", () => this.changeCell(row, column.field, input.checked));
      cell.append(input);
      return cell;
    }

    const candidates = column.kind === "tcKind"
      ? this.options.tcKind
      : column.kind === "catAttrInOut"
        ? this.options.catAttrInOut
        : column.kind === "component"
          ? this.options.component
          : undefined;
    if (candidates) {
      const select = document.createElement("select");
      select.setAttribute("aria-label", column.title + "，第 " + (row + 1) + " 行");
      const current = String(item[column.field] ?? "");
      if (current && !candidates.includes(current)) {
        const unknown = document.createElement("option");
        unknown.value = current;
        unknown.textContent = current + "（未知，保持原值）";
        unknown.className = "unknown";
        select.append(unknown);
      }
      for (const candidate of candidates) {
        const option = document.createElement("option");
        option.value = candidate;
        option.textContent = candidate || "（空）";
        option.disabled = /^-.*-$/.test(candidate);
        select.append(option);
      }
      select.value = current;
      select.addEventListener("focus", () => this.selectRow(row, false));
      select.addEventListener("change", () => this.changeCell(row, column.field, select.value));
      cell.append(select);
      return cell;
    }

    const input = document.createElement("input");
    input.type = column.kind === "integer" ? "number" : "text";
    input.setAttribute("aria-label", column.title + "，第 " + (row + 1) + " 行");
    input.spellcheck = false;
    input.value = String(item[column.field] ?? "");
    input.addEventListener("focus", () => this.selectRow(row, false));
    if (column.kind === "integer") {
      input.addEventListener("change", () => {
        const parsed = Number.parseInt(input.value || "0", 10);
        this.changeCell(row, column.field, Number.isNaN(parsed) ? 0 : parsed);
      });
    } else {
      input.addEventListener("input", () => this.changeCell(row, column.field, input.value));
    }
    cell.append(input);
    return cell;
  }

  private changeCell(row: number, field: KtCodegenTableItemField, value: unknown): void {
    const wasDirty = this.core.dirty;
    if (!this.core.updateCell(row, field, value)) return;
    this.syncDirtyStatus();
    this.emitChange();
    this.emitDirtyTransition(wasDirty);
  }

  private selectRow(row: number, focus = true): void {
    this.core.select(row);
    this.syncSelection();
    if (focus) {
      this.root.querySelector<HTMLElement>("[data-row='" + row + "'] input, [data-row='" + row + "'] select")
        ?.focus();
    }
  }

  private handleAction(action: KtCodegenTableAction): void {
    const wasDirty = this.core.dirty;
    let changed = false;
    if (action === "autoFit") {
      this.fitColumnsToContents();
      this.render();
      this.setStatus("idle", "已根据当前内容调整列宽");
    } else if (action === "sort") changed = this.core.sortAndNormalize();
    else if (action === "copy") {
      if (this.core.copy()) this.setStatus("idle", "已复制当前行");
    } else if (action === "paste") changed = this.core.paste();
    else if (action === "insert") {
      this.core.insert();
      changed = true;
    } else if (action === "duplicate") changed = this.core.duplicate() !== undefined;
    else if (action === "moveUp") {
      changed = this.core.move(this.core.selectedRow ?? -1, "up") !== undefined;
    } else if (action === "moveDown") {
      changed = this.core.move(this.core.selectedRow ?? -1, "down") !== undefined;
    } else if (action === "delete") changed = this.core.delete();

    if (changed) {
      this.render();
      this.emitChange();
    }
    else this.syncActions();
    this.emitDirtyTransition(wasDirty);
  }

  private syncSelection(): void {
    for (const row of this.root.querySelectorAll<HTMLTableRowElement>("tbody tr")) {
      const selected = Number(row.dataset.row) === this.core.selectedRow;
      row.classList.toggle("selected", selected);
      row.setAttribute("aria-selected", String(selected));
      row.querySelector<HTMLButtonElement>(".row-number button")
        ?.setAttribute("aria-pressed", String(selected));
    }
    this.syncActions();
  }

  private syncActions(): void {
    const row = this.core.selectedRow;
    const hasSelection = row !== null && row >= 0 && row < this.param.items.length;
    this.disableAction("sort", this.param.items.length === 0);
    this.disableAction("copy", !hasSelection);
    this.disableAction("paste", !hasSelection || !this.core.hasClipboard);
    this.disableAction("duplicate", !hasSelection);
    this.disableAction("delete", !hasSelection);
    this.disableAction("moveUp", !hasSelection || row === 0);
    this.disableAction("moveDown", !hasSelection || row === this.param.items.length - 1);
  }

  /** 轻量复现 Qt resizeColumnsToContents；只改变组件布局，不修改表格数据。 */
  private fitColumnsToContents(): void {
    for (const column of this.columns) {
      const longest = this.param.items.reduce((length, item) => {
        const value = column.kind === "boolean" ? "true" : String(item[column.field] ?? "");
        return Math.max(length, [...value].length);
      }, [...column.title].length);
      const checkboxWidth = column.kind === "boolean" ? 72 : 0;
      this.fittedWidths.set(
        column.field,
        Math.max(checkboxWidth, Math.min(360, Math.max(72, longest * 8 + 28))),
      );
    }
  }

  private columnWidth(column: KtCodegenTableColumn): number {
    return this.fittedWidths.get(column.field) ?? column.width;
  }

  private disableAction(action: KtCodegenTableAction, disabled: boolean): void {
    const button = this.root.querySelector<HTMLButtonElement>("button[data-action='" + action + "']");
    if (button) button.disabled = disabled;
  }

  private syncDirtyStatus(): void {
    const status = this.root.querySelector<HTMLElement>("[data-role=status]");
    if (!status) return;
    status.textContent = this.core.dirty ? "有未保存的表格修改" : "";
    status.className = "status" + (this.core.dirty ? " dirty" : "");
  }

  private emitDirtyTransition(wasDirty: boolean): void {
    if (wasDirty === this.core.dirty) return;
    this.dispatchEvent(new CustomEvent<KtCodegenTableDirtyChangeDetail>(
      "kt-codegen-table-dirty-change",
      {
        bubbles: true,
        composed: true,
        detail: {
          dirty: this.core.dirty,
          documentRevision: this.core.documentRevision,
          itemCount: this.param.items.length,
        },
      },
    ));
  }

  private emitChange(): void {
    this.dispatchEvent(new CustomEvent<KtCodegenTableChangeDetail>(
      "kt-codegen-table-change",
      {
        bubbles: true,
        composed: true,
        detail: {
          documentRevision: this.core.documentRevision,
          itemCount: this.param.items.length,
        },
      },
    ));
  }
}

/** 显式注册 Web Component；重复调用安全，不产生模块加载副作用。 */
export function ktCodegenDefineTableElement(
  tagName = KT_CODEGEN_TABLE_TAG_NAME,
): typeof KtCodegenTable {
  const registered = customElements.get(tagName);
  if (registered) return registered as typeof KtCodegenTable;
  customElements.define(tagName, KtCodegenTable);
  return KtCodegenTable;
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-codegen-table": KtCodegenTable;
  }
}
