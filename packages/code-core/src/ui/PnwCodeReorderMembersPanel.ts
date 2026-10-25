// SPDX-License-Identifier: Apache-2.0

import { PNW_CONTENT_BLOCK_TAG, PNW_CONTENT_BLOCK_TOGGLE, pnwDefineContentBlock } from "./elements/PnwContentBlock.js";

import {
  pnwCodeNextReorderSelection,
  pnwCodeProjectReorderMembersPanel,
  pnwCodeReorderStateLabel,
  pnwCodeReorderStateMark,
  pnwCodeSetReorderSelection,
  type PnwCodeReorderMembersPanelCapabilities,
  type PnwCodeReorderMembersPanelModel,
  type PnwCodeReorderMembersPanelRow,
  type PnwCodeReorderMembersSelectionState,
} from "./PnwCodeReorderMembersPanelState.js";

export const PNW_CODE_REORDER_MEMBERS_PANEL_TAG = "pnw-code-reorder-members-panel";
export const PNW_CODE_REORDER_MEMBERS_PANEL_ACTION = "pnw-code-reorder-members-action";

export type PnwCodeReorderMembersPanelActionDetail =
  | { readonly kind: "run"; readonly action: "preview" | "addToWorkset" }
  | {
      readonly kind: "reorderAction";
      readonly action: "open" | "preview" | "apply" | "cancel" | "gitDiff" | "revert" | "reviewApply";
      readonly uris: readonly string[];
      readonly reorderRevision?: number;
    }
  | { readonly kind: "reorderSelection"; readonly uris: readonly string[]; readonly reorderRevision?: number };

