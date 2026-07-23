// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenBlockKey } from "../blocks/legacy-blocks.js";
import {
  KT_CODEGEN_CONTROL_CATALOG_GROUPS,
  ktCodegenControlCatalogBlocks,
  ktCodegenControlVisibleSelectionState,
  ktCodegenFilterControlCatalogBlocks,
  ktCodegenGroupControlCatalogBlocks,
  ktCodegenNextControlSelection,
  ktCodegenNextControlVisibleSelection,
  type KtCodegenControlCatalogBlockUiModel,
  type KtCodegenControlCatalogFilter,
  type KtCodegenControlCatalogGroupId,
  type KtCodegenControlCatalogScopeFilter,
  type KtCodegenControlCatalogSelection,
} from "./KtCodegenControlCatalogState.js";
import type {
  KtCodegenControlOutputDetail,
  KtCodegenControlSelectionDetail,
  KtCodegenControlUiModel,
} from "./KtCodegenUiContracts.js";

export const KT_CODEGEN_CONTROL_CATALOG_TAG_NAME = "kt-codegen-control-catalog";

const STYLE = `
:host {
  --pnw-codegen-border: var(--vscode-panel-border, var(--border, color-mix(in srgb, currentColor 18%, transparent)));
  --pnw-codegen-bg: var(--vscode-editor-background, var(--sidebar-bg, #fff));
  --pnw-codegen-head-bg: var(--vscode-sideBarSectionHeader-background, var(--panel-head-bg, #f6f6f6));
  --pnw-codegen-muted: var(--vscode-descriptionForeground, var(--muted, #666));
  --pnw-codegen-hover: var(--vscode-list-hoverBackground, color-mix(in srgb, currentColor 8%, transparent));
  --pnw-codegen-focus: var(--vscode-focusBorder, var(--accent, #007acc));
  display: block; min-height: 0; color: var(--vscode-foreground, var(--text, inherit));
  background: var(--pnw-codegen-bg); font: 12px/1.35 var(--vscode-font-family, system-ui, sans-serif);
}
* { box-sizing: border-box; }
button, input, select { font: inherit; }
button { cursor: pointer; }
button:disabled, input:disabled { opacity: .55; cursor: not-allowed; }
button:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible { outline: 1px solid var(--pnw-codegen-focus); outline-offset: 1px; }
.pnw-codegen-catalog-filters { display: flex; flex-wrap: nowrap; align-items: center; gap: 5px; padding: 6px; background: var(--vscode-editorWidget-background, var(--pnw-codegen-head-bg)); border-top: 1px solid var(--pnw-codegen-border); border-bottom: 1px solid var(--pnw-codegen-border); }
.pnw-codegen-catalog-label { color: var(--pnw-codegen-muted); font-size: 11px; }
.pnw-codegen-catalog-filter { min-width: 0; min-height: 25px; padding: 2px 24px 2px 7px; color: inherit; background: var(--vscode-dropdown-background, var(--input-bg, transparent)); border: 1px solid var(--pnw-codegen-border); border-radius: 3px; }
.pnw-codegen-status-filter { flex: 1 1 116px; }
.pnw-codegen-scope-filter { flex: 1 1 104px; }
.pnw-codegen-output-visible, .pnw-codegen-output-one { min-height: 25px; padding: 2px; color: inherit; background: var(--vscode-button-secondaryBackground, var(--btn-bg, transparent)); border: 1px solid var(--pnw-codegen-border); border-radius: 3px; }
.pnw-codegen-output-visible { flex: 0 0 27px; width: 27px; font-size: 15px; }
.pnw-codegen-catalog-list { max-height: 290px; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable both-edges; }
.pnw-codegen-catalog-group { border-bottom: 1px solid var(--pnw-codegen-border); }
.pnw-codegen-catalog-group:last-child { border-bottom: 0; }
.pnw-codegen-catalog-group > summary { display: flex; align-items: center; gap: 6px; min-height: 32px; padding: 4px 8px; color: inherit; background: var(--pnw-codegen-head-bg); cursor: pointer; user-select: none; }
.pnw-codegen-catalog-group > summary:hover { background: var(--pnw-codegen-hover); }
.pnw-codegen-group-check { flex: 0 0 auto; margin: 0; }
.pnw-codegen-group-title { font-weight: 700; }
.pnw-codegen-group-count { margin-left: auto; color: var(--pnw-codegen-muted); font-size: 10px; font-weight: 400; text-align: right; }
.pnw-codegen-group-list { border-top: 1px solid var(--pnw-codegen-border); }
.pnw-codegen-catalog-row { display: grid; grid-template-columns: 22px 34px minmax(0, 1fr) auto auto auto; align-items: center; gap: 5px; min-height: 36px; padding: 3px 7px 3px 20px; border-bottom: 1px solid var(--pnw-codegen-border); }
.pnw-codegen-catalog-row:last-child { border-bottom: 0; }
.pnw-codegen-catalog-row:hover { background: var(--pnw-codegen-hover); }
.pnw-codegen-legacy-id { justify-self: start; padding: 1px 4px; color: var(--pnw-codegen-muted); border: 1px solid var(--pnw-codegen-border); border-radius: 999px; font-size: 10px; white-space: nowrap; }
.pnw-codegen-catalog-copy { min-width: 0; overflow: hidden; }
.pnw-codegen-title-line { display: flex; min-width: 0; align-items: center; gap: 4px; overflow: hidden; white-space: nowrap; }
.pnw-codegen-catalog-title, .pnw-codegen-control-words { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pnw-codegen-catalog-title { min-width: 0; font-weight: 600; }
.pnw-codegen-control-words { color: var(--pnw-codegen-muted); }
.pnw-codegen-badges { display: flex; align-items: center; justify-content: flex-end; gap: 3px; }
.pnw-codegen-badge { padding: 1px 4px; color: var(--pnw-codegen-muted); border: 1px solid var(--pnw-codegen-border); border-radius: 999px; font-size: 10px; white-space: nowrap; }
.pnw-codegen-badge.pnw-codegen-legacy, .pnw-codegen-state.pnw-codegen-missing { color: var(--vscode-editorWarning-foreground, #b45309); border-color: currentColor; }
.pnw-codegen-state.pnw-codegen-hit { color: var(--vscode-testing-iconPassed, #15803d); border-color: currentColor; }
.pnw-codegen-state.pnw-codegen-unclosed { color: var(--vscode-errorForeground, #b91c1c); border-color: currentColor; }
.pnw-codegen-output-one { width: 28px; }
.pnw-codegen-catalog-empty { padding: 12px 8px; color: var(--pnw-codegen-muted); text-align: center; }
:host([mode="compact"]) .pnw-codegen-catalog-list { max-height: 236px; }
:host([mode="compact"]) .pnw-codegen-catalog-filters { gap: 3px; padding: 3px 5px; }
:host([mode="compact"]) .pnw-codegen-catalog-group > summary { min-height: 28px; gap: 4px; padding: 2px 5px; }
:host([mode="compact"]) .pnw-codegen-catalog-row { grid-template-columns: 22px 34px minmax(0, 1fr) auto auto; gap: 4px; min-height: 32px; padding: 2px 5px 2px 12px; }
:host([mode="compact"]) .pnw-codegen-badges, :host([mode="compact"]) .pnw-codegen-control-words { display: none; }
`;

