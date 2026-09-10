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
import {
  KT_CODEGEN_TABLE_ACTIONS,
  ktCodegenFitTableColumnWidths,
  ktCodegenNormalizeTableLayout,
  ktCodegenTableColumnWidth,
  ktCodegenTableCountLabel,
  ktCodegenTableDisabledActions,
  ktCodegenTableDisclosure,
  ktCodegenTableSelectOptions,
  type KtCodegenTableAction,
  type KtCodegenTableLayout,
  type KtCodegenTableOptions,
} from "./KtCodegenTableViewModel.js";
import {
  KT_CODEGEN_TABLE_CLASSES,
  KT_CODEGEN_TABLE_STYLE,
} from "./KtCodegenTableStyle.js";

export type {
  KtCodegenTableLayout,
  KtCodegenTableOptions,
} from "./KtCodegenTableViewModel.js";

/** 默认 Web Component 标签名。 */
export const KT_CODEGEN_TABLE_TAG_NAME = "kt-codegen-table";

const KT_CODEGEN_TABLE_TOGGLE_ID = "pnw-kt-codegen-table-toggle";
const KT_CODEGEN_TABLE_SHELL_ID = "pnw-kt-codegen-table-shell";
const KT_CODEGEN_TABLE_STATUSBAR_ID = "pnw-kt-codegen-table-statusbar";

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

/** 用户通过 Header disclosure button 改变折叠状态。 */
export interface KtCodegenTableCollapseChangeDetail {
  readonly collapsed: boolean;
}

export type KtCodegenTableStatus = "idle" | "saving" | "saved" | "error";

/**
 * 独立的 Codegen 17列表格 Web Component。
 *
 * 组件内部使用 KtCodegenTableCore；宿主通过 setData/getData 在文档级动作时
 * 交换整表，只在 clean/dirty 状态跃迁时接收 kt-codegen-table-dirty-change。
 */
