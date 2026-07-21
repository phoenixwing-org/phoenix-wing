// SPDX-License-Identifier: Apache-2.0

import { KT_CODEGEN_BLOCK_PRESENTATIONS } from "../KtCodegenBlockPresentation.js";
import type { KtCodegenBlockKey } from "../blocks/legacy-blocks.js";
import type { KtCodegenDiagnostic } from "../model/diagnostic.js";
import {
  ktCodegenClampControlSplitPercent,
  ktCodegenControlResultItems,
  ktCodegenControlUnclosedForDiagnostic,
  type KtCodegenControlResultItem,
} from "./KtCodegenControlViewModel.js";
import type {
  KtCodegenControlCopyEndDetail,
  KtCodegenControlOpenDetail,
  KtCodegenControlSplitDetail,
  KtCodegenControlUiFilter,
  KtCodegenControlUiModel,
} from "./KtCodegenUiContracts.js";

export const KT_CODEGEN_CONTROL_PANEL_TAG_NAME = "kt-codegen-control-panel";

const STYLE = `
:host {
  --pnw-codegen-border: var(--vscode-panel-border, var(--border, color-mix(in srgb, currentColor 18%, transparent)));
  --pnw-codegen-bg: var(--vscode-editor-background, var(--sidebar-bg, #fff));
  --pnw-codegen-head-bg: var(--vscode-editorWidget-background, var(--panel-head-bg, #f6f6f6));
  --pnw-codegen-muted: var(--vscode-descriptionForeground, var(--muted, #666));
  --pnw-codegen-hover: var(--vscode-list-hoverBackground, color-mix(in srgb, currentColor 8%, transparent));
  --pnw-codegen-active-bg: var(--vscode-list-activeSelectionBackground, var(--accent, #007acc));
  --pnw-codegen-active-fg: var(--vscode-list-activeSelectionForeground, #fff);
  --pnw-codegen-focus: var(--vscode-focusBorder, var(--accent, #007acc));
  display: block; min-width: 0; min-height: 0; color: var(--vscode-foreground, var(--text, inherit));
  background: var(--pnw-codegen-bg); font: 12px/1.35 var(--vscode-font-family, system-ui, sans-serif);
}
* { box-sizing: border-box; }
button, input { font: inherit; }
button { cursor: pointer; }
button:focus-visible, [tabindex]:focus-visible { outline: 1px solid var(--pnw-codegen-focus); outline-offset: -1px; }
.pnw-codegen-title { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-height: 34px; padding: 5px 8px; color: var(--pnw-codegen-muted); background: var(--pnw-codegen-head-bg); border-bottom: 1px solid var(--pnw-codegen-border); font-size: 11px; font-weight: 650; }
.pnw-codegen-title-name { color: var(--vscode-foreground, var(--text, inherit)); }
.pnw-codegen-spacer { flex: 1 1 auto; }
.pnw-codegen-filter { min-height: 24px; padding: 2px 7px; color: inherit; background: var(--vscode-button-secondaryBackground, var(--btn-bg, transparent)); border: 1px solid var(--pnw-codegen-border); border-radius: 3px; }
.pnw-codegen-filter[aria-pressed="true"] { color: var(--pnw-codegen-active-fg); background: var(--pnw-codegen-active-bg); border-color: var(--pnw-codegen-active-bg); }
.pnw-codegen-path-toggle { display: inline-flex; align-items: center; gap: 4px; min-height: 24px; white-space: nowrap; cursor: pointer; }
.pnw-codegen-path-toggle input { margin: 0; }
.pnw-codegen-cache { white-space: nowrap; font-weight: 500; }
.pnw-codegen-summary { padding: 8px 9px; color: var(--pnw-codegen-muted); border-bottom: 1px solid var(--pnw-codegen-border); }
.pnw-codegen-layout { display: grid; grid-template-columns: minmax(180px, var(--pnw-codegen-master, 42%)) 7px minmax(0, 1fr); min-width: 0; align-items: start; }
.pnw-codegen-master { min-width: 0; overflow-x: hidden; }
.pnw-codegen-row { display: grid; width: 100%; min-width: 0; min-height: 41px; gap: 2px; padding: 6px 9px; color: inherit; background: transparent; border: 0; border-bottom: 1px solid var(--pnw-codegen-border); text-align: left; }
.pnw-codegen-row:hover { background: var(--pnw-codegen-hover); }
.pnw-codegen-row[aria-pressed="true"] { color: var(--pnw-codegen-active-fg); background: var(--pnw-codegen-active-bg); }
.pnw-codegen-row.pnw-codegen-error { border-left: 3px solid var(--vscode-errorForeground, #dc2626); }
.pnw-codegen-row.pnw-codegen-warning { border-left: 3px solid var(--vscode-editorWarning-foreground, #d97706); }
.pnw-codegen-heading { display: flex; min-width: 0; align-items: center; gap: 6px; overflow: hidden; }
.pnw-codegen-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pnw-codegen-id { flex: 0 0 auto; padding: 1px 4px; color: var(--pnw-codegen-muted); border: 1px solid var(--pnw-codegen-border); border-radius: 999px; font-size: 10px; font-weight: 500; }
.pnw-codegen-meta { overflow: hidden; color: var(--pnw-codegen-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.pnw-codegen-meta.pnw-codegen-path { overflow-wrap: anywhere; white-space: normal; }
.pnw-codegen-splitter { position: relative; align-self: stretch; min-height: 100%; padding: 0; background: transparent; border: 0; cursor: col-resize; touch-action: none; }
.pnw-codegen-splitter::before { content: ""; position: absolute; inset: 0 3px; background: var(--pnw-codegen-border); }
.pnw-codegen-splitter:hover::before, .pnw-codegen-splitter:focus-visible::before { background: var(--pnw-codegen-focus); }
.pnw-codegen-detail { display: flex; position: sticky; top: var(--pnw-codegen-detail-sticky-top, 58px); align-self: start; min-width: 0; height: var(--pnw-codegen-detail-height, calc(100vh - 74px)); max-height: var(--pnw-codegen-detail-height, calc(100vh - 74px)); padding: 10px; overflow: hidden; background: var(--pnw-codegen-bg); }
.pnw-codegen-detail-content { display: flex; flex: 1 1 auto; min-width: 0; min-height: 0; flex-direction: column; }
.pnw-codegen-detail-header { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 2px 6px; padding-bottom: 5px; border-bottom: 1px solid var(--pnw-codegen-border); }
.pnw-codegen-detail-header h3 { display: flex; min-width: 0; align-items: center; gap: 6px; margin: 0; overflow: hidden; font-size: 13px; }
.pnw-codegen-detail-summary, .pnw-codegen-detail-message { grid-column: 1 / -1; min-width: 0; margin: 0; overflow: hidden; color: var(--pnw-codegen-muted); text-overflow: ellipsis; white-space: nowrap; }
.pnw-codegen-detail-summary { font-size: 10px; }
.pnw-codegen-detail-message { color: inherit; white-space: normal; }
.pnw-codegen-actions { display: flex; grid-column: 2; grid-row: 1; gap: 3px; }
.pnw-codegen-actions button { min-height: 24px; padding: 2px 7px; color: inherit; background: var(--vscode-button-secondaryBackground, var(--btn-bg, transparent)); border: 1px solid var(--pnw-codegen-border); border-radius: 3px; white-space: nowrap; }
.pnw-codegen-preview { display: block; flex: 1 1 auto; min-height: 120px; margin: 9px 0 0; padding: 9px; overflow: auto; color: var(--vscode-editor-foreground, var(--text, inherit)); background: var(--vscode-textCodeBlock-background, color-mix(in srgb, var(--pnw-codegen-bg) 82%, #888)); border: 1px solid var(--pnw-codegen-border); border-radius: 5px; font: 12px/1.45 var(--vscode-editor-font-family, ui-monospace, monospace); white-space: pre; }
.pnw-codegen-empty { padding: 22px 12px; color: var(--pnw-codegen-muted); text-align: center; }
@media (max-width: 680px) { .pnw-codegen-layout { grid-template-columns: minmax(150px, var(--pnw-codegen-master, 42%)) 7px minmax(0, 1fr); } .pnw-codegen-detail { padding: 8px; } }
`;

