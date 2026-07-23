// SPDX-License-Identifier: Apache-2.0

import {
  ktCodegenDefineControlCatalogElement,
  type KtCodegenControlCatalog,
} from "./KtCodegenControlCatalog.js";
import type {
  KtCodegenPrimaryAction,
  KtCodegenPrimaryActionDetail,
  KtCodegenPrimaryDocumentUiModel,
  KtCodegenPrimaryReportUiModel,
  KtCodegenPrimaryUiModel,
} from "./KtCodegenUiContracts.js";
import {
  ktCodegenPrimaryActionDisabled,
  ktCodegenPrimaryControlsLocked,
} from "./KtCodegenPrimaryUiState.js";
import {
  ktCodegenApplyReportChangeLabel,
  ktCodegenApplyReportHealthLabel,
} from "./KtCodegenApplyReportModel.js";

export const KT_CODEGEN_PRIMARY_PANEL_TAG_NAME = "kt-codegen-primary-panel";

const STYLE = `
:host {
  --pnw-codegen-border: var(--vscode-panel-border, var(--border, color-mix(in srgb, currentColor 18%, transparent)));
  --pnw-codegen-bg: var(--vscode-editor-background, var(--sidebar-bg, #fff));
  --pnw-codegen-head-bg: var(--vscode-sideBarSectionHeader-background, var(--panel-head-bg, #f6f6f6));
  --pnw-codegen-muted: var(--vscode-descriptionForeground, var(--muted, #666));
  --pnw-codegen-hover: var(--vscode-list-hoverBackground, color-mix(in srgb, currentColor 8%, transparent));
  --pnw-codegen-active-bg: var(--vscode-list-activeSelectionBackground, var(--accent, #007acc));
  --pnw-codegen-active-fg: var(--vscode-list-activeSelectionForeground, #fff);
  --pnw-codegen-focus: var(--vscode-focusBorder, var(--accent, #007acc));
  position: relative; display: grid; grid-auto-rows: max-content; align-content: start; gap: 4px; min-height: 0; color: var(--vscode-foreground, var(--text, inherit));
  background: var(--vscode-sideBar-background, var(--sidebar-bg, #fff)); font: 12px/1.35 var(--vscode-font-family, system-ui, sans-serif);
}
* { box-sizing: border-box; }
button, input, select { font: inherit; }
button { cursor: pointer; }
button:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible { outline: 1px solid var(--pnw-codegen-focus); outline-offset: 1px; }
.pnw-codegen-actions { position: sticky; z-index: 12; top: 0; display: flex; flex-wrap: nowrap; gap: 2px; padding: 2px 5px 3px; overflow: hidden; background: var(--vscode-sideBar-background, var(--sidebar-bg, #fff)); border-bottom: 1px solid var(--pnw-codegen-border); }
.pnw-codegen-action { display: inline-grid; flex: 0 0 32px; width: 32px; height: 32px; min-height: 32px; place-items: center; padding: 0; color: var(--vscode-button-foreground, inherit); background: var(--vscode-button-background, var(--btn-bg, transparent)); border: 1px solid var(--pnw-codegen-border); border-radius: 3px; font-size: 17px; }
.pnw-codegen-action.pnw-codegen-secondary { color: inherit; background: var(--vscode-button-secondaryBackground, var(--btn-bg, transparent)); }
button:disabled { opacity: .5; cursor: not-allowed; }
.pnw-codegen-mini { min-width: 0; margin: 0 4px; overflow: hidden; border: 1px solid var(--pnw-codegen-border); border-radius: 5px; background: var(--pnw-codegen-bg); }
.pnw-codegen-mini > summary { display: flex; align-items: center; justify-content: space-between; gap: 5px; min-height: 28px; padding: 3px 5px; color: var(--pnw-codegen-muted); background: var(--pnw-codegen-head-bg); font-size: 11px; font-weight: 650; cursor: pointer; list-style: none; user-select: none; }
.pnw-codegen-mini > summary::-webkit-details-marker { display: none; }
.pnw-codegen-mini > summary::before { content: "›"; flex: 0 0 auto; font-size: 16px; line-height: 1; }
.pnw-codegen-mini[open] > summary::before { transform: rotate(90deg); }
.pnw-codegen-mini-title { margin-right: auto; color: var(--vscode-foreground, var(--text, inherit)); }
.pnw-codegen-mini-count { white-space: nowrap; font-weight: 500; }
.pnw-codegen-current-identity { display: flex; flex: 1 1 auto; min-width: 0; align-items: baseline; gap: 6px; }
.pnw-codegen-current-file { flex: 0 1 52%; max-width: 52%; overflow: hidden; color: inherit; text-overflow: ellipsis; white-space: nowrap; }
.pnw-codegen-current-meta { flex: 1 1 auto; overflow: hidden; color: var(--pnw-codegen-muted); font-size: 10px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.pnw-codegen-properties { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 6px; padding: 5px 6px; border-top: 1px solid var(--pnw-codegen-border); }
.pnw-codegen-property { display: grid; gap: 1px; min-width: 0; }
.pnw-codegen-property span { color: var(--pnw-codegen-muted); font-size: 10px; }
.pnw-codegen-property input { width: 100%; min-width: 0; height: 25px; padding: 2px 5px; color: inherit; background: var(--vscode-input-background, var(--input-bg, transparent)); border: 1px solid var(--pnw-codegen-border); border-radius: 2px; }
.pnw-codegen-list { display: grid; grid-auto-rows: 40px; max-height: 252px; overflow: auto; border-top: 1px solid var(--pnw-codegen-border); scrollbar-gutter: stable; }
.pnw-codegen-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1px 6px; width: 100%; padding: 3px 5px; color: inherit; background: transparent; border: 1px solid transparent; border-radius: 0; text-align: left; }
.pnw-codegen-row:hover { background: var(--pnw-codegen-hover); }
.pnw-codegen-row.pnw-codegen-active { color: var(--pnw-codegen-active-fg); background: var(--pnw-codegen-active-bg); border-color: var(--pnw-codegen-focus); }
.pnw-codegen-row-name, .pnw-codegen-row-path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pnw-codegen-row-name { font-weight: 600; }
.pnw-codegen-row-path { color: var(--pnw-codegen-muted); font-size: 11px; }
.pnw-codegen-tags { display: flex; align-items: center; justify-content: flex-end; gap: 4px; grid-row: 1 / span 2; grid-column: 2; }
.pnw-codegen-tag { padding: 1px 5px; color: var(--pnw-codegen-muted); border: 1px solid var(--pnw-codegen-border); border-radius: 999px; font-size: 10px; white-space: nowrap; }
.pnw-codegen-tag.pnw-codegen-warning { color: var(--vscode-editorWarning-foreground, #b45309); border-color: currentColor; }
.pnw-codegen-tag.pnw-codegen-error { color: var(--vscode-errorForeground, #b91c1c); border-color: currentColor; }
.pnw-codegen-tag.pnw-codegen-success { color: var(--vscode-testing-iconPassed, #15803d); border-color: currentColor; }
.pnw-codegen-candidates { grid-auto-rows: 30px; }
.pnw-codegen-candidate { display: flex; min-width: 0; min-height: 30px; align-items: center; gap: 6px; padding: 2px 4px; border: 0; border-bottom: 1px solid var(--pnw-codegen-border); }
.pnw-codegen-candidate-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pnw-codegen-candidate-name { font-weight: 600; }
.pnw-codegen-candidate-path { color: var(--pnw-codegen-muted); font-size: 11px; }
.pnw-codegen-empty, .pnw-codegen-hint { margin: 0; padding: 12px 8px; color: var(--pnw-codegen-muted); text-align: center; }
.pnw-codegen-report-directory { min-height: 25px; margin: 5px; padding: 2px 7px; color: inherit; background: var(--vscode-button-secondaryBackground, var(--btn-bg, transparent)); border: 1px solid var(--pnw-codegen-border); border-radius: 3px; }
.pnw-codegen-overlay { position: absolute; z-index: 20; inset: 0; display: grid; place-content: center; gap: 6px; padding: 16px; background: color-mix(in srgb, var(--pnw-codegen-bg) 88%, transparent); border: 1px solid var(--pnw-codegen-focus); border-radius: 6px; text-align: center; cursor: progress; }
.pnw-codegen-overlay[hidden] { display: none; }
`;

