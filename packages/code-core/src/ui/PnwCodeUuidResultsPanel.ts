// SPDX-License-Identifier: Apache-2.0

import {
  pnwCodeGroupUuidHits,
  pnwCodeSelectUuidFileUris,
  pnwCodeSelectUuidHitIds,
  type PnwCodeUuidFileResultRow,
  type PnwCodeUuidResultHit,
  type PnwCodeUuidResultState,
} from "./PnwCodeUuidResultsState.js";

export const PNW_CODE_UUID_RESULTS_PANEL_TAG = "pnw-code-uuid-results-panel";
export const PNW_CODE_UUID_RESULTS_ACTION = "pnw-code-uuid-results-action";

export interface PnwCodeUuidResultsCapabilities {
  readonly selection?: boolean;
  readonly open?: boolean;
  readonly apply?: boolean;
  readonly cancel?: boolean;
  readonly gitDiff?: boolean;
}

export interface PnwCodeUuidResultsPanelModel {
  readonly presentation: "hits" | "files";
  readonly running?: boolean;
  readonly hits?: readonly PnwCodeUuidResultHit[];
  readonly files?: readonly PnwCodeUuidFileResultRow[];
  readonly selectedIds?: readonly string[];
  readonly emptyMessage?: string;
  readonly capabilities?: PnwCodeUuidResultsCapabilities;
}

export type PnwCodeUuidResultsActionDetail =
  | { readonly kind: "selection"; readonly scope: "hit" | "file"; readonly ids: readonly string[] }
  | {
      readonly kind: "action";
      readonly scope: "hit" | "file";
      readonly action: "open" | "apply" | "cancel" | "gitDiff";
      readonly ids: readonly string[];
    };

const STATE_LABEL: Record<PnwCodeUuidResultState, string> = {
  pending: "待替换",
  cancelled: "已移除",
  applied: "已改写",
  blocked: "错误",
};

const STYLE = `
:host{display:block;min-width:0;max-width:100%;color:var(--vscode-foreground,var(--text,#172033));font:12px/1.4 var(--vscode-font-family,system-ui,sans-serif)}
:host([hidden]){display:none}*{box-sizing:border-box}button,input{font:inherit}button{cursor:pointer}
button:focus-visible,input:focus-visible{outline:1px solid var(--vscode-focusBorder,var(--accent,#2563eb));outline-offset:1px}
.panel{min-width:0;max-width:100%;overflow:auto;border:1px solid var(--vscode-panel-border,var(--border,#d7dde8));border-radius:6px;background:var(--vscode-editor-background,var(--panel-bg,#fff))}
.group+.group{border-top:1px solid var(--vscode-panel-border,var(--border,#d7dde8))}.group-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:7px;min-height:32px;padding:5px 9px;background:var(--vscode-editorWidget-background,var(--panel-head-bg,#eef2ff))}
.group-title{font-weight:650}.identity{min-width:0;overflow:hidden;color:var(--vscode-descriptionForeground,var(--muted,#64748b));font:11px/1.3 var(--vscode-editor-font-family,monospace);text-overflow:ellipsis;white-space:nowrap}.count{margin-left:auto;color:var(--vscode-descriptionForeground,var(--muted,#64748b));white-space:nowrap}
.list{margin:0;padding:0;list-style:none}.row{display:flex;align-items:center;gap:7px;min-width:0;min-height:35px;padding:4px 8px;border-top:1px solid color-mix(in srgb,var(--vscode-panel-border,var(--border,#d7dde8)) 65%,transparent)}.row:hover{background:var(--vscode-list-hoverBackground,var(--hover,rgba(37,99,235,.08)))}
.main{display:block;flex:1 1 auto;min-width:0;overflow:hidden}.path{display:block;overflow:hidden;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.detail{display:block;overflow:hidden;color:var(--vscode-descriptionForeground,var(--muted,#64748b));font-size:11px;text-overflow:ellipsis;white-space:nowrap}.clickable{cursor:pointer}.clickable:hover .path{text-decoration:underline}
.mapping{flex:0 1 46%;min-width:90px;overflow:hidden;color:var(--vscode-descriptionForeground,var(--muted,#64748b));font:11px/1.3 var(--vscode-editor-font-family,monospace);text-overflow:ellipsis;white-space:nowrap}.mapping strong{color:var(--vscode-testing-iconPassed,#15803d);font-weight:500}
.actions{display:flex;flex:0 0 auto;gap:2px;opacity:0}.row:hover .actions,.actions:focus-within{opacity:1}.icon{width:26px;height:26px;padding:0;color:inherit;background:transparent;border:1px solid transparent;border-radius:3px}.icon:hover{background:var(--vscode-toolbar-hoverBackground,var(--hover,rgba(37,99,235,.08)));border-color:var(--vscode-panel-border,var(--border,#d7dde8))}
.state{flex:0 0 auto;padding:1px 6px;border:1px solid currentColor;border-radius:999px;color:var(--vscode-descriptionForeground,var(--muted,#64748b));font-size:10px;white-space:nowrap}.state.pending{color:var(--vscode-gitDecoration-modifiedResourceForeground,#b45309)}.state.applied{color:var(--vscode-testing-iconPassed,#15803d)}.state.blocked{color:var(--vscode-errorForeground,var(--danger,#b91c1c))}
.empty{padding:20px 10px;color:var(--vscode-descriptionForeground,var(--muted,#64748b));text-align:center}
`;

