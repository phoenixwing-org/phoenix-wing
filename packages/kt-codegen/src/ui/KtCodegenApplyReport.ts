// SPDX-License-Identifier: Apache-2.0

import {
  ktCodegenApplyReportChangeLabel,
  ktCodegenApplyReportDuration,
  ktCodegenApplyReportHealthLabel,
  ktCodegenApplyReportTotals,
  ktCodegenFilterApplyReportItems,
  type KtCodegenApplyReportChange,
  type KtCodegenApplyReportHealth,
  type KtCodegenApplyReportItem,
  type KtCodegenApplyReportUiModel,
} from "./KtCodegenApplyReportModel.js";

export const KT_CODEGEN_APPLY_REPORT_SUMMARY_TAG_NAME = "kt-codegen-apply-report-summary";
export const KT_CODEGEN_APPLY_REPORT_TAG_NAME = "kt-codegen-apply-report";

export type KtCodegenApplyReportFilterDetail =
  | { readonly axis: "health"; readonly value: KtCodegenApplyReportHealth; readonly selected: boolean }
  | { readonly axis: "change"; readonly value: KtCodegenApplyReportChange; readonly selected: boolean };

export type KtCodegenApplyReportActionDetail =
  | { readonly action: "openDocument"; readonly documentId: string }
  | {
      readonly action: "openIssue";
      readonly documentId: string;
      readonly path: string;
      readonly line?: number;
    };

interface KtCodegenApplyReportSummaryModel {
  readonly items: readonly KtCodegenApplyReportItem[];
  readonly elapsedMilliseconds: number;
  readonly interactive: boolean;
  readonly health: ReadonlySet<KtCodegenApplyReportHealth>;
  readonly change: ReadonlySet<KtCodegenApplyReportChange>;
}

const STYLE = `
:host { display: block; min-width: 0; color: var(--vscode-foreground, var(--text, #172033)); font: 13px/1.45 var(--vscode-font-family, system-ui, sans-serif); }
* { box-sizing: border-box; }
button, select, input { font: inherit; }
button, select { color: inherit; background: var(--vscode-button-secondaryBackground, var(--btn-bg, transparent)); border: 1px solid var(--vscode-panel-border, var(--border, #d7dde8)); border-radius: 3px; }
button { cursor: pointer; }
button:disabled { opacity: .5; cursor: default; }
button:focus-visible, select:focus-visible, input:focus-visible { outline: 1px solid var(--vscode-focusBorder, var(--accent, #2563eb)); outline-offset: 1px; }
.toolbar { display: flex; min-width: 0; align-items: center; gap: 6px; margin-bottom: 10px; }
.toolbar label { color: var(--vscode-descriptionForeground, var(--muted, #64748b)); }
.toolbar select { flex: 1 1 360px; min-width: 120px; max-width: 520px; padding: 4px 7px; color: var(--vscode-dropdown-foreground, inherit); background: var(--vscode-dropdown-background, var(--input-bg, transparent)); }
.toolbar button { min-height: 28px; padding: 3px 8px; }
.toolbar .step { min-width: 29px; padding-inline: 6px; font-size: 16px; }
.single-document { min-width: 0; flex: 1 1 auto; overflow: hidden; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.summary { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 12px; }
.metric, .filter-chip { min-height: 28px; padding: 3px 8px; border: 1px solid var(--vscode-panel-border, var(--border, #d7dde8)); border-radius: 999px; background: var(--vscode-editorWidget-background, var(--panel-bg, transparent)); }
.metric { display: inline-flex; align-items: center; gap: 5px; color: var(--vscode-descriptionForeground, var(--muted, #64748b)); }
.metric strong, .filter-chip strong { color: var(--vscode-foreground, var(--text, #172033)); font-size: 12px; }
.filter-chip { display: inline-flex; align-items: center; gap: 5px; cursor: pointer; user-select: none; }
.filter-chip:hover { background: var(--vscode-list-hoverBackground, var(--hover, rgba(37, 99, 235, .08))); }
.filter-chip input { width: 12px; height: 12px; margin: 0; accent-color: currentColor; }
.filter-chip.off { color: var(--vscode-descriptionForeground, var(--muted, #64748b)); opacity: .58; background: transparent; }
h2 { margin: 16px 0 7px; font-size: 14px; }
.table-wrap { max-width: 100%; overflow: auto; border: 1px solid var(--vscode-panel-border, var(--border, #d7dde8)); border-radius: 5px; }
table { width: 100%; min-width: 830px; border-collapse: collapse; font-size: 12px; }
th, td { padding: 7px 8px; border-right: 1px solid var(--vscode-panel-border, var(--border, #d7dde8)); border-bottom: 1px solid var(--vscode-panel-border, var(--border, #d7dde8)); text-align: left; vertical-align: top; }
th { position: sticky; z-index: 1; top: 0; background: var(--vscode-editorWidget-background, var(--panel-head-bg, #f5f7fb)); white-space: nowrap; }
tr:last-child td { border-bottom: 0; }
td:last-child, th:last-child { border-right: 0; }
.document-link, .issue-link { max-width: 100%; padding: 0; color: var(--vscode-textLink-foreground, var(--accent, #2563eb)); background: none; border: 0; text-align: left; overflow-wrap: anywhere; }
.document-link:hover, .issue-link:hover { color: var(--vscode-textLink-activeForeground, var(--accent, #1d4ed8)); text-decoration: underline; }
.document-path { display: block; max-width: 300px; overflow: hidden; color: var(--vscode-descriptionForeground, var(--muted, #64748b)); text-overflow: ellipsis; white-space: nowrap; }
.status { display: inline-block; padding: 1px 6px; border: 1px solid currentColor; border-radius: 999px; white-space: nowrap; }
.health-success, .change-updated, .change-unchanged { color: var(--vscode-testing-iconPassed, #15803d); }
.health-warning, .change-partial { color: var(--vscode-editorWarning-foreground, #b45309); }
.health-error, .change-not-applied { color: var(--vscode-errorForeground, #b91c1c); }
.empty { padding: 14px; color: var(--vscode-descriptionForeground, var(--muted, #64748b)); text-align: center; }
.issues table { table-layout: fixed; min-width: 720px; }
.issues th:nth-child(1) { width: 18%; } .issues th:nth-child(2) { width: 8%; } .issues th:nth-child(3) { width: 16%; } .issues th:nth-child(4) { width: 34%; } .issues th:nth-child(5) { width: 24%; }
.issues td { overflow-wrap: anywhere; }
@media (max-width: 640px) { .toolbar { align-items: stretch; flex-wrap: wrap; } .toolbar label { flex: 1 0 100%; } .toolbar select { max-width: none; } }
`;