export class KtCodegenPrimaryPanel extends HTMLElement {
  private readonly root = this.attachShadow({ mode: "open" });
  /** Host snapshot 重绘时复用同一目录实例，保留筛选、Tree、滚动和焦点。 */
  private readonly controlCatalog = document.createElement("kt-codegen-control-catalog") as KtCodegenControlCatalog;
  private currentModel: KtCodegenPrimaryUiModel | undefined;
  private readonly expanded = new Map<string, boolean>([["current", true], ["documents", true], ["reports", true], ["controls", true], ["candidates", true]]);
  private readonly scrollOffsets = new Map<string, number>();

  get model(): KtCodegenPrimaryUiModel | undefined { return this.currentModel; }
  set model(value: KtCodegenPrimaryUiModel | undefined) { this.currentModel = value; this.render(); }
  connectedCallback(): void { this.render(); }

  private render(): void {
    if (!this.isConnected) return;
    const style = document.createElement("style");
    style.textContent = STYLE;
    const model = this.currentModel;
    if (!model) {
      this.root.replaceChildren(style, this.empty("Codegen 尚未激活。"));
      return;
    }
    const active = model.documents.find((item) => item.active || item.id === model.activeId);
    const batchLocked = model.operation === "batch-apply";
    const hostLocked = model.running && !model.operation;
    const actions = document.createElement("div");
    actions.className = "pnw-codegen-actions";
    actions.append(
      this.actionButton("▣", "openJson", model.capabilities.openJson && !batchLocked && !hostLocked, "打开一份 Codegen JSON"),
      this.actionButton("⇩", "importCsv", model.capabilities.importCsv && !batchLocked && !hostLocked, "导入或打开 CSV Codegen 配置"),
      this.actionButton("✓", "applyAll", model.capabilities.applyAll && model.documents.length > 0 && !batchLocked && !hostLocked, "全部应用"),
      this.actionButton(model.operation === "discovery" ? "×" : "↻", model.operation === "discovery" ? "cancelOperation" : "refresh", model.operation === "discovery" || (!model.operation && !hostLocked), model.operation === "discovery" ? "取消刷新" : "刷新配置"),
      this.actionButton(model.operation === "candidates" ? "×" : "⌕", model.operation === "candidates" ? "cancelOperation" : "scanCandidates", model.operation === "candidates" || (model.capabilities.scanCandidates && !model.operation && !hostLocked), model.operation === "candidates" ? "取消扫描" : "扫描控制符源码候选"),
    );
    const nodes: Node[] = [style, actions];
    if (active) nodes.push(this.currentConfig(active));
    nodes.push(
      this.documents(model),
      this.reports(model),
      this.controls(model),
      this.candidates(model),
    );
    const hint = document.createElement("p");
    hint.className = "pnw-codegen-hint";
    hint.textContent = "一份 JSON 对应当前编辑区一个表格 View；Primary 与 JSON View 的控制符目录由 Host session 同步。";
    nodes.push(hint, this.overlay(model));
    this.root.replaceChildren(...nodes);
  }