export class KtCodegenControlCatalog extends HTMLElement {
  private readonly root = this.attachShadow({ mode: "open" });
  private currentModel: KtCodegenControlUiModel | undefined;
  private currentDisabled = false;
  private currentOutputEnabled = false;
  private filter: KtCodegenControlCatalogFilter = { status: "all", scope: "all" };
  private singleMode = false;
  private listScrollTop = 0;
  private focusedBlockKey: KtCodegenBlockKey | undefined;
  private readonly rowChecks = new Map<KtCodegenBlockKey, HTMLInputElement>();
  private readonly groupSelection = new Map<KtCodegenControlCatalogGroupId, {
    readonly check: HTMLInputElement;
    readonly count: HTMLElement;
    readonly visibleBlockKeys: readonly KtCodegenBlockKey[];
    readonly totalCount: number;
  }>();
  private readonly expandedGroups = new Set<KtCodegenControlCatalogGroupId>(
    KT_CODEGEN_CONTROL_CATALOG_GROUPS.map((group) => group.id),
  );

  get model(): KtCodegenControlUiModel | undefined { return this.currentModel; }
  set model(value: KtCodegenControlUiModel | undefined) {
    const previous = this.currentModel;
    if (!previous?.preflight && value?.preflight) this.filter = { ...this.filter, status: "hit" };
    if (previous?.preflight && !value?.preflight) this.filter = { ...this.filter, status: "all" };
    if (value?.singleSelectionMode !== undefined) this.singleMode = value.singleSelectionMode;
    this.currentModel = value;
    if (previous && value && this.canPatchSelection(previous, value)) {
      this.syncSelectionPresentation();
      return;
    }
    this.render();
  }