const presentationByKey = new Map(KT_CODEGEN_BLOCK_PRESENTATIONS.map((item) => [item.key, item]));

export class KtCodegenControlPanel extends HTMLElement {
  private readonly root = this.attachShadow({ mode: "open" });
  private currentModel: KtCodegenControlUiModel | undefined;
  private resultFilter: KtCodegenControlUiFilter = "hits";
  private selectedResultKey: string | undefined;
  private currentSplitRatio = 42;
  private showResultPaths = false;

  get model(): KtCodegenControlUiModel | undefined { return this.currentModel; }
  set model(value: KtCodegenControlUiModel | undefined) {
    if (!this.currentModel?.preflight && value?.preflight) {
      this.resultFilter = "hits";
      this.selectedResultKey = undefined;
    }
    this.currentModel = value;
    this.render();
  }

  get splitRatio(): number { return this.currentSplitRatio; }
  set splitRatio(value: number) {
    this.currentSplitRatio = ktCodegenClampControlSplitPercent(value);
    this.render();
  }

  connectedCallback(): void { this.render(); }

  private render(): void {
    if (!this.isConnected) return;
    const style = document.createElement("style");
    style.textContent = STYLE;
    const title = document.createElement("div");
    title.className = "pnw-codegen-title";
    const name = document.createElement("span");
    name.className = "pnw-codegen-title-name";
    name.textContent = "预检结果";
    const spacer = document.createElement("span");
    spacer.className = "pnw-codegen-spacer";
    const plan = this.currentModel?.preflight?.plan;
    const issueCount = plan?.diagnostics.filter((item) => item.severity !== "info").length ?? 0;
    title.append(name, spacer);
    title.append(
      this.filterButton(`命中 ${plan?.markerRegions.length ?? 0}`, "hits"),
      this.filterButton(`问题 ${issueCount}`, "issues"),
      this.filterButton(`全部 ${(plan?.markerRegions.length ?? 0) + issueCount}`, "all"),
    );
    const pathToggle = document.createElement("label");
    pathToggle.className = "pnw-codegen-path-toggle";
    pathToggle.title = "仅控制左侧列表是否显示完整源码路径；右侧详情始终保留定位信息";
    const pathCheck = document.createElement("input");
    pathCheck.type = "checkbox";
    pathCheck.checked = this.showResultPaths;
    pathCheck.setAttribute("aria-label", "显示左侧源码路径");
    pathCheck.onchange = () => { this.showResultPaths = pathCheck.checked; this.render(); };
    pathToggle.append(pathCheck, "显示路径");
    const cache = document.createElement("span");
    cache.className = "pnw-codegen-cache";
    cache.textContent = this.cacheLabel();
    cache.title = this.currentModel?.preflight?.message ?? "";
    title.append(pathToggle, cache);

    const summary = document.createElement("div");
    summary.className = "pnw-codegen-summary";
    summary.setAttribute("role", "status");
    summary.setAttribute("aria-live", "polite");
    if (!plan || !this.currentModel?.preflight) {
      summary.textContent = "尚未预检。可点击页面上方“预检”，或直接点击 Apply 自动预检并写入源码。";
      this.root.replaceChildren(style, title, summary);
      return;
    }
    summary.textContent = `${plan.markerRegions.length} 个区域 · ${plan.artifacts.length} 个产物 · ${plan.diagnostics.length} 条诊断`
      + (this.currentModel.preflight.state === "ready" ? "" : ` · ${this.currentModel.preflight.message || "需重新预检"}`);

    const items = ktCodegenControlResultItems(this.currentModel, this.resultFilter);
    const selected = items.find((item) => item.key === this.selectedResultKey) ?? items[0];
    this.selectedResultKey = selected?.key;
    const layout = document.createElement("div");
    layout.className = "pnw-codegen-layout";
    layout.style.setProperty("--pnw-codegen-master", `${this.currentSplitRatio}%`);
    const master = document.createElement("section");
    master.className = "pnw-codegen-master";
    master.setAttribute("aria-label", "预检命中与问题列表");
    for (const item of items) master.append(this.resultRow(item, item.key === selected?.key));
    if (!items.length) master.append(this.empty(this.emptyMessage()));
    const detail = document.createElement("aside");
    detail.className = "pnw-codegen-detail";
    detail.setAttribute("aria-label", "当前预检项详情");
    detail.append(selected ? this.detailNode(selected) : this.empty("选择左侧条目查看详情。"));
    layout.append(master, this.resultSplitter(layout), detail);
    this.root.replaceChildren(style, title, summary, layout);
  }