export class KtCodegenTable extends HTMLElement {
  static get observedAttributes(): readonly string[] {
    return ["layout", "collapsible", "collapsed"];
  }

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

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (name === "layout" && newValue !== null) {
      const normalized = ktCodegenNormalizeTableLayout(newValue);
      if (newValue !== normalized) {
        this.setAttribute("layout", normalized);
        return;
      }
    }
    this.syncDisclosure();
  }

  /** contained 为组件内双向滚动；page 为页面自然高度和表格横向滚动。 */
  get layout(): KtCodegenTableLayout {
    return ktCodegenNormalizeTableLayout(this.getAttribute("layout"));
  }

  set layout(value: KtCodegenTableLayout) {
    this.setAttribute("layout", ktCodegenNormalizeTableLayout(value));
  }

  /** 是否允许用户通过 Header button 展开/收起。 */
  get collapsible(): boolean {
    return this.hasAttribute("collapsible");
  }

  set collapsible(value: boolean) {
    this.toggleAttribute("collapsible", Boolean(value));
  }

  /** 宿主可静默控制的折叠偏好；只有 collapsible 同时存在时才隐藏内容。 */
  get collapsed(): boolean {
    return this.hasAttribute("collapsed");
  }

  set collapsed(value: boolean) {
    this.toggleAttribute("collapsed", Boolean(value));
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

  markCheckpoint(
    documentRevision = this.core.documentRevision,
    savedItems?: KtCodegenTableData["items"],
  ): void {
    const wasDirty = this.core.dirty;
    this.core.markCheckpoint(documentRevision, savedItems);
    if (savedItems === undefined) this.render();
    else {
      // 保存回执不修改当前数据；不要重绘正在编辑的输入框或移走焦点。
      this.syncActions();
      this.syncDirtyStatus();
    }
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
    element.className = status === "error"
      ? `${KT_CODEGEN_TABLE_CLASSES.status} ${KT_CODEGEN_TABLE_CLASSES.error}`
      : KT_CODEGEN_TABLE_CLASSES.status;
  }

  private build(): void {
    const style = document.createElement("style");
    style.textContent = KT_CODEGEN_TABLE_STYLE;

    const toolbar = document.createElement("header");
    toolbar.className = KT_CODEGEN_TABLE_CLASSES.toolbar;
    const plainCaption = document.createElement("span");
    plainCaption.className = KT_CODEGEN_TABLE_CLASSES.caption;
    plainCaption.dataset.role = "plain-caption";
    plainCaption.textContent = "参数表";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.id = KT_CODEGEN_TABLE_TOGGLE_ID;
    toggle.className = KT_CODEGEN_TABLE_CLASSES.collapseToggle;
    toggle.dataset.role = "collapse-toggle";
    toggle.setAttribute(
      "aria-controls",
      `${KT_CODEGEN_TABLE_SHELL_ID} ${KT_CODEGEN_TABLE_STATUSBAR_ID}`,
    );
    toggle.addEventListener("click", () => this.handleCollapseToggle());
    const indicator = document.createElement("span");
    indicator.className = KT_CODEGEN_TABLE_CLASSES.collapseIndicator;
    indicator.dataset.role = "collapse-indicator";
    indicator.setAttribute("aria-hidden", "true");
    const caption = document.createElement("span");
    caption.className = KT_CODEGEN_TABLE_CLASSES.caption;
    caption.textContent = "参数表";
    toggle.append(indicator, caption);
    toolbar.append(plainCaption, toggle);
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
    shell.id = KT_CODEGEN_TABLE_SHELL_ID;
    shell.className = KT_CODEGEN_TABLE_CLASSES.shell;
    shell.dataset.role = "table-shell";
    shell.setAttribute("aria-label", "参数表内容");
    const table = document.createElement("table");
    table.setAttribute("aria-label", "Codegen 参数表");
    const head = document.createElement("thead");
    head.dataset.role = "head";
    const body = document.createElement("tbody");
    body.dataset.role = "body";
    table.append(head, body);
    const empty = document.createElement("div");
    empty.className = KT_CODEGEN_TABLE_CLASSES.empty;
    empty.dataset.role = "empty";
    empty.setAttribute("role", "note");
    empty.textContent = "当前 JSON 没有参数行。点击“插入”创建第一行。";
    shell.append(table, empty);

    const footer = document.createElement("footer");
    footer.id = KT_CODEGEN_TABLE_STATUSBAR_ID;
    footer.className = KT_CODEGEN_TABLE_CLASSES.statusbar;
    footer.dataset.role = "statusbar";
    const count = document.createElement("span");
    count.dataset.role = "count";
    const status = document.createElement("span");
    status.className = KT_CODEGEN_TABLE_CLASSES.status;
    status.dataset.role = "status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    footer.append(count, status);

    this.root.replaceChildren(style, toolbar, shell, footer);
    this.syncDisclosure();
  }

  private render(): void {
    if (!this.isConnected) return;
    this.renderHead();
    this.renderRows();
    this.syncActions();
    this.syncDirtyStatus();
    this.syncDisclosure();
  }

  private renderHead(): void {
    const head = this.root.querySelector<HTMLElement>("[data-role=head]");
    if (!head) return;
    const row = document.createElement("tr");
    const number = document.createElement("th");
    number.className = KT_CODEGEN_TABLE_CLASSES.rowNumber;
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
      if (selected) row.className = KT_CODEGEN_TABLE_CLASSES.selectedRow;
      row.setAttribute("aria-selected", String(selected));
      const number = document.createElement("td");
      number.className = KT_CODEGEN_TABLE_CLASSES.rowNumber;
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
    count.textContent = ktCodegenTableCountLabel(this.param.items.length, this.columns.length);
  }

  private createCell(row: number, column: KtCodegenTableColumn): HTMLTableCellElement {
    const item = this.param.items[row]!;
    const cell = document.createElement("td");
    const width = this.columnWidth(column);
    cell.style.width = width + "px";
    cell.style.minWidth = width + "px";
    if (column.kind === "boolean") {
      cell.className = KT_CODEGEN_TABLE_CLASSES.booleanCell;
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(item[column.field]);
      input.setAttribute("aria-label", column.title + "，第 " + (row + 1) + " 行");
      input.addEventListener("focus", () => this.selectRow(row, false));
      input.addEventListener("change", () => this.changeCell(row, column.field, input.checked));
      cell.append(input);
      return cell;
    }

    const current = String(item[column.field] ?? "");
    const selectOptions = ktCodegenTableSelectOptions(column, current, this.options);
    if (selectOptions) {
      const select = document.createElement("select");
      select.setAttribute("aria-label", column.title + "，第 " + (row + 1) + " 行");
      for (const descriptor of selectOptions) {
        const option = document.createElement("option");
        option.value = descriptor.value;
        option.textContent = descriptor.label;
        option.disabled = descriptor.disabled;
        if (descriptor.unknown) option.className = KT_CODEGEN_TABLE_CLASSES.unknownOption;
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

  private handleCollapseToggle(): void {
    if (!this.collapsible) return;
    this.collapsed = !this.collapsed;
    this.dispatchEvent(new CustomEvent<KtCodegenTableCollapseChangeDetail>(
      "kt-codegen-table-collapse-change",
      {
        bubbles: true,
        composed: true,
        detail: { collapsed: this.collapsed },
      },
    ));
  }

  private syncDisclosure(): void {
    const plainCaption = this.root.querySelector<HTMLElement>("[data-role=plain-caption]");
    const toggle = this.root.querySelector<HTMLButtonElement>("[data-role=collapse-toggle]");
    const indicator = this.root.querySelector<HTMLElement>("[data-role=collapse-indicator]");
    const shell = this.root.querySelector<HTMLElement>("[data-role=table-shell]")
      ?? this.root.querySelector<HTMLElement>(`.${KT_CODEGEN_TABLE_CLASSES.shell}`);
    const statusbar = this.root.querySelector<HTMLElement>("[data-role=statusbar]")
      ?? this.root.querySelector<HTMLElement>(`.${KT_CODEGEN_TABLE_CLASSES.statusbar}`);
    if (!plainCaption || !toggle || !indicator || !shell || !statusbar) return;

    const disclosure = ktCodegenTableDisclosure({
      collapsible: this.collapsible,
      collapsed: this.collapsed,
    });
    const active = this.root.activeElement;
    plainCaption.hidden = !disclosure.disabled;
    toggle.hidden = disclosure.disabled;
    toggle.disabled = disclosure.disabled;
    toggle.title = disclosure.label;
    toggle.setAttribute("aria-label", disclosure.label);
    toggle.setAttribute("aria-expanded", String(disclosure.expanded));
    indicator.textContent = disclosure.indicator;
    shell.hidden = disclosure.hidden;
    statusbar.hidden = disclosure.hidden;
    if (disclosure.hidden && active && (shell.contains(active) || statusbar.contains(active))) {
      toggle.focus();
    }
  }

  private syncSelection(): void {
    for (const row of this.root.querySelectorAll<HTMLTableRowElement>("tbody tr")) {
      const selected = Number(row.dataset.row) === this.core.selectedRow;
      row.classList.toggle(KT_CODEGEN_TABLE_CLASSES.selectedRow, selected);
      row.setAttribute("aria-selected", String(selected));
      row.querySelector<HTMLButtonElement>(`.${KT_CODEGEN_TABLE_CLASSES.rowNumber} button`)
        ?.setAttribute("aria-pressed", String(selected));
    }
    this.syncActions();
  }

  private syncActions(): void {
    const disabled = ktCodegenTableDisabledActions({
      itemCount: this.param.items.length,
      selectedRow: this.core.selectedRow,
      hasClipboard: this.core.hasClipboard,
    });
    for (const [action] of KT_CODEGEN_TABLE_ACTIONS) {
      this.disableAction(action, disabled.has(action));
    }
  }

  /** 轻量复现 Qt resizeColumnsToContents；只改变组件布局，不修改表格数据。 */
  private fitColumnsToContents(): void {
    this.fittedWidths.clear();
    for (const [field, width] of ktCodegenFitTableColumnWidths(this.columns, this.param.items)) {
      this.fittedWidths.set(field, width);
    }
  }

  private columnWidth(column: KtCodegenTableColumn): number {
    return ktCodegenTableColumnWidth(column, this.fittedWidths);
  }

  private disableAction(action: KtCodegenTableAction, disabled: boolean): void {
    const button = this.root.querySelector<HTMLButtonElement>("button[data-action='" + action + "']");
    if (button) button.disabled = disabled;
  }

  private syncDirtyStatus(): void {
    const status = this.root.querySelector<HTMLElement>("[data-role=status]");
    if (!status) return;
    status.textContent = this.core.dirty ? "有未保存的表格修改" : "";
    status.className = this.core.dirty
      ? `${KT_CODEGEN_TABLE_CLASSES.status} ${KT_CODEGEN_TABLE_CLASSES.dirty}`
      : KT_CODEGEN_TABLE_CLASSES.status;
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

  interface HTMLElementEventMap {
    "kt-codegen-table-change": CustomEvent<KtCodegenTableChangeDetail>;
    "kt-codegen-table-collapse-change": CustomEvent<KtCodegenTableCollapseChangeDetail>;
    "kt-codegen-table-dirty-change": CustomEvent<KtCodegenTableDirtyChangeDetail>;
  }
}