  get disabled(): boolean { return this.currentDisabled; }
  set disabled(value: boolean) {
    if (this.currentDisabled === value) return;
    this.currentDisabled = value;
    this.render();
  }

  get outputEnabled(): boolean { return this.currentOutputEnabled; }
  set outputEnabled(value: boolean) {
    if (this.currentOutputEnabled === value) return;
    this.currentOutputEnabled = value;
    this.render();
  }

  connectedCallback(): void { this.render(); }

  private render(): void {
    if (!this.isConnected) return;
    this.rowChecks.clear();
    this.groupSelection.clear();
    const style = document.createElement("style");
    style.textContent = STYLE;
    const model = this.currentModel;
    if (!model) {
      this.root.replaceChildren(style, this.empty("请先打开一份 Codegen JSON。"));
      return;
    }

    const allBlocks = ktCodegenControlCatalogBlocks(model);
    const visibleBlocks = this.visibleBlocks(model, allBlocks);
    const selected = new Set(model.selectedBlockKeys);
    const canonicalBlockKeys = allBlocks.map((block) => block.key);
    const filters = document.createElement("div");
    filters.className = "pnw-codegen-catalog-filters";
    filters.setAttribute("aria-label", "控制符显示筛选，不改变预检和 Apply 选择");
    if (model.preflight) {
      const status = document.createElement("select");
      status.className = "pnw-codegen-catalog-filter pnw-codegen-status-filter";
      status.setAttribute("aria-label", "控制符状态");
      status.title = "按预检状态筛选；不改变 checkbox 与 Apply 范围";
      for (const [value, label] of [["hit", "命中"], ["unclosed", "未闭合"], ["missing", "未命中"], ["all", "全部"]] as const) {
        status.append(new Option(`${label} ${this.visibleBlocks(model, allBlocks, { ...this.filter, status: value }).length}`, value));
      }
      status.value = this.filter.status;
      status.onchange = () => this.setFilter({ status: status.value as KtCodegenControlCatalogFilter["status"] });
      filters.append(status);
    } else {
      const label = document.createElement("span");
      label.className = "pnw-codegen-catalog-label";
      label.textContent = "尚未预检";
      filters.append(label);
    }
    const scope = document.createElement("select");
    scope.className = "pnw-codegen-catalog-filter pnw-codegen-scope-filter";
    scope.setAttribute("aria-label", "控制符范围");
    scope.title = "按控制符类型筛选；不改变 checkbox 与 Apply 范围";
    for (const [value, label] of [["all", "全部类型"], ["cpp-only", "C++ only"], ["field-code", "Field Code"]] as const) {
      scope.append(new Option(label, value));
    }
    scope.value = this.filter.scope;
    scope.onchange = () => this.setFilter({ scope: scope.value as KtCodegenControlCatalogScopeFilter });
    filters.append(scope);
    if (this.currentOutputEnabled) {
      const output = document.createElement("button");
      output.type = "button";
      output.className = "pnw-codegen-output-visible";
      output.textContent = "⧉";
      output.disabled = this.currentDisabled || visibleBlocks.length === 0;
      output.title = `输出当前筛选并复制（${visibleBlocks.length} 项）；不改变预检和 Apply 选择`;
      output.setAttribute("aria-label", output.title);
      output.onclick = () => this.emit<KtCodegenControlOutputDetail>(
        "kt-codegen-control-output",
        { scope: "visible", blockKeys: visibleBlocks.map((block) => block.key) },
      );
      filters.append(output);
    }

    const list = document.createElement("div");
    list.className = "pnw-codegen-catalog-list";
    list.tabIndex = 0;
    list.onscroll = () => { this.listScrollTop = list.scrollTop; };
    list.setAttribute("role", "tree");
    list.setAttribute("aria-label", "Codegen 控制符目录");
    const allGroups = ktCodegenGroupControlCatalogBlocks(allBlocks);
    const visibleGroups = ktCodegenGroupControlCatalogBlocks(visibleBlocks);
    for (const group of allGroups) {
      const groupVisible = visibleGroups.find((candidate) => candidate.id === group.id)?.blocks ?? [];
      if (!groupVisible.length) continue;
      const visibleKeys = groupVisible.map((block) => block.key);
      const groupState = ktCodegenControlVisibleSelectionState(visibleKeys, model.selectedBlockKeys);
      const details = document.createElement("details");
      details.className = "pnw-codegen-catalog-group";
      details.open = this.expandedGroups.has(group.id);
      details.setAttribute("role", "treeitem");
      details.setAttribute("aria-expanded", String(details.open));
      details.ontoggle = () => {
        if (details.open) this.expandedGroups.add(group.id); else this.expandedGroups.delete(group.id);
        details.setAttribute("aria-expanded", String(details.open));
      };
      const header = document.createElement("summary");
      const groupCheck = document.createElement("input");
      groupCheck.type = "checkbox";
      groupCheck.className = "pnw-codegen-group-check";
      groupCheck.checked = groupState.checked;
      groupCheck.indeterminate = groupState.indeterminate;
      groupCheck.disabled = this.currentDisabled || groupState.disabled;
      groupCheck.setAttribute("aria-label", `选择 ${group.label} 当前可见控制符`);
      groupCheck.onclick = (event) => event.stopPropagation();
      groupCheck.onchange = () => this.applySelection(ktCodegenNextControlVisibleSelection(
        this.selection(), visibleKeys, groupCheck.checked, canonicalBlockKeys,
      ));
      const title = document.createElement("span");
      title.className = "pnw-codegen-group-title";
      title.textContent = group.label;
      const count = document.createElement("span");
      count.className = "pnw-codegen-group-count";
      count.textContent = this.groupCount(groupState.selectedCount, groupState.visibleCount, group.blocks.length);
      this.groupSelection.set(group.id, { check: groupCheck, count, visibleBlockKeys: visibleKeys, totalCount: group.blocks.length });
      header.append(groupCheck, title, count);
      const groupList = document.createElement("div");
      groupList.className = "pnw-codegen-group-list";
      groupList.setAttribute("role", "group");
      for (const block of groupVisible) groupList.append(this.blockRow(block, selected, canonicalBlockKeys));
      details.append(header, groupList);
      list.append(details);
    }
    if (!visibleBlocks.length) list.append(this.empty(
      model.preflight && this.filter.status === "hit"
        ? "当前筛选没有命中的控制符；可切换到“未闭合”或“未命中”。"
        : "当前筛选没有控制符。",
    ));
    this.root.replaceChildren(style, filters, list);
    list.scrollTop = this.listScrollTop;
    const focusTarget = this.focusedBlockKey === undefined
      ? undefined
      : this.rowChecks.get(this.focusedBlockKey);
    focusTarget?.focus({ preventScroll: true });
  }