  private actionButton(label: string, action: KtCodegenPrimaryAction, enabled: boolean, title: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pnw-codegen-action pnw-codegen-secondary";
    button.textContent = label;
    button.title = title;
    button.disabled = ktCodegenPrimaryActionDisabled(this.currentModel, action, enabled);
    button.onclick = () => this.emit({ action });
    return button;
  }

  private currentConfig(active: KtCodegenPrimaryDocumentUiModel): HTMLDetailsElement {
    const details = this.details("current");
    const summary = document.createElement("summary");
    const identity = document.createElement("span");
    identity.className = "pnw-codegen-current-identity";
    const name = document.createElement("span");
    name.className = "pnw-codegen-current-file";
    name.textContent = active.fileName;
    const meta = document.createElement("span");
    meta.className = "pnw-codegen-current-meta";
    meta.textContent = `${active.className || "未命名类"} · ${active.itemCount} 行 · 当前编辑 View${active.dirty ? " · 未保存" : ""}${active.externalConflict ? " · 外部文件已变更" : ""}`;
    identity.append(name, meta);
    summary.append(identity);
    const properties = document.createElement("div");
    properties.className = "pnw-codegen-properties";
    properties.append(
      this.property("Prefix", "namePrefix", active),
      this.property("Middle", "nameMiddle", active),
      this.property("Namespace", "nameSpace", active),
      this.property("Append", "appendFunction", active),
    );
    details.append(summary, properties);
    return details;
  }