export class PnwCodeUuidResultsPanel extends HTMLElement {
  private readonly root = this.attachShadow({ mode: "open" });
  private currentModel: PnwCodeUuidResultsPanelModel | undefined;
  private selectedIds: readonly string[] = [];

  get model(): PnwCodeUuidResultsPanelModel | undefined { return this.currentModel; }
  set model(value: PnwCodeUuidResultsPanelModel | undefined) {
    this.currentModel = value;
    this.selectedIds = this.sanitizeSelection(value?.selectedIds ?? []);
    this.render();
  }

  connectedCallback(): void { this.render(); }

  private enabled(key: keyof PnwCodeUuidResultsCapabilities): boolean {
    return this.currentModel?.capabilities?.[key] === true;
  }

  private sanitizeSelection(ids: readonly string[]): readonly string[] {
    if (!this.currentModel) return [];
    return this.currentModel.presentation === "hits"
      ? pnwCodeSelectUuidHitIds(this.currentModel.hits ?? [], ids)
      : pnwCodeSelectUuidFileUris(this.currentModel.files ?? [], ids);
  }

  private render(): void {
    if (!this.isConnected) return;
    const style = document.createElement("style"); style.textContent = STYLE;
    const panel = document.createElement("section"); panel.className = "panel"; panel.setAttribute("aria-label", "UUID 扫描结果");
    const model = this.currentModel;
    if (!model) panel.append(this.empty("UUID 结果尚未激活。"));
    else if (model.presentation === "hits") this.renderHits(panel, model.hits ?? []);
    else this.renderFiles(panel, model.files ?? []);
    this.root.replaceChildren(style, panel);
  }

  private renderHits(panel: HTMLElement, hits: readonly PnwCodeUuidResultHit[]): void {
    if (!hits.length) { panel.append(this.empty(this.currentModel?.emptyMessage ?? "没有 UUID 命中")); return; }
    for (const [index, group] of pnwCodeGroupUuidHits(hits).entries()) {
      const section = document.createElement("section"); section.className = "group";
      const head = document.createElement("div"); head.className = "group-head";
      if (this.enabled("selection")) head.append(this.groupCheckbox(group.hits.map((hit) => hit.id), `选择同值组 ${index + 1}`));
      head.append(this.span(`同值组 ${index + 1}`, "group-title"), this.span(group.displayValue, "identity"), this.span(`${group.hits.length} 处`, "count"));
      const list = document.createElement("ul"); list.className = "list";
      for (const hit of group.hits) list.append(this.hitRow(hit));
      section.append(head, list); panel.append(section);
    }
  }

  private renderFiles(panel: HTMLElement, rows: readonly PnwCodeUuidFileResultRow[]): void {
    if (!rows.length) { panel.append(this.empty(this.currentModel?.emptyMessage ?? "没有 UUID 文件结果")); return; }
    const section = document.createElement("section"); section.className = "group";
    const head = document.createElement("div"); head.className = "group-head";
    if (this.enabled("selection")) head.append(this.groupCheckbox(rows.filter((row) => row.state === "pending").map((row) => row.uri), "选择全部待替换文件"));
    head.append(this.span("命中文件", "group-title"), this.span(`${rows.length} 个`, "count"));
    const list = document.createElement("ul"); list.className = "list";
    for (const row of rows) list.append(this.fileRow(row));
    section.append(head, list); panel.append(section);
  }

  private hitRow(hit: PnwCodeUuidResultHit): HTMLElement {
    const state = hit.state ?? "pending";
    const item = document.createElement("li"); item.className = "row";
    if (this.enabled("selection")) item.append(this.itemCheckbox(hit.id, `选择 ${hit.relativePath} 第 ${hit.line} 行`, state === "pending"));
    const main = document.createElement("span"); main.className = `main${this.enabled("open") ? " clickable" : ""}`; main.title = hit.relativePath;
    main.append(this.span(this.basename(hit.relativePath), "path"), this.span(`${this.dirname(hit.relativePath)} · L${hit.line}:${hit.column}`, "detail"));
    if (this.enabled("open")) main.onclick = () => this.emitAction("hit", "open", [hit.id]);
    const mapping = this.span(hit.to ? `${hit.from}  →  ${hit.to}` : hit.from, "mapping"); mapping.title = [hit.from, hit.to, hit.warning].filter(Boolean).join("\n");
    const actions = this.actionButtons("hit", hit.id, state);
    item.append(main, mapping, actions, this.stateBadge(state)); return item;
  }