  private blockRow(
    block: KtCodegenControlCatalogBlockUiModel,
    selected: ReadonlySet<KtCodegenBlockKey>,
    canonicalBlockKeys: readonly KtCodegenBlockKey[],
  ): HTMLElement {
    const row = document.createElement("div");
    row.className = "pnw-codegen-catalog-row";
    row.setAttribute("role", "treeitem");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = selected.has(block.key);
    check.disabled = this.currentDisabled;
    check.setAttribute("aria-label", `选择 ${block.title} 参与预检和 Apply`);
    this.rowChecks.set(block.key, check);
    check.onfocus = () => { this.focusedBlockKey = block.key; };
    check.onblur = () => { if (this.focusedBlockKey === block.key) this.focusedBlockKey = undefined; };
    check.onchange = () => {
      this.focusedBlockKey = block.key;
      this.applySelection(ktCodegenNextControlSelection(
        this.selection(), block.key, check.checked, canonicalBlockKeys,
      ));
    };
    const id = document.createElement("span");
    id.className = "pnw-codegen-legacy-id";
    id.textContent = `#${block.legacyId}`;
    const copy = document.createElement("span");
    copy.className = "pnw-codegen-catalog-copy";
    copy.title = block.notes;
    const titleLine = document.createElement("span");
    titleLine.className = "pnw-codegen-title-line";
    const title = document.createElement("span");
    title.className = "pnw-codegen-catalog-title";
    title.textContent = block.title;
    titleLine.append(title);
    if (block.legacyState === "legacy-deprecated") {
      const legacy = document.createElement("span");
      legacy.className = "pnw-codegen-badge pnw-codegen-legacy";
      legacy.textContent = "旧兼容";
      titleLine.append(legacy);
    }
    const words = document.createElement("span");
    words.className = "pnw-codegen-control-words";
    words.textContent = block.controlWords;
    copy.append(titleLine, words);
    const state = document.createElement("span");
    state.className = `pnw-codegen-badge pnw-codegen-state pnw-codegen-${block.status}`;
    state.textContent = this.statusLabel(block.status, block.hitCount);
    const badges = document.createElement("span");
    badges.className = "pnw-codegen-badges";
    const platform = document.createElement("span");
    platform.className = "pnw-codegen-badge";
    platform.textContent = block.platform.toUpperCase();
    badges.append(platform);
    row.append(check, id, copy, state, badges);
    if (this.currentOutputEnabled) {
      const output = document.createElement("button");
      output.type = "button";
      output.className = "pnw-codegen-output-one";
      output.textContent = "⧉";
      output.disabled = this.currentDisabled;
      output.title = `输出${block.title}控制块到日志并复制`;
      output.setAttribute("aria-label", output.title);
      output.onclick = () => this.emit<KtCodegenControlOutputDetail>(
        "kt-codegen-control-output", { scope: "block", blockKey: block.key },
      );
      row.append(output);
    }
    return row;
  }