const STYLE = `
:host { display:block; min-width:0; max-width:100%; color:var(--vscode-foreground,var(--text,#172033)); font:12px/1.35 var(--vscode-font-family,system-ui,sans-serif); }
:host([hidden]) { display:none; } * { box-sizing:border-box; } button,input { font:inherit; } button { cursor:pointer; }
button:focus-visible,input:focus-visible { outline:1px solid var(--vscode-focusBorder,var(--accent,#2563eb)); outline-offset:1px; }
.shell { min-width:0; max-width:100%; margin:10px 0 12px; padding:9px; overflow:hidden; border:1px solid var(--ktc-ui-border,var(--vscode-panel-border,var(--border,#d7dde8))); border-radius:4px; background:var(--vscode-sideBar-background,var(--panel-bg,transparent)); }
h2 { margin:0 0 6px; font-size:13px; font-weight:650; } .summary { margin:6px 0; color:var(--vscode-descriptionForeground,var(--muted,#64748b)); font-size:11px; }
.actions,.options { display:flex; align-items:center; gap:6px; } .options { justify-content:space-between; margin:7px 0 1px; }
.action,.text-button { min-height:27px; padding:3px 9px; color:inherit; border:1px solid var(--ktc-ui-border,var(--vscode-panel-border,var(--border,#d7dde8))); border-radius:3px; background:var(--vscode-button-secondaryBackground,var(--btn-bg,transparent)); }
.action.primary { color:var(--vscode-button-foreground,#fff); background:var(--vscode-button-background,var(--accent,#2563eb)); border-color:var(--vscode-button-background,var(--accent,#2563eb)); }
button:disabled { opacity:.5; cursor:not-allowed; }
.result-filters { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:7px 0; } .result-filters[hidden] { display:none; }
.result-types { display:flex; flex-wrap:wrap; align-items:center; gap:3px; } .result-filter-button { min-height:24px; padding:2px 6px; color:inherit; border:1px solid var(--vscode-panel-border,var(--border,#d7dde8)); border-radius:3px; background:transparent; }
.hidden-selection-note { flex-basis:100%; margin:0; color:var(--vscode-descriptionForeground,var(--muted,#64748b)); }
.result-filter-button[aria-pressed="true"] { color:var(--vscode-button-foreground,#fff); background:var(--vscode-button-background,var(--accent,#2563eb)); border-color:var(--vscode-button-background,var(--accent,#2563eb)); }
.status { min-height:28px; margin:8px 0; padding:6px 8px; color:var(--vscode-descriptionForeground,var(--muted,#64748b)); background:var(--vscode-editorWidget-background,var(--panel-head-bg,rgba(100,116,139,.08))); border-left:3px solid var(--vscode-focusBorder,var(--accent,#2563eb)); }
.status:empty { display:none; } .status.error { color:var(--vscode-errorForeground,var(--danger,#b91c1c)); border-color:currentColor; }
.groups { min-width:0; margin-top:6px; } .group { min-width:0; border-top:1px solid var(--vscode-panel-border,var(--border,#d7dde8)); }
.group-header { display:flex; align-items:center; gap:5px; min-height:29px; font-weight:650; } .group-header .detail { margin-left:auto; color:var(--vscode-descriptionForeground,var(--muted,#64748b)); font-weight:400; white-space:nowrap; }
.list { min-width:0; margin:0; padding:0; list-style:none; } .file-row { display:flex; align-items:center; gap:5px; min-width:0; min-height:30px; padding:2px 3px; border-top:1px solid color-mix(in srgb,var(--vscode-panel-border,var(--border,#d7dde8)) 65%,transparent); }
.file-row:hover { background:var(--vscode-list-hoverBackground,var(--hover,rgba(37,99,235,.08))); } .kind { flex:0 0 25px; color:var(--vscode-symbolIcon-classForeground,var(--muted,#64748b)); font-size:10px; font-weight:650; }
.file-main { display:block; flex:1 1 auto; min-width:0; overflow:hidden; cursor:pointer; text-overflow:ellipsis; white-space:nowrap; } .file-main.static { cursor:default; }
.file-name { font-weight:650; } .file-dir { color:var(--vscode-descriptionForeground,var(--muted,#64748b)); font-size:11px; }
.inline { display:flex; flex:0 0 auto; gap:2px; opacity:0; } .file-row:hover .inline,.inline:focus-within { opacity:1; }
.icon { width:25px; height:25px; padding:0; color:inherit; background:transparent; border:1px solid transparent; border-radius:3px; font-size:15px; } .icon:hover { background:var(--vscode-toolbar-hoverBackground,var(--hover,rgba(37,99,235,.08))); border-color:var(--vscode-panel-border,var(--border,#d7dde8)); }
.state { flex:0 0 auto; min-width:18px; color:var(--vscode-descriptionForeground,var(--muted,#64748b)); font-weight:650; text-align:right; } .state.pending { color:var(--vscode-gitDecoration-modifiedResourceForeground,#b45309); } .state.blocked { color:var(--vscode-errorForeground,var(--danger,#b91c1c)); } .state.applied { color:var(--vscode-testing-iconPassed,#15803d); }
.empty { padding:12px 8px; color:var(--vscode-descriptionForeground,var(--muted,#64748b)); text-align:center; }
:host([presentation="detailBlock"]) .shell,:host([presentation="results"]) .shell { margin:0; padding:0; border:0; }
:host([presentation="detailBlock"]) h2,:host([presentation="detailBlock"]) .summary,:host([presentation="results"]) h2,:host([presentation="results"]) .summary { display:none; }
:host([presentation="results"]) .actions,:host([presentation="results"]) .options { display:none; }
:host([presentation="results"]) .groups { max-height:min(58vh,520px); overflow:auto; scrollbar-gutter:stable; }
:host([block-presentation]) .shell { margin:0; padding:0; border:0; border-radius:0; overflow:visible; }
:host([block-presentation]) .group { border:0; }
:host([block-presentation]) .groups { max-height:none; margin:0; overflow:visible; }
:host([block-presentation]) .pnw-block-body { min-width:0; padding:4px 6px; }
:host([block-presentation]) .group-header { display:contents; }
`;

export class PnwCodeReorderMembersPanel extends HTMLElement {
  private readonly root = this.attachShadow({ mode: "open" });
  private currentModel: PnwCodeReorderMembersPanelModel | undefined;
  private selection: PnwCodeReorderMembersSelectionState = { selectedUris: [] };
  private resultFilter: "all" | "normal" | "error" = "all";
  private unifiedBlocks = false;
  private readonly groupExpanded = new Map<string, boolean>();

  get blockPresentation(): boolean { return this.unifiedBlocks; }
  set blockPresentation(value: boolean) {
    if (this.unifiedBlocks === Boolean(value)) return;
    this.unifiedBlocks = Boolean(value);
    this.toggleAttribute("block-presentation", this.unifiedBlocks);
    this.render();
  }

  get model(): PnwCodeReorderMembersPanelModel | undefined { return this.currentModel; }
  set model(value: PnwCodeReorderMembersPanelModel | undefined) {
    this.currentModel = value;
    if (value) {
      this.selection = pnwCodeNextReorderSelection(this.selection, value);
      this.setAttribute("presentation", value.presentation);
    } else this.removeAttribute("presentation");
    this.render();
  }
  connectedCallback(): void { this.render(); }