export class KtCodegenApplyReportSummary extends HTMLElement {
  private readonly root = this.attachShadow({ mode: "open" });
  private currentModel: KtCodegenApplyReportSummaryModel | undefined;

  get model(): KtCodegenApplyReportSummaryModel | undefined { return this.currentModel; }
  set model(value: KtCodegenApplyReportSummaryModel | undefined) { this.currentModel = value; this.render(); }
  connectedCallback(): void { this.render(); }

  private render(): void {
    if (!this.isConnected) return;
    const style = document.createElement("style");
    style.textContent = STYLE;
    const summary = document.createElement("div");
    summary.className = "summary";
    const model = this.currentModel;
    if (!model) {
      this.root.replaceChildren(style, summary);
      return;
    }
    const totals = ktCodegenApplyReportTotals(model.items);
    summary.append(this.metric("JSON", totals.total));
    if (model.interactive) {
      summary.append(
        this.filter("health", "success", "正常", totals.success, model.health.has("success")),
        this.filter("health", "warning", "警告", totals.warning, model.health.has("warning")),
        this.filter("health", "error", "错误", totals.error, model.health.has("error")),
        this.filter("change", "updated", "改写", totals.updated, model.change.has("updated")),
        this.filter("change", "unchanged", "一致", totals.unchanged, model.change.has("unchanged")),
        this.filter("change", "partial", "部分改写", totals.partial, model.change.has("partial")),
        this.filter("change", "not-applied", "未应用", totals.notApplied, model.change.has("not-applied")),
      );
    } else if (model.items[0]) {
      summary.append(
        this.metric(ktCodegenApplyReportHealthLabel(model.items[0].health), 1),
        this.metric(ktCodegenApplyReportChangeLabel(model.items[0].change), 1),
      );
    }
    summary.append(this.metric("耗时", ktCodegenApplyReportDuration(model.elapsedMilliseconds)));
    this.root.replaceChildren(style, summary);
  }

  private metric(label: string, value: string | number): HTMLElement {
    const metric = document.createElement("span");
    metric.className = "metric";
    const name = document.createElement("span");
    name.textContent = label;
    const count = document.createElement("strong");
    count.textContent = String(value);
    metric.append(name, count);
    return metric;
  }