  private property(label: string, field: "namePrefix" | "nameMiddle" | "nameSpace" | "appendFunction", active: KtCodegenPrimaryDocumentUiModel): HTMLLabelElement {
    const wrapper = document.createElement("label");
    wrapper.className = "pnw-codegen-property";
    const caption = document.createElement("span");
    caption.textContent = label;
    const input = document.createElement("input");
    input.value = active[field];
    input.disabled = Boolean(this.currentModel?.running || this.currentModel?.operation);
    input.spellcheck = false;
    input.onchange = () => this.emit({ action: "updateMeta", id: active.id, field, value: input.value });
    wrapper.append(caption, input);
    return wrapper;
  }

  private documents(model: KtCodegenPrimaryUiModel): HTMLDetailsElement {
    const details = this.details("documents", "JSON 配置", model.documents.length ? `${model.documents.length} 份` : "");
    const list = this.list("documents");
    for (const item of model.documents) {
      const row = this.row(item.fileName, `${item.className || "未命名类"} · ${item.displayPath}`);
      row.classList.toggle("pnw-codegen-active", item.active);
      const tags = row.querySelector<HTMLElement>(".pnw-codegen-tags")!;
      tags.append(this.tag(`${item.itemCount} 行`));
      if (item.open) tags.append(this.tag(item.active ? "当前" : "已开"));
      if (item.dirty) tags.append(this.tag("未保存", "warning"));
      if (item.externalConflict) tags.append(this.tag(item.externalState === "deleted" ? "磁盘已删除" : "外部变更", "error"));
      row.onclick = () => this.emit({ action: "openDocument", id: item.id });
      list.append(row);
    }
    if (!model.documents.length) list.append(this.empty(model.operation === "discovery" ? "正在查找 Codegen JSON…" : "暂无 Codegen JSON"));
    details.append(list);
    return details;
  }

  private reports(model: KtCodegenPrimaryUiModel): HTMLDetailsElement {
    const details = this.details("reports", "应用报告", model.reports.length ? `${model.reports.length} 份` : "");
    const list = this.list("reports");
    for (const report of model.reports.slice(0, 20)) {
      const row = this.row(report.subject, new Date(report.startedAt).toLocaleString());
      const tags = row.querySelector<HTMLElement>(".pnw-codegen-tags")!;
      tags.append(
        this.tag(report.applyKind === "batch" ? `批量 ${report.itemCount}` : "单次"),
        this.tag(this.healthLabel(report.health), report.health),
        this.tag(this.changeLabel(report.change), report.change === "not-applied" ? "error" : report.change === "partial" ? "warning" : "success"),
      );
      row.onclick = () => this.emit({ action: "openReport", id: report.id });
      list.append(row);
    }
    if (!model.reports.length) list.append(this.empty("执行 Apply 后会在这里保留报告。"));
    details.append(list);
    if (model.capabilities.openReportDirectory) {
      const directory = document.createElement("button");
      directory.type = "button";
      directory.className = "pnw-codegen-report-directory";
      directory.textContent = "打开报告目录";
      directory.onclick = () => this.emit({ action: "openReportDirectory" });
      details.append(directory);
    }
    return details;
  }

  private controls(model: KtCodegenPrimaryUiModel): HTMLDetailsElement {
    const details = this.details("controls", "控制符目录", "会话级");
    const controls = model.controls;
    if (!controls) {
      details.append(this.empty("打开一份 Codegen 配置后显示控制符目录。"));
      return details;
    }
    this.controlCatalog.setAttribute("mode", "compact");
    this.controlCatalog.disabled = ktCodegenPrimaryControlsLocked(model);
    this.controlCatalog.outputEnabled = Boolean(model.capabilities.outputControlTemplates);
    this.controlCatalog.model = controls;
    details.append(this.controlCatalog);
    return details;
  }