  private fileRow(row: PnwCodeUuidFileResultRow): HTMLElement {
    const item = document.createElement("li"); item.className = "row";
    if (this.enabled("selection")) item.append(this.itemCheckbox(row.uri, `选择 ${row.relativePath}`, row.state === "pending"));
    const main = document.createElement("span"); main.className = `main${this.enabled("open") ? " clickable" : ""}`; main.title = [row.relativePath, row.encoding, ...row.warnings].join("\n");
    main.append(this.span(this.basename(row.relativePath), "path"), this.span(`${this.dirname(row.relativePath)} · ${row.hitCount} 处 · L${row.firstLine} · ${row.encoding}`, "detail"));
    if (this.enabled("open")) main.onclick = () => this.emitAction("file", "open", [row.uri]);
    const sample = row.mappings[0]; const mapping = this.span(sample ? `${sample.from}${sample.to ? `  →  ${sample.to}` : ""}` : "", "mapping");
    mapping.title = row.mappings.map((entry) => `L${entry.line}:${entry.column} ${entry.from}${entry.to ? ` → ${entry.to}` : ""}`).join("\n");
    item.append(main, mapping, this.actionButtons("file", row.uri, row.state), this.stateBadge(row.state)); return item;
  }

  private actionButtons(scope: "hit" | "file", id: string, state: PnwCodeUuidResultState): HTMLElement {
    const actions = document.createElement("span"); actions.className = "actions";
    if (!this.currentModel?.running && state === "pending") {
      if (this.enabled("apply")) actions.append(this.icon("✓", "应用", scope, "apply", id));
      if (this.enabled("cancel")) actions.append(this.icon("×", "从本次结果移除", scope, "cancel", id));
    }
    if (!this.currentModel?.running && state === "applied" && this.enabled("gitDiff")) actions.append(this.icon("⇄", "查看 Git 差异", scope, "gitDiff", id));
    return actions;
  }

  private groupCheckbox(ids: readonly string[], label: string): HTMLInputElement {
    const selected = new Set(this.selectedIds); const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.disabled = !ids.length || Boolean(this.currentModel?.running); checkbox.checked = ids.length > 0 && ids.every((id) => selected.has(id)); checkbox.indeterminate = ids.some((id) => selected.has(id)) && !checkbox.checked; checkbox.setAttribute("aria-label", label);
    checkbox.onchange = () => { const next = new Set(this.selectedIds); for (const id of ids) checkbox.checked ? next.add(id) : next.delete(id); this.updateSelection([...next]); }; return checkbox;
  }

  private itemCheckbox(id: string, label: string, selectable: boolean): HTMLInputElement {
    const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = this.selectedIds.includes(id); checkbox.disabled = !selectable || Boolean(this.currentModel?.running); checkbox.setAttribute("aria-label", label);
    checkbox.onchange = () => { const next = new Set(this.selectedIds); checkbox.checked ? next.add(id) : next.delete(id); this.updateSelection([...next]); }; return checkbox;
  }

  private updateSelection(ids: readonly string[]): void {
    this.selectedIds = this.sanitizeSelection(ids); this.render();
    this.emit({ kind: "selection", scope: this.currentModel?.presentation === "files" ? "file" : "hit", ids: this.selectedIds });
  }

  private stateBadge(state: PnwCodeUuidResultState): HTMLElement { return this.span(STATE_LABEL[state], `state ${state}`); }
  private icon(text: string, title: string, scope: "hit" | "file", action: "apply" | "cancel" | "gitDiff", id: string): HTMLButtonElement { const button = document.createElement("button"); button.type = "button"; button.className = "icon"; button.textContent = text; button.title = title; button.setAttribute("aria-label", title); button.onclick = () => this.emitAction(scope, action, [id]); return button; }
  private empty(text: string): HTMLElement { return this.span(text, "empty"); }
  private span(text: string, className: string): HTMLSpanElement { const span = document.createElement("span"); span.className = className; span.textContent = text; return span; }
  private basename(path: string): string { const normalized = path.replaceAll("\\", "/"); return normalized.slice(normalized.lastIndexOf("/") + 1); }
  private dirname(path: string): string { const normalized = path.replaceAll("\\", "/"); const index = normalized.lastIndexOf("/"); return index > 0 ? normalized.slice(0, index) : "."; }
  private emitAction(scope: "hit" | "file", action: "open" | "apply" | "cancel" | "gitDiff", ids: readonly string[]): void { this.emit({ kind: "action", scope, action, ids }); }
  private emit(detail: PnwCodeUuidResultsActionDetail): void { this.dispatchEvent(new CustomEvent<PnwCodeUuidResultsActionDetail>(PNW_CODE_UUID_RESULTS_ACTION, { bubbles: true, composed: true, detail })); }
}

export function pnwCodeDefineUuidResultsPanel(tagName = PNW_CODE_UUID_RESULTS_PANEL_TAG): typeof PnwCodeUuidResultsPanel {
  const registered = customElements.get(tagName); if (registered) return registered as typeof PnwCodeUuidResultsPanel;
  customElements.define(tagName, PnwCodeUuidResultsPanel); return PnwCodeUuidResultsPanel;
}

declare global { interface HTMLElementTagNameMap { "pnw-code-uuid-results-panel": PnwCodeUuidResultsPanel; } }