  private filter<TAxis extends "health" | "change">(
    axis: TAxis,
    value: TAxis extends "health" ? KtCodegenApplyReportHealth : KtCodegenApplyReportChange,
    label: string,
    count: number,
    selected: boolean,
  ): HTMLLabelElement {
    const chip = document.createElement("label");
    chip.className = `filter-chip${selected ? "" : " off"}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selected;
    checkbox.setAttribute("aria-label", `筛选${label}`);
    checkbox.onchange = () => this.dispatchEvent(new CustomEvent<KtCodegenApplyReportFilterDetail>(
      "kt-codegen-apply-report-filter-change",
      { bubbles: true, composed: true, detail: { axis, value, selected: checkbox.checked } as KtCodegenApplyReportFilterDetail },
    ));
    const name = document.createElement("span");
    name.textContent = label;
    const total = document.createElement("strong");
    total.textContent = String(count);
    chip.append(checkbox, name, total);
    return chip;
  }
}

export class KtCodegenApplyReport extends HTMLElement {
  private readonly root = this.attachShadow({ mode: "open" });
  private readonly summary = document.createElement(KT_CODEGEN_APPLY_REPORT_SUMMARY_TAG_NAME) as KtCodegenApplyReportSummary;
  private currentModel: KtCodegenApplyReportUiModel | undefined;
  private documentId = "";
  private readonly health = new Set<KtCodegenApplyReportHealth>(["success", "warning", "error"]);
  private readonly change = new Set<KtCodegenApplyReportChange>(["updated", "unchanged", "partial", "not-applied"]);

  constructor() {
    super();
    this.summary.addEventListener("kt-codegen-apply-report-filter-change", (event) => {
      const detail = (event as CustomEvent<KtCodegenApplyReportFilterDetail>).detail;
      const values = detail.axis === "health" ? this.health : this.change;
      if (detail.selected) values.add(detail.value as never);
      else values.delete(detail.value as never);
      this.render();
    });
  }

  get model(): KtCodegenApplyReportUiModel | undefined { return this.currentModel; }
  set model(value: KtCodegenApplyReportUiModel | undefined) {
    this.currentModel = value;
    if (this.documentId && !value?.items.some((item) => item.documentId === this.documentId)) this.documentId = "";
    this.render();
  }
  connectedCallback(): void { this.render(); }

  private render(): void {
    if (!this.isConnected) return;
    const style = document.createElement("style");
    style.textContent = STYLE;
    const model = this.currentModel;
    if (!model) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "暂无 Codegen 应用报告。";
      this.root.replaceChildren(style, empty);
      return;
    }
    const documentItems = this.documentId
      ? model.items.filter((item) => item.documentId === this.documentId)
      : model.items;
    const visibleItems = ktCodegenFilterApplyReportItems(model.items, {
      ...(this.documentId ? { documentId: this.documentId } : {}),
      health: this.health,
      change: this.change,
    });
    this.summary.model = {
      items: documentItems,
      elapsedMilliseconds: documentItems.length === 1
        ? documentItems[0]!.elapsedMilliseconds
        : model.elapsedMilliseconds,
      interactive: documentItems.length !== 1,
      health: this.health,
      change: this.change,
    };
    this.root.replaceChildren(
      style,
      this.toolbar(model),
      this.summary,
      this.sectionTitle("运行明细"),
      this.itemTable(visibleItems),
      this.sectionTitle("问题列表"),
      this.issueTable(visibleItems),
    );
  }

  private toolbar(model: KtCodegenApplyReportUiModel): HTMLElement {
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    const label = document.createElement("label");
    label.textContent = "JSON";
    if (model.items.length === 1) {
      const single = document.createElement("span");
      single.className = "single-document";
      single.textContent = this.documentLabel(model.items[0]!);
      single.title = model.items[0]!.displayPath;
      toolbar.append(label, single, this.openDocumentButton(model.items[0]!.documentId));
      return toolbar;
    }
    const select = document.createElement("select");
    select.setAttribute("aria-label", "筛选报告中的 JSON");
    select.append(new Option(`全部 JSON（${model.items.length}）`, ""));
    for (const item of model.items) select.append(new Option(this.documentLabel(item), item.documentId));
    select.value = this.documentId;
    select.onchange = () => { this.documentId = select.value; this.render(); };
    const previous = this.stepButton("‹", -1, model);
    const next = this.stepButton("›", 1, model);
    toolbar.append(label, select, previous, next, this.openDocumentButton(this.documentId));
    return toolbar;
  }

  private documentLabel(item: KtCodegenApplyReportItem): string {
    return `${ktCodegenApplyReportHealthLabel(item.health)} · ${ktCodegenApplyReportChangeLabel(item.change)}｜${item.fileName}`;
  }

  private stepButton(label: string, offset: number, model: KtCodegenApplyReportUiModel): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "step";
    button.textContent = label;
    button.title = offset < 0 ? "上一个 JSON" : "下一个 JSON";
    button.onclick = () => {
      const ids = ["", ...model.items.map((item) => item.documentId)];
      const current = Math.max(0, ids.indexOf(this.documentId));
      this.documentId = ids[(current + offset + ids.length) % ids.length]!;
      this.render();
    };
    return button;
  }

  private openDocumentButton(documentId: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "打开 JSON";
    button.disabled = !documentId;
    button.onclick = () => this.emit({ action: "openDocument", documentId });
    return button;
  }

  private sectionTitle(text: string): HTMLHeadingElement {
    const title = document.createElement("h2");
    title.textContent = text;
    return title;
  }

  private itemTable(items: readonly KtCodegenApplyReportItem[]): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "table-wrap";
    const table = document.createElement("table");
    const head = document.createElement("thead");
    const header = document.createElement("tr");
    for (const label of ["JSON", "结果", "源码变化", "命中区域", "产物", "诊断", "预检错误", "修改文件", "写入区域", "耗时"]) {
      const cell = document.createElement("th"); cell.textContent = label; header.append(cell);
    }
    head.append(header);
    const body = document.createElement("tbody");
    if (!items.length) this.emptyRow(body, 10, "当前筛选没有运行明细。");
    for (const item of items) {
      const row = document.createElement("tr");
      const documentCell = document.createElement("td");
      const link = this.link(item.fileName, () => this.emit({ action: "openDocument", documentId: item.documentId }), "document-link");
      const path = document.createElement("small");
      path.className = "document-path";
      path.textContent = item.displayPath;
      path.title = item.displayPath;
      documentCell.append(link, path);
      row.append(documentCell);
      this.cell(row, this.status(ktCodegenApplyReportHealthLabel(item.health), `health-${item.health}`));
      this.cell(row, this.status(ktCodegenApplyReportChangeLabel(item.change), `change-${item.change}`));
      for (const value of [item.preflightRegionCount, item.preflightArtifactCount, item.preflightDiagnosticCount, item.preflightErrorCount, item.modifiedFileCount, item.writtenRegionCount, ktCodegenApplyReportDuration(item.elapsedMilliseconds)]) this.cell(row, value);
      body.append(row);
    }
    table.append(head, body);
    wrapper.append(table);
    return wrapper;
  }

  private issueTable(items: readonly KtCodegenApplyReportItem[]): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "table-wrap issues";
    const table = document.createElement("table");
    const head = document.createElement("thead");
    const header = document.createElement("tr");
    for (const label of ["JSON", "级别", "代码", "说明", "位置"]) {
      const cell = document.createElement("th"); cell.textContent = label; header.append(cell);
    }
    head.append(header);
    const body = document.createElement("tbody");
    let count = 0;
    for (const item of items) {
      for (const issue of item.issues) {
        count += 1;
        const row = document.createElement("tr");
        this.cell(row, this.link(item.fileName, () => this.emit({ action: "openDocument", documentId: item.documentId }), "document-link"));
        this.cell(row, issue.severity === "error" ? "错误" : "警告");
        const code = document.createElement("code"); code.textContent = issue.code; this.cell(row, code);
        this.cell(row, issue.message);
        const location = issue.path ? `${issue.path}${issue.line === undefined ? "" : `:${issue.line}`}` : "—";
        this.cell(row, issue.path
          ? this.link(location, () => this.emit({ action: "openIssue", documentId: item.documentId, path: issue.path!, ...(issue.line === undefined ? {} : { line: issue.line }) }), "issue-link")
          : location);
        body.append(row);
      }
    }
    if (!count) this.emptyRow(body, 5, "当前筛选没有错误或警告。");
    table.append(head, body);
    wrapper.append(table);
    return wrapper;
  }

  private link(label: string, action: () => void, className: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.onclick = action;
    return button;
  }

  private status(label: string, tone: string): HTMLElement {
    const value = document.createElement("span");
    value.className = `status ${tone}`;
    value.textContent = label;
    return value;
  }

  private cell(row: HTMLTableRowElement, content: string | number | Node): void {
    const cell = document.createElement("td");
    if (content instanceof Node) cell.append(content); else cell.textContent = String(content);
    row.append(cell);
  }

  private emptyRow(body: HTMLTableSectionElement, span: number, message: string): void {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = span;
    cell.className = "empty";
    cell.textContent = message;
    row.append(cell);
    body.append(row);
  }

  private emit(detail: KtCodegenApplyReportActionDetail): void {
    this.dispatchEvent(new CustomEvent<KtCodegenApplyReportActionDetail>(
      "kt-codegen-apply-report-action",
      { bubbles: true, composed: true, detail },
    ));
  }
}

export function ktCodegenDefineApplyReportElements(): void {
  if (!customElements.get(KT_CODEGEN_APPLY_REPORT_SUMMARY_TAG_NAME)) {
    customElements.define(KT_CODEGEN_APPLY_REPORT_SUMMARY_TAG_NAME, KtCodegenApplyReportSummary);
  }
  if (!customElements.get(KT_CODEGEN_APPLY_REPORT_TAG_NAME)) {
    customElements.define(KT_CODEGEN_APPLY_REPORT_TAG_NAME, KtCodegenApplyReport);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-codegen-apply-report-summary": KtCodegenApplyReportSummary;
    "kt-codegen-apply-report": KtCodegenApplyReport;
  }
}
