// SPDX-License-Identifier: Apache-2.0

import type {
  PnwCodeRenameResultRow,
  PnwCodeRenameResultTone,
} from "./PnwCodeRenameResultsState.js";

export const PNW_CODE_RENAME_RESULTS_PANEL_TAG = "pnw-code-rename-results-panel";
export const PNW_CODE_RENAME_RESULTS_ACTION = "pnw-code-rename-results-action";

export interface PnwCodeRenameResultsPanelModel {
  readonly rows: readonly PnwCodeRenameResultRow[];
  readonly applied?: boolean;
  readonly running?: boolean;
  readonly title?: string;
  readonly summary?: string;
  readonly emptyMessage?: string;
  readonly capabilities?: { readonly open?: boolean };
}

export type PnwCodeRenameResultsActionDetail = {
  readonly kind: "open";
  readonly id: string;
  readonly path: string;
  readonly line?: number;
};

const LEVEL_MARK: Record<PnwCodeRenameResultRow["level"], string> = {
  text: "T",
  file: "F",
  dir: "D",
};

const STYLE = `
:host{display:block;min-width:0;max-width:100%;color:var(--vscode-foreground,var(--text,#172033));font:12px/1.4 var(--vscode-font-family,system-ui,sans-serif)}
:host([hidden]){display:none}*{box-sizing:border-box}button{font:inherit;cursor:pointer}button:focus-visible{outline:1px solid var(--vscode-focusBorder,var(--accent,#2563eb));outline-offset:1px}
.panel{min-width:0;max-width:100%;overflow:auto;border:1px solid var(--vscode-panel-border,var(--border,#d7dde8));border-radius:6px;background:var(--vscode-editor-background,var(--panel-bg,#fff))}
.head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;min-height:34px;padding:6px 9px;background:var(--vscode-editorWidget-background,var(--panel-head-bg,#eef2ff));border-bottom:1px solid var(--vscode-panel-border,var(--border,#d7dde8))}.title{font-weight:650}.summary{min-width:0;overflow:hidden;color:var(--vscode-descriptionForeground,var(--muted,#64748b));font-size:11px;text-overflow:ellipsis;white-space:nowrap}.count{margin-left:auto;color:var(--vscode-descriptionForeground,var(--muted,#64748b));white-space:nowrap}
.list{margin:0;padding:0;list-style:none}.row{display:flex;align-items:center;gap:7px;min-width:0;min-height:39px;padding:5px 8px;border-top:1px solid color-mix(in srgb,var(--vscode-panel-border,var(--border,#d7dde8)) 65%,transparent)}.row:first-child{border-top:0}.row:hover{background:var(--vscode-list-hoverBackground,var(--hover,rgba(37,99,235,.08)))}
.kind{display:inline-grid;flex:0 0 20px;width:20px;height:20px;place-items:center;border:1px solid var(--vscode-panel-border,var(--border,#d7dde8));border-radius:3px;color:var(--vscode-descriptionForeground,var(--muted,#64748b));font:10px/1 var(--vscode-editor-font-family,monospace)}
.main{display:block;flex:1 1 auto;min-width:0;overflow:hidden}.main.open{cursor:pointer}.main.open:hover .path{text-decoration:underline}.path{display:block;overflow:hidden;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.detail{display:block;overflow:hidden;color:var(--vscode-descriptionForeground,var(--muted,#64748b));font-size:11px;text-overflow:ellipsis;white-space:nowrap}mark{padding:0;color:inherit;background:var(--vscode-editor-findMatchHighlightBackground,#fde68a)}
.target{flex:0 1 34%;min-width:70px;overflow:hidden;color:var(--vscode-descriptionForeground,var(--muted,#64748b));font:11px/1.3 var(--vscode-editor-font-family,monospace);text-overflow:ellipsis;white-space:nowrap}.actions{display:flex;flex:0 0 auto;opacity:0}.row:hover .actions,.actions:focus-within{opacity:1}.icon{width:26px;height:26px;padding:0;color:inherit;background:transparent;border:1px solid transparent;border-radius:3px}.icon:hover{background:var(--vscode-toolbar-hoverBackground,var(--hover,rgba(37,99,235,.08)));border-color:var(--vscode-panel-border,var(--border,#d7dde8))}
.status{flex:0 0 auto;padding:1px 6px;border:1px solid currentColor;border-radius:999px;font-size:10px;white-space:nowrap}.status.neutral{color:var(--vscode-descriptionForeground,var(--muted,#64748b))}.status.success{color:var(--vscode-testing-iconPassed,#15803d)}.status.warning{color:var(--vscode-gitDecoration-modifiedResourceForeground,#b45309)}.status.danger{color:var(--vscode-errorForeground,var(--danger,#b91c1c))}.empty{display:block;padding:20px 10px;color:var(--vscode-descriptionForeground,var(--muted,#64748b));text-align:center}
`;