  private enabled(key: keyof PnwCodeReorderMembersPanelCapabilities): boolean {
    return this.currentModel?.capabilities?.[key] !== false;
  }

  private render(focusFilter?: "all" | "normal" | "error"): void {
    if (!this.isConnected) return;
    const style = document.createElement("style"); style.textContent = STYLE;
    const model = this.currentModel;
    if (!model) {
      const empty = document.createElement("div"); empty.className = "empty"; empty.textContent = "成员排序尚未激活。";
      this.root.replaceChildren(style, empty); return;
    }
    const projection = pnwCodeProjectReorderMembersPanel(model, this.selection);
    const shell = document.createElement("section"); shell.className = "shell"; shell.setAttribute("aria-label", "C++ 成员排序");
    const title = document.createElement("h2"); title.textContent = "C++ 成员排序";
    const summary = document.createElement("p"); summary.className = "summary"; summary.textContent = "扫描、预览、勾选并确认写回；Host 负责文件与事务。";
    const actions = document.createElement("div"); actions.className = "actions";
    if (this.enabled("scan")) actions.append(this.button("扫描", "action primary", projection.running, () => this.emit({ kind: "run", action: "preview" })));
    if (this.enabled("apply")) actions.append(this.button(projection.applyLabel, "action", projection.applyDisabled, () => this.emit({ kind: "reorderAction", action: "apply", uris: projection.selectedPendingUris, ...this.revisionToken(model.reorderRevision) })));
    const options = document.createElement("div"); options.className = "options";
    const filters = document.createElement("div"); filters.className = "result-filters"; filters.hidden = !projection.hasCache;
    const types = document.createElement("div"); types.className = "result-types"; types.role = "group"; types.setAttribute("aria-label", "按结果筛选");
    const normalCount = projection.changedRows.length + projection.unchangedRows.length;
    let focusButton: HTMLButtonElement | undefined;
    for (const [value, label, count] of [
      ["all", "全部", normalCount + projection.blockedRows.length],
      ["normal", "正常", normalCount],
      ["error", "错误", projection.blockedRows.length],
    ] as const) {
      const button = this.button(`${label} · ${count}`, "result-filter-button", false, () => { this.resultFilter = value; this.render(value); });
      button.dataset.filter = value; button.setAttribute("aria-pressed", String(this.resultFilter === value)); types.append(button);
      if (value === focusFilter) focusButton = button;
    }
    filters.append(types);
    if (this.resultFilter === "error" && projection.selectedPendingUris.length) {
      const note = document.createElement("p"); note.className = "hidden-selection-note"; note.role = "status";
      note.textContent = `已选 ${projection.selectedPendingUris.length} 个正常文件（当前隐藏），应用所选仍包含这些文件。`;
      filters.append(note);
    }
    if (this.enabled("addToWorkset")) options.append(this.button("加入工作集", "text-button", projection.worksetDisabled, () => this.emit({ kind: "run", action: "addToWorkset" })));
    const status = document.createElement("p"); status.className = `status${model.status === "error" ? " error" : ""}`; status.textContent = model.message ?? ""; status.title = model.message ?? ""; status.role = "status"; status.setAttribute("aria-live", "polite");
    const groups = document.createElement("div"); groups.className = "groups"; groups.hidden = !projection.hasCache;
    if (projection.hasCache) {
      if (this.resultFilter !== "error") {
        groups.append(this.group("变更文件", projection.changedRows, model, {
          pendingRows: projection.pendingRows,
          allSelected: projection.allPendingSelected,
          someSelected: projection.somePendingSelected,
        }));
        groups.append(this.group("无变更文件", projection.unchangedRows, model));
      }
      if (this.resultFilter !== "normal" && (projection.blockedRows.length || this.resultFilter === "error")) {
        groups.append(this.group("错误 / 已阻止", projection.blockedRows, model));
      }
    }
    if (this.unifiedBlocks) {
      pnwDefineContentBlock();
      if (model.presentation !== "results") {
        const execution = document.createElement(PNW_CONTENT_BLOCK_TAG); execution.collapsible = false;
        const heading = document.createElement("span"); heading.slot = "title"; heading.textContent = "执行";
        const body = document.createElement("div"); body.slot = "body"; body.className = "pnw-block-body";
        body.append(summary, actions, options); execution.append(heading, body); shell.append(execution);
      }
      const results = document.createElement(PNW_CONTENT_BLOCK_TAG); results.collapsible = false;
      const heading = document.createElement("span"); heading.slot = "title"; heading.textContent = "排序结果";
      const body = document.createElement("div"); body.slot = "body"; body.append(status, filters, groups);
      results.append(heading, body); shell.append(results);
    } else shell.append(title, summary, actions, options, status, filters, groups);
    this.root.replaceChildren(style, shell);
    focusButton?.focus();
  }