  private candidates(model: KtCodegenPrimaryUiModel): HTMLDetailsElement {
    const details = this.details("candidates", "控制符候选（工作区级）", model.candidates.length ? `${model.candidates.length} 个` : "");
    const list = this.list("candidates");
    list.classList.add("pnw-codegen-candidates");
    for (const candidate of model.candidates) {
      const separator = Math.max(candidate.displayPath.lastIndexOf("/"), candidate.displayPath.lastIndexOf("\\"));
      const name = separator < 0 ? candidate.displayPath : candidate.displayPath.slice(separator + 1);
      const directory = separator < 0 ? "" : candidate.displayPath.slice(0, separator);
      const row = document.createElement("button");
      row.type = "button";
      row.className = "pnw-codegen-row pnw-codegen-candidate";
      const label = document.createElement("span");
      label.className = "pnw-codegen-candidate-label";
      const strong = document.createElement("span");
      strong.className = "pnw-codegen-candidate-name";
      strong.textContent = name;
      const path = document.createElement("span");
      path.className = "pnw-codegen-candidate-path";
      path.textContent = directory ? ` · ${directory}` : "";
      label.append(strong, path);
      const tags = document.createElement("span");
      tags.className = "pnw-codegen-tags";
      tags.append(this.tag(`${candidate.markerCount} 标记`), this.tag(candidate.encoding));
      row.append(label, tags);
      row.onclick = () => this.emit({ action: "openCandidate", id: candidate.id });
      list.append(row);
    }
    if (!model.candidates.length) list.append(this.empty(model.operation === "candidates" ? "正在扫描候选源码…" : "点击“扫描候选源码”建立工作区控制符列表"));
    details.append(list);
    return details;
  }

  private details(key: string, title?: string, count = ""): HTMLDetailsElement {
    const details = document.createElement("details");
    details.className = "pnw-codegen-mini";
    details.open = this.expanded.get(key) ?? true;
    details.ontoggle = () => this.expanded.set(key, details.open);
    if (title) {
      const summary = document.createElement("summary");
      const name = document.createElement("span");
      name.className = "pnw-codegen-mini-title";
      name.textContent = title;
      const value = document.createElement("span");
      value.className = "pnw-codegen-mini-count";
      value.textContent = count;
      summary.append(name, value);
      details.append(summary);
    }
    return details;
  }

  private list(key: string): HTMLDivElement {
    const list = document.createElement("div");
    list.className = "pnw-codegen-list";
    list.scrollTop = this.scrollOffsets.get(key) ?? 0;
    list.onscroll = () => this.scrollOffsets.set(key, list.scrollTop);
    return list;
  }

  private row(nameText: string, pathText: string): HTMLButtonElement {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "pnw-codegen-row";
    const name = document.createElement("span");
    name.className = "pnw-codegen-row-name";
    name.textContent = nameText;
    const path = document.createElement("span");
    path.className = "pnw-codegen-row-path";
    path.textContent = pathText;
    const tags = document.createElement("span");
    tags.className = "pnw-codegen-tags";
    row.append(name, path, tags);
    return row;
  }

  private tag(text: string, tone?: "success" | "warning" | "error"): HTMLElement {
    const tag = document.createElement("span");
    tag.className = `pnw-codegen-tag${tone ? ` pnw-codegen-${tone}` : ""}`;
    tag.textContent = text;
    return tag;
  }

  private overlay(model: KtCodegenPrimaryUiModel): HTMLElement {
    const overlay = document.createElement("div");
    overlay.className = "pnw-codegen-overlay";
    overlay.hidden = model.operation !== "batch-apply" || !model.batch;
    const title = document.createElement("strong");
    title.textContent = model.batch ? `正在全部应用 ${model.batch.current} / ${model.batch.total}` : "正在全部应用";
    const file = document.createElement("span");
    file.textContent = model.batch?.fileName ?? "正在准备 JSON View…";
    overlay.append(title, file);
    return overlay;
  }

  private healthLabel(value: KtCodegenPrimaryReportUiModel["health"]): string { return ktCodegenApplyReportHealthLabel(value); }
  private changeLabel(value: KtCodegenPrimaryReportUiModel["change"]): string { return ktCodegenApplyReportChangeLabel(value); }
  private empty(text: string): HTMLElement { const value = document.createElement("div"); value.className = "pnw-codegen-empty"; value.textContent = text; return value; }
  private emit(detail: KtCodegenPrimaryActionDetail): void { this.dispatchEvent(new CustomEvent<KtCodegenPrimaryActionDetail>("kt-codegen-primary-action", { bubbles: true, composed: true, detail })); }
}

export function ktCodegenDefinePrimaryPanelElement(tagName = KT_CODEGEN_PRIMARY_PANEL_TAG_NAME): typeof KtCodegenPrimaryPanel {
  ktCodegenDefineControlCatalogElement();
  const registered = customElements.get(tagName);
  if (registered) return registered as typeof KtCodegenPrimaryPanel;
  customElements.define(tagName, KtCodegenPrimaryPanel);
  return KtCodegenPrimaryPanel;
}

declare global { interface HTMLElementTagNameMap { "kt-codegen-primary-panel": KtCodegenPrimaryPanel; } }