export class PnwCodeRenameResultsPanel extends HTMLElement {
  private readonly root = this.attachShadow({ mode: "open" });
  private currentModel: PnwCodeRenameResultsPanelModel | undefined;

  get model(): PnwCodeRenameResultsPanelModel | undefined { return this.currentModel; }
  set model(value: PnwCodeRenameResultsPanelModel | undefined) { this.currentModel = value; this.render(); }
  connectedCallback(): void { this.render(); }

  private render(): void {
    if (!this.isConnected) return;
    const style = document.createElement("style"); style.textContent = STYLE;
    const panel = document.createElement("section"); panel.className = "panel"; panel.setAttribute("aria-label", "搜索替换结果");
    const model = this.currentModel;
    if (!model?.rows.length) panel.append(this.span(model?.emptyMessage ?? "没有匹配结果", "empty"));
    else {
      const head = document.createElement("header"); head.className = "head";
      head.append(
        this.span(model.title ?? (model.applied ? "已替换" : "预览"), "title"),
        this.span(model.summary ?? "", "summary"),
        this.span(`${model.rows.length} 项`, "count"),
      );
      const list = document.createElement("ul"); list.className = "list";
      for (const row of model.rows) list.append(this.row(row));
      panel.append(head, list);
    }
    this.root.replaceChildren(style, panel);
  }

  private row(row: PnwCodeRenameResultRow): HTMLElement {
    const item = document.createElement("li"); item.className = "row"; item.title = [row.originalPath, row.detail].filter(Boolean).join("\n");
    item.append(this.span(LEVEL_MARK[row.level], "kind"));
    const main = document.createElement("span");
    const canOpen = this.currentModel?.capabilities?.open === true && !this.currentModel.running;
    main.className = `main${canOpen ? " open" : ""}`;
    const path = this.span("", "path"); this.appendHighlighted(path, row.relativePath, row.sourceHighlightTerms);
    const parts = [`${row.occurrences} 处`, row.levelLabel, row.encodingLabel].filter(Boolean);
    main.append(path, this.span(parts.join(" · "), "detail"));
    if (canOpen) main.onclick = () => this.emitOpen(row);
    const target = this.span(row.targetOrPositionLabel, "target"); target.title = row.targetOrPositionLabel;
    const actions = this.span("", "actions");
    if (canOpen) {
      const button = document.createElement("button"); button.type = "button"; button.className = "icon"; button.textContent = "↗"; button.title = "打开并定位"; button.setAttribute("aria-label", "打开并定位"); button.onclick = () => this.emitOpen(row); actions.append(button);
    }
    item.append(main, target, actions, this.status(row.statusLabel, row.statusTone));
    return item;
  }

  private appendHighlighted(parent: HTMLElement, text: string, terms: readonly string[]): void {
    const active = [...new Set(terms.map((term) => term.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
    if (!active.length) { parent.textContent = text; return; }
    const lower = text.toLocaleLowerCase(); let offset = 0;
    while (offset < text.length) {
      let index = -1; let match = "";
      for (const term of active) { const candidate = lower.indexOf(term.toLocaleLowerCase(), offset); if (candidate >= 0 && (index < 0 || candidate < index || (candidate === index && term.length > match.length))) { index = candidate; match = term; } }
      if (index < 0) { parent.append(document.createTextNode(text.slice(offset))); break; }
      if (index > offset) parent.append(document.createTextNode(text.slice(offset, index)));
      const mark = document.createElement("mark"); mark.textContent = text.slice(index, index + match.length); parent.append(mark); offset = index + match.length;
    }
  }

  private status(label: string, tone: PnwCodeRenameResultTone): HTMLElement { return this.span(label, `status ${tone}`); }
  private span(text: string, className: string): HTMLSpanElement { const span = document.createElement("span"); span.className = className; span.textContent = text; return span; }
  private emitOpen(row: PnwCodeRenameResultRow): void { this.dispatchEvent(new CustomEvent<PnwCodeRenameResultsActionDetail>(PNW_CODE_RENAME_RESULTS_ACTION, { bubbles: true, composed: true, detail: { kind: "open", id: row.id, path: row.openPath, line: row.openLine } })); }
}

export function pnwCodeDefineRenameResultsPanel(tagName = PNW_CODE_RENAME_RESULTS_PANEL_TAG): typeof PnwCodeRenameResultsPanel {
  const registered = customElements.get(tagName); if (registered) return registered as typeof PnwCodeRenameResultsPanel;
  customElements.define(tagName, PnwCodeRenameResultsPanel); return PnwCodeRenameResultsPanel;
}

declare global { interface HTMLElementTagNameMap { "pnw-code-rename-results-panel": PnwCodeRenameResultsPanel; } }