  private cacheLabel(): string {
    const preflight = this.currentModel?.preflight;
    if (!preflight) return "尚未预检";
    if (preflight.state === "applied") return "已应用 · 需重新预检";
    if (preflight.state === "stale") return "结果已过期 · 需重新预检";
    return preflight.reused ? "缓存计划" : "新计划";
  }

  private emptyMessage(): string {
    if (this.resultFilter === "hits") return "当前配置没有命中源码区域。可在 Primary 的控制符目录调整选择后重新预检。";
    if (this.resultFilter === "issues") return "当前预检没有 warning 或 error。";
    return "当前预检没有可显示的命中或问题。";
  }

  private filterButton(label: string, filter: KtCodegenControlUiFilter): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pnw-codegen-filter";
    button.textContent = label;
    button.setAttribute("aria-pressed", String(this.resultFilter === filter));
    button.onclick = () => { this.resultFilter = filter; this.selectedResultKey = undefined; this.render(); };
    return button;
  }

  private resultRow(item: KtCodegenControlResultItem, selected: boolean): HTMLButtonElement {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "pnw-codegen-row";
    row.setAttribute("aria-pressed", String(selected));
    const title = document.createElement("strong");
    title.className = "pnw-codegen-heading";
    const meta = document.createElement("span");
    meta.className = "pnw-codegen-meta";
    if (item.kind === "hit") {
      this.appendHeading(title, item.region.blockKey, item.region.blockKey);
      meta.textContent = this.showResultPaths
        ? `${item.region.path}:${item.region.start.line + 1}`
        : `${item.region.classId} · 第 ${item.region.start.line + 1} 行`;
    } else {
      row.classList.add(`pnw-codegen-${item.diagnostic.severity}`);
      this.appendHeading(title, this.diagnosticBlockKey(item.diagnostic), `${item.diagnostic.severity.toUpperCase()} · ${item.diagnostic.code}`);
      const location = this.diagnosticLocation(item.diagnostic);
      meta.textContent = this.showResultPaths && location ? location : item.diagnostic.message;
    }
    if (this.showResultPaths) meta.classList.add("pnw-codegen-path");
    row.append(title, meta);
    row.onclick = () => { this.selectedResultKey = item.key; this.render(); };
    return row;
  }

  private detailNode(item: KtCodegenControlResultItem): HTMLElement {
    const model = this.currentModel!;
    const plan = model.preflight!.plan;
    const container = document.createElement("div");
    container.className = "pnw-codegen-detail-content";
    const header = document.createElement("div");
    header.className = "pnw-codegen-detail-header";
    const title = document.createElement("h3");
    const summary = document.createElement("p");
    summary.className = "pnw-codegen-detail-summary";
    const actions = document.createElement("div");
    actions.className = "pnw-codegen-actions";
    if (item.kind === "hit") {
      this.appendHeading(title, item.region.blockKey, item.region.blockKey);
      summary.textContent = `${item.region.path}:${item.region.start.line + 1} · ${item.region.classId}`;
      actions.append(this.openButton(item.region.path, item.region.start.line));
      header.append(title, summary, actions);
      const artifact = plan.artifacts.find((candidate) => candidate.regionId === item.region.id);
      const preview = document.createElement("pre");
      preview.className = "pnw-codegen-preview";
      preview.tabIndex = 0;
      preview.textContent = artifact?.content ?? "该区域没有生成 Artifact。";
      container.append(header, preview);
      return container;
    }
    this.appendHeading(title, this.diagnosticBlockKey(item.diagnostic), `${item.diagnostic.severity.toUpperCase()} · ${item.diagnostic.code}`);
    const message = document.createElement("p");
    message.className = "pnw-codegen-detail-message";
    message.textContent = item.diagnostic.message;
    const location = item.diagnostic.path;
    if (location?.file && location.row !== undefined) {
      summary.textContent = `${location.file}:${location.row + 1}`;
      actions.append(this.openButton(location.file, location.row));
    } else summary.textContent = "该诊断没有可打开的源码位置。";
    const unclosed = ktCodegenControlUnclosedForDiagnostic(model, item.diagnostic);
    if (unclosed) {
      const copy = document.createElement("button");
      copy.type = "button";
      copy.textContent = "复制 END";
      copy.onclick = () => this.dispatchEvent(new CustomEvent<KtCodegenControlCopyEndDetail>(
        "kt-codegen-control-copy-end",
        { bubbles: true, composed: true, detail: { blockKey: unclosed.blockKey, path: unclosed.path, line: unclosed.line, expectedEnd: unclosed.expectedEnd } },
      ));
      actions.append(copy);
    }
    header.append(title, summary, message, actions);
    container.append(header);
    if (unclosed) {
      const expected = document.createElement("pre");
      expected.className = "pnw-codegen-preview";
      expected.tabIndex = 0;
      expected.textContent = unclosed.expectedEnd;
      container.append(expected);
    }
    return container;
  }

  private appendHeading(container: HTMLElement, blockKey: KtCodegenBlockKey | undefined, label: string): void {
    const presentation = blockKey ? presentationByKey.get(blockKey) : undefined;
    if (presentation) {
      const id = document.createElement("span");
      id.className = "pnw-codegen-id";
      id.textContent = `#${presentation.legacyId}`;
      container.append(id);
    }
    const name = document.createElement("span");
    name.className = "pnw-codegen-name";
    name.textContent = presentation?.title ?? label;
    container.append(name);
  }

  private diagnosticBlockKey(diagnostic: KtCodegenDiagnostic): KtCodegenBlockKey | undefined {
    const key = diagnostic.marker?.blockKey;
    return presentationByKey.has(key as KtCodegenBlockKey) ? key as KtCodegenBlockKey : undefined;
  }

  private diagnosticLocation(diagnostic: KtCodegenDiagnostic): string {
    const path = diagnostic.path;
    if (!path?.file) return "";
    return `${path.file}${path.row === undefined ? "" : `:${path.row + 1}`}`;
  }

  private openButton(path: string, line: number): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "打开";
    button.onclick = () => this.dispatchEvent(new CustomEvent<KtCodegenControlOpenDetail>(
      "kt-codegen-control-open",
      { bubbles: true, composed: true, detail: { path, line } },
    ));
    return button;
  }

  private resultSplitter(layout: HTMLElement): HTMLElement {
    const splitter = document.createElement("div");
    splitter.className = "pnw-codegen-splitter";
    splitter.tabIndex = 0;
    splitter.setAttribute("role", "separator");
    splitter.setAttribute("aria-label", "调整预检结果列表与详情宽度");
    splitter.setAttribute("aria-orientation", "vertical");
    splitter.setAttribute("aria-valuemin", "20");
    splitter.setAttribute("aria-valuemax", "75");
    const sync = (clientX: number, emit: boolean) => {
      const rect = layout.getBoundingClientRect();
      if (rect.width <= 0) return;
      this.currentSplitRatio = ktCodegenClampControlSplitPercent(((clientX - rect.left) / rect.width) * 100);
      layout.style.setProperty("--pnw-codegen-master", `${this.currentSplitRatio}%`);
      splitter.setAttribute("aria-valuenow", String(Math.round(this.currentSplitRatio)));
      if (emit) this.emitSplitChange();
    };
    splitter.setAttribute("aria-valuenow", String(Math.round(this.currentSplitRatio)));
    splitter.onpointerdown = (event) => splitter.setPointerCapture(event.pointerId);
    splitter.onpointermove = (event) => { if (splitter.hasPointerCapture(event.pointerId)) sync(event.clientX, false); };
    splitter.onpointerup = (event) => {
      if (!splitter.hasPointerCapture(event.pointerId)) return;
      sync(event.clientX, true);
      splitter.releasePointerCapture(event.pointerId);
    };
    splitter.onkeydown = (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      this.currentSplitRatio = ktCodegenClampControlSplitPercent(this.currentSplitRatio + (event.key === "ArrowLeft" ? -2 : 2));
      layout.style.setProperty("--pnw-codegen-master", `${this.currentSplitRatio}%`);
      splitter.setAttribute("aria-valuenow", String(Math.round(this.currentSplitRatio)));
      this.emitSplitChange();
    };
    return splitter;
  }

  private emitSplitChange(): void {
    this.dispatchEvent(new CustomEvent<KtCodegenControlSplitDetail>(
      "kt-codegen-control-split-change",
      { bubbles: true, composed: true, detail: { ratio: this.currentSplitRatio } },
    ));
  }

  private empty(text: string): HTMLElement {
    const element = document.createElement("div");
    element.className = "pnw-codegen-empty";
    element.textContent = text;
    return element;
  }
}

export function ktCodegenDefineControlPanelElement(
  tagName = KT_CODEGEN_CONTROL_PANEL_TAG_NAME,
): typeof KtCodegenControlPanel {
  const registered = customElements.get(tagName);
  if (registered) return registered as typeof KtCodegenControlPanel;
  customElements.define(tagName, KtCodegenControlPanel);
  return KtCodegenControlPanel;
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-codegen-control-panel": KtCodegenControlPanel;
  }
}