  private group(titleText: string, rows: readonly PnwCodeReorderMembersPanelRow[], model: PnwCodeReorderMembersPanelModel, selection?: { readonly pendingRows: readonly PnwCodeReorderMembersPanelRow[]; readonly allSelected: boolean; readonly someSelected: boolean }): HTMLElement {
    const group = document.createElement("section"); group.className = "group";
    const header = document.createElement("div"); header.className = "group-header";
    if (selection && this.enabled("selection")) {
      const all = document.createElement("input"); all.type = "checkbox"; all.disabled = !selection.pendingRows.length || model.status === "running"; all.checked = selection.allSelected; all.indeterminate = selection.someSelected; all.setAttribute("aria-label", "选择全部待写盘文件");
      all.onchange = () => { const pending = new Set(selection.pendingRows.map((row) => row.uri)); this.updateSelection(all.checked ? [...pending] : this.selection.selectedUris.filter((uri) => !pending.has(uri)), model.reorderRevision); }; header.append(all);
    }
    const label = document.createElement("span"); label.textContent = `${titleText} · ${rows.length} 个`;
    const detail = document.createElement("span"); detail.className = "detail"; detail.textContent = `扫描 ${model.scanned ?? rows.length} 个`;
    header.append(label, detail); group.append(header);
    const list = document.createElement("ul"); list.className = "list";
    for (const row of rows) list.append(this.row(row, model.status === "running", Boolean(selection) && this.enabled("selection"), model.reorderRevision));
    if (!rows.length) { const empty = document.createElement("li"); empty.className = "empty"; empty.textContent = "没有文件"; list.append(empty); }
    if (this.unifiedBlocks) {
      pnwDefineContentBlock();
      const block = document.createElement(PNW_CONTENT_BLOCK_TAG); block.level = "secondary";
      block.open = this.groupExpanded.get(titleText) ?? true;
      block.addEventListener(PNW_CONTENT_BLOCK_TOGGLE, event => {
        if (event.target === block) this.groupExpanded.set(titleText, block.open);
      });
      label.slot = "title"; detail.slot = "status"; list.slot = "body";
      const selectAll = header.querySelector("input");
      if (selectAll) { selectAll.slot = "actions"; block.append(selectAll); }
      block.append(label, detail, list); group.replaceChildren(block);
    } else group.append(list);
    return group;
  }