  private visibleBlocks(
    model: KtCodegenControlUiModel,
    blocks = ktCodegenControlCatalogBlocks(model),
    filter = this.filter,
  ): readonly KtCodegenControlCatalogBlockUiModel[] {
    return ktCodegenFilterControlCatalogBlocks(blocks, model.selectedBlockKeys, filter);
  }

  private selection(): KtCodegenControlCatalogSelection {
    return {
      blockKeys: this.currentModel?.selectedBlockKeys ?? [],
      singleMode: this.currentModel?.singleSelectionMode ?? this.singleMode,
    };
  }

  private applySelection(next: KtCodegenControlCatalogSelection): void {
    const model = this.currentModel;
    if (!model || this.currentDisabled) return;
    this.singleMode = next.singleMode;
    this.currentModel = { ...model, selectedBlockKeys: next.blockKeys, singleSelectionMode: next.singleMode };
    this.emit<KtCodegenControlSelectionDetail>("kt-codegen-control-selection-change", next);
    this.syncSelectionPresentation();
  }

  private syncSelectionPresentation(): void {
    const model = this.currentModel;
    if (!model) return;
    const selected = new Set(model.selectedBlockKeys);
    for (const [blockKey, check] of this.rowChecks) check.checked = selected.has(blockKey);
    for (const binding of this.groupSelection.values()) {
      const state = ktCodegenControlVisibleSelectionState(binding.visibleBlockKeys, model.selectedBlockKeys);
      binding.check.checked = state.checked;
      binding.check.indeterminate = state.indeterminate;
      binding.check.disabled = this.currentDisabled || state.disabled;
      binding.count.textContent = this.groupCount(state.selectedCount, state.visibleCount, binding.totalCount);
    }
  }

  private canPatchSelection(previous: KtCodegenControlUiModel, next: KtCodegenControlUiModel): boolean {
    if (previous.documentId !== next.documentId
      || Boolean(previous.preflight) !== Boolean(next.preflight)
      || previous.blocks.length !== next.blocks.length) return false;
    return previous.blocks.every((block, index) => {
      const candidate = next.blocks[index];
      return candidate?.key === block.key
        && candidate.status === block.status
        && candidate.hitCount === block.hitCount
        && candidate.artifactCount === block.artifactCount;
    });
  }

  private setFilter(next: Partial<KtCodegenControlCatalogFilter>): void {
    this.filter = { ...this.filter, ...next };
    this.render();
  }

  private statusLabel(status: KtCodegenControlCatalogBlockUiModel["status"], hitCount: number): string {
    if (status === "hit") return `${hitCount} 命中`;
    if (status === "unclosed") return "未闭合";
    if (status === "missing") return "未命中";
    if (status === "pending") return "待预检";
    return "未选择";
  }

  private groupCount(selected: number, visible: number, total: number): string {
    return `显示 ${visible}/${total} · 可见已选 ${selected}/${visible}`;
  }

  private empty(text: string): HTMLElement {
    const empty = document.createElement("div");
    empty.className = "pnw-codegen-catalog-empty";
    empty.textContent = text;
    return empty;
  }

  private emit<T>(type: string, detail: T): void {
    this.dispatchEvent(new CustomEvent<T>(type, { bubbles: true, composed: true, detail }));
  }
}

export function ktCodegenDefineControlCatalogElement(
  tagName = KT_CODEGEN_CONTROL_CATALOG_TAG_NAME,
): typeof KtCodegenControlCatalog {
  const registered = customElements.get(tagName);
  if (registered) return registered as typeof KtCodegenControlCatalog;
  customElements.define(tagName, KtCodegenControlCatalog);
  return KtCodegenControlCatalog;
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-codegen-control-catalog": KtCodegenControlCatalog;
  }
}