  private row(row: PnwCodeReorderMembersPanelRow, running: boolean, selectable: boolean, reorderRevision?: number): HTMLElement {
    const item = document.createElement("li"); item.className = "file-row";
    if (selectable) {
      const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = this.selection.selectedUris.includes(row.uri); checkbox.disabled = row.state !== "pending" || running; checkbox.setAttribute("aria-label", `选择 ${row.relativePath}`);
      checkbox.onchange = () => { const selected = new Set(this.selection.selectedUris); if (checkbox.checked) selected.add(row.uri); else selected.delete(row.uri); this.updateSelection([...selected], reorderRevision); }; item.append(checkbox);
    }
    const kind = document.createElement("span"); kind.className = "kind"; kind.textContent = row.kind === "header" ? "C" : "C++";
    const viewAction = !running && (row.state === "pending" || row.state === "blocked") && this.enabled("preview") ? "preview"
      : !running && row.state === "applied" && this.enabled("gitDiff") ? "gitDiff" : undefined;
    const main = document.createElement("span"); main.className = `file-main${viewAction ? "" : " static"}`;
    const parts = row.relativePath.split("/"); const file = parts.pop() || row.relativePath;
    const name = document.createElement("span"); name.className = "file-name"; name.textContent = file;
    const directory = document.createElement("span"); directory.className = "file-dir"; directory.textContent = parts.length ? ` · ${parts.join("/")}` : "";
    main.append(name, directory); main.title = [row.relativePath, row.encoding, ...row.warnings].join("\n");
    if (viewAction) {
      const viewTitle = row.state === "blocked" ? (row.reviewCandidateAvailable ? "查看阻止原因与候选差异" : "查看阻止原因（未生成候选）")
        : row.state === "applied" ? "查看 Git 差异" : "预览排序差异";
      main.role = "button"; main.tabIndex = 0; main.setAttribute("aria-label", `${viewTitle}：${row.relativePath}`);
      main.onclick = () => this.emit({ kind: "reorderAction", action: viewAction, uris: [row.uri], ...this.revisionToken(reorderRevision) });
      main.onkeydown = (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); main.click(); } };
    }
    const inline = document.createElement("span"); inline.className = "inline";
    if (!running && row.state === "pending") {
      if (this.enabled("open")) inline.append(this.icon("◉", "查看", "open", row.uri, reorderRevision));
      if (this.enabled("apply")) inline.append(this.icon("✓", "应用此文件", "apply", row.uri, reorderRevision));
      if (this.enabled("cancel")) inline.append(this.icon("×", "从本次结果移除", "cancel", row.uri, reorderRevision));
    } else if (!running && row.state === "blocked") {
      if (this.enabled("open")) inline.append(this.icon("◉", "打开源文件", "open", row.uri, reorderRevision));
      if (this.enabled("preview")) inline.append(this.icon("⇄", row.reviewCandidateAvailable ? "查看阻止原因与候选差异" : "查看阻止原因（未生成候选）", "preview", row.uri, reorderRevision));
      if (this.enabled("apply")) {
        const canReviewApply = row.reviewCandidateAvailable === true && row.reviewCandidateViewed === true;
        const title = !row.reviewCandidateAvailable ? "未生成候选，无法应用"
          : !row.reviewCandidateViewed ? "先查看候选差异，再单独确认应用" : "单独确认应用此候选";
        inline.append(this.icon("✓", title, "reviewApply", row.uri, reorderRevision, !canReviewApply));
      }
    } else if (!running && row.state === "applied") {
      if (this.enabled("gitDiff")) inline.append(this.icon("⇄", "查看 Git 差异", "gitDiff", row.uri, reorderRevision));
      if (this.enabled("revert")) inline.append(this.icon("↶", "还原本次成员排序", "revert", row.uri, reorderRevision));
    }
    const state = document.createElement("span"); state.className = `state ${row.state}`; state.textContent = pnwCodeReorderStateMark(row.state); state.title = `${pnwCodeReorderStateLabel(row.state)} · ${row.encoding}`;
    item.append(kind, main, inline, state); return item;
  }

  private button(label: string, className: string, disabled: boolean, action: () => void): HTMLButtonElement { const button = document.createElement("button"); button.type = "button"; button.className = className; button.textContent = label; button.disabled = disabled; button.onclick = () => { if (!button.disabled) action(); }; return button; }
  private icon(text: string, title: string, action: "open" | "preview" | "apply" | "cancel" | "gitDiff" | "revert" | "reviewApply", uri: string, reorderRevision?: number, disabled = false): HTMLButtonElement { const button = this.button(text, "icon", disabled, () => this.emit({ kind: "reorderAction", action, uris: [uri], ...this.revisionToken(reorderRevision) })); button.title = title; button.setAttribute("aria-label", title); return button; }
  private revisionToken(reorderRevision?: number): { readonly reorderRevision?: number } { return reorderRevision === undefined ? {} : { reorderRevision }; }
  private updateSelection(requestedUris: readonly string[], reorderRevision?: number): void { if (!this.currentModel || reorderRevision !== this.currentModel.reorderRevision) return; this.selection = pnwCodeSetReorderSelection(this.selection, this.currentModel, requestedUris); const uris = [...this.selection.selectedUris]; this.render(); this.emit({ kind: "reorderSelection", uris, ...this.revisionToken(reorderRevision) }); }
  private emit(detail: PnwCodeReorderMembersPanelActionDetail): void {
    // The token belongs to the rendered row, not whichever model happens to be
    // current when a detached button eventually delivers its click.
    if (detail.kind !== "run" && detail.reorderRevision !== this.currentModel?.reorderRevision) return;
    this.dispatchEvent(new CustomEvent<PnwCodeReorderMembersPanelActionDetail>(PNW_CODE_REORDER_MEMBERS_PANEL_ACTION, { bubbles: true, composed: true, detail }));
  }
}

export function pnwCodeDefineReorderMembersPanel(tagName = PNW_CODE_REORDER_MEMBERS_PANEL_TAG): typeof PnwCodeReorderMembersPanel {
  const registered = customElements.get(tagName); if (registered) return registered as typeof PnwCodeReorderMembersPanel;
  customElements.define(tagName, PnwCodeReorderMembersPanel); return PnwCodeReorderMembersPanel;
}

declare global { interface HTMLElementTagNameMap { "pnw-code-reorder-members-panel": PnwCodeReorderMembersPanel; } }
