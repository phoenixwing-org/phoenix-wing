// SPDX-License-Identifier: Apache-2.0

export const PNW_COMBO_TAG = "pnw-combo";
export const PNW_COMBO_ACTION = "pnw-combo-action";

export interface PnwComboItem {
  readonly id: string;
  readonly label: string;
  readonly group?: string;
  readonly title?: string;
  readonly removable: boolean;
  readonly removeDisabledReason?: string;
}

export interface PnwComboModel {
  readonly ariaLabel: string;
  readonly placeholder: string;
  readonly emptyText: string;
  readonly items: readonly PnwComboItem[];
  readonly selectedId?: string;
  readonly disabled: boolean;
  readonly disabledReason?: string;
  readonly clearEnabled: boolean;
  readonly clearLabel: string;
  readonly clearDisabledReason?: string;
}

export type PnwComboActionDetail =
  | { readonly kind: "select"; readonly itemId: string }
  | { readonly kind: "remove"; readonly itemId: string }
  | { readonly kind: "clear" };

const PNW_EMPTY_COMBO_MODEL: PnwComboModel = Object.freeze({
  ariaLabel: "选择项目",
  placeholder: "请选择…",
  emptyText: "暂无项目",
  items: Object.freeze([]),
  disabled: false,
  clearEnabled: false,
  clearLabel: "全部清空",
});

const PNW_COMBO_STYLE = `
:host {
  position: relative;
  display: block;
  width: 100%;
  min-width: 0;
  color: var(--pnw-combo-foreground, var(--vscode-foreground, #1f1f1f));
  font: var(--vscode-font-size, 13px)/1.35 var(--vscode-font-family, system-ui, sans-serif);
}
:host([hidden]) { display: none !important; }
* { box-sizing: border-box; }
button { font: inherit; }
button:focus-visible {
  outline: 1px solid var(--pnw-combo-focus, var(--vscode-focusBorder, #0078d4));
  outline-offset: -1px;
}
.pnw-combo-trigger {
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: var(--pnw-combo-height, 28px);
  grid-template-columns: minmax(0, 1fr) 14px;
  align-items: center;
  gap: 5px;
  padding: 3px 6px;
  overflow: hidden;
  border: 1px solid var(--pnw-combo-border, var(--vscode-dropdown-border, var(--vscode-input-border, #8e8e8e)));
  border-radius: 2px;
  color: var(--pnw-combo-foreground, var(--vscode-dropdown-foreground, var(--vscode-input-foreground, #1f1f1f)));
  background: var(--pnw-combo-background, var(--vscode-dropdown-background, var(--vscode-input-background, #ffffff)));
  cursor: pointer;
  text-align: left;
}
.pnw-combo-trigger:hover:not(:disabled),
.pnw-combo-trigger[aria-expanded="true"] {
  border-color: var(--pnw-combo-focus, var(--vscode-focusBorder, #0078d4));
}
.pnw-combo-trigger:disabled {
  color: var(--vscode-disabledForeground, var(--vscode-descriptionForeground, #616161));
  cursor: default;
  opacity: .65;
}
.pnw-combo-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pnw-combo-caret { width: 12px; height: 12px; transition: transform 80ms ease; }
.pnw-combo-caret path {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}
.pnw-combo-trigger[aria-expanded="true"] .pnw-combo-caret { transform: rotate(180deg); }
.pnw-combo-popup {
  position: fixed;
  z-index: var(--pnw-combo-z-index, 1000);
  top: 0;
  left: 0;
  min-width: 0;
  max-height: 300px;
  overflow: auto;
  border: 1px solid var(--pnw-combo-popup-border, var(--vscode-widget-border, var(--vscode-dropdown-border, #8e8e8e)));
  color: var(--pnw-combo-popup-foreground, var(--vscode-menu-foreground, var(--vscode-foreground, #1f1f1f)));
  background: var(--pnw-combo-popup-background, var(--vscode-menu-background, var(--vscode-dropdown-background, #ffffff)));
  box-shadow: 0 3px 10px var(--vscode-widget-shadow, rgba(0, 0, 0, .32));
}
.pnw-combo-popup[hidden] { display: none; }
.pnw-combo-group + .pnw-combo-group {
  border-top: 1px solid var(--vscode-menu-separatorBackground, var(--vscode-panel-border, #d4d4d4));
}
.pnw-combo-group-label {
  padding: 5px 7px 3px;
  overflow: hidden;
  color: var(--vscode-descriptionForeground, #616161);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pnw-combo-row {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) 26px;
  align-items: stretch;
}
.pnw-combo-select, .pnw-combo-remove, .pnw-combo-clear {
  min-width: 0;
  min-height: 27px;
  border: 0;
  border-radius: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
}
.pnw-combo-select {
  padding: 4px 7px;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pnw-combo-remove {
  display: grid;
  width: 26px;
  padding: 0;
  place-items: center;
  color: var(--vscode-descriptionForeground, #616161);
  font-size: 15px;
}
.pnw-combo-select:hover,
.pnw-combo-select[aria-selected="true"],
.pnw-combo-remove:hover:not(:disabled),
.pnw-combo-clear:hover:not(:disabled) {
  color: var(--vscode-list-hoverForeground, var(--vscode-foreground, #1f1f1f));
  background: var(--vscode-list-hoverBackground, var(--vscode-toolbar-hoverBackground, #e8e8e8));
}
.pnw-combo-select[aria-selected="true"] {
  color: var(--vscode-list-activeSelectionForeground, var(--vscode-foreground, #ffffff));
  background: var(--vscode-list-activeSelectionBackground, var(--vscode-list-hoverBackground, #0078d4));
}
.pnw-combo-remove:disabled, .pnw-combo-clear:disabled {
  color: var(--vscode-disabledForeground, var(--vscode-descriptionForeground, #616161));
  cursor: default;
  opacity: .45;
}
.pnw-combo-footer {
  padding: 4px;
  border-top: 1px solid var(--vscode-menu-separatorBackground, var(--vscode-panel-border, #d4d4d4));
}
.pnw-combo-clear {
  width: 100%;
  min-height: 25px;
  padding: 3px 6px;
  border: 1px solid var(--vscode-button-secondaryBackground, var(--vscode-panel-border, #d4d4d4));
  text-align: center;
}
.pnw-combo-empty { padding: 7px; color: var(--vscode-descriptionForeground, #616161); text-align: center; }
@media (prefers-color-scheme: dark) {
  :host(:not([color-scheme="light"]):not([color-scheme="dark"])) {
    --pnw-combo-foreground: var(--vscode-foreground, #cccccc);
    --pnw-combo-background: var(--vscode-dropdown-background, #3c3c3c);
    --pnw-combo-popup-background: var(--vscode-menu-background, #252526);
    --pnw-combo-popup-foreground: var(--vscode-menu-foreground, #cccccc);
  }
}
@media (forced-colors: active) {
  .pnw-combo-trigger, .pnw-combo-popup, .pnw-combo-clear { border-color: CanvasText; }
  button:focus-visible { outline: 2px solid Highlight; }
}
@media (prefers-reduced-motion: reduce) {
  .pnw-combo-caret { transition: none; }
}
`;

export class PnwCombo extends HTMLElement {
  private readonly pnwRoot = this.attachShadow({ mode: "open" });
  private pnwActiveModel: PnwComboModel = PNW_EMPTY_COMBO_MODEL;
  private pnwTrigger?: HTMLButtonElement;
  private pnwValue?: HTMLSpanElement;
  private pnwPopup?: HTMLDivElement;
  private pnwList?: HTMLDivElement;
  private pnwFooter?: HTMLDivElement;
  private pnwClearButton?: HTMLButtonElement;
  private pnwOpen = false;
  private pnwListening = false;

  private readonly pnwOnDocumentPointerDown = (event: Event): void => {
    if (!this.pnwOpen || event.composedPath().includes(this)) return;
    this.pnwSetOpen(false);
  };

  private readonly pnwOnViewportChange = (): void => {
    if (this.pnwOpen) this.pnwPlacePopup();
  };

  connectedCallback(): void {
    this.pnwUpgradePreDefinitionModel();
    this.pnwEnsureDom();
    if (!this.pnwListening) {
      this.ownerDocument.addEventListener("pointerdown", this.pnwOnDocumentPointerDown);
      this.ownerDocument.addEventListener("scroll", this.pnwOnViewportChange, true);
      this.ownerDocument.defaultView?.addEventListener("resize", this.pnwOnViewportChange);
      this.pnwListening = true;
    }
    this.pnwApplyModel();
  }

  disconnectedCallback(): void {
    this.pnwSetOpen(false);
    if (!this.pnwListening) return;
    this.ownerDocument.removeEventListener("pointerdown", this.pnwOnDocumentPointerDown);
    this.ownerDocument.removeEventListener("scroll", this.pnwOnViewportChange, true);
    this.ownerDocument.defaultView?.removeEventListener("resize", this.pnwOnViewportChange);
    this.pnwListening = false;
  }

  set model(value: PnwComboModel | undefined) {
    this.pnwActiveModel = pnwNormalizeComboModel(value);
    this.pnwEnsureDom();
    this.pnwApplyModel();
  }

  get model(): PnwComboModel { return this.pnwActiveModel; }

  private pnwUpgradePreDefinitionModel(): void {
    if (!Object.prototype.hasOwnProperty.call(this, "model")) return;
    const holder = this as unknown as { model?: PnwComboModel };
    const model = holder.model;
    delete holder.model;
    this.model = model;
  }

  private pnwEnsureDom(): void {
    if (this.pnwTrigger) return;
    const style = this.ownerDocument.createElement("style");
    style.textContent = PNW_COMBO_STYLE;
    const trigger = this.ownerDocument.createElement("button");
    trigger.type = "button";
    trigger.className = "pnw-combo-trigger";
    trigger.setAttribute("part", "trigger");
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", "pnw-combo-listbox");
    const value = this.ownerDocument.createElement("span");
    value.className = "pnw-combo-value";
    value.setAttribute("part", "value");
    trigger.append(value, this.pnwCaret());
    trigger.onclick = () => this.pnwSetOpen(!this.pnwOpen, true);
    trigger.onkeydown = (event) => this.pnwOnTriggerKeyDown(event);

    const popup = this.ownerDocument.createElement("div");
    popup.className = "pnw-combo-popup";
    popup.setAttribute("part", "popup");
    popup.hidden = true;
    popup.onkeydown = (event) => this.pnwOnPopupKeyDown(event);
    const list = this.ownerDocument.createElement("div");
    list.id = "pnw-combo-listbox";
    list.className = "pnw-combo-list";
    list.setAttribute("role", "listbox");
    const footer = this.ownerDocument.createElement("div");
    footer.className = "pnw-combo-footer";
    const clear = this.ownerDocument.createElement("button");
    clear.type = "button";
    clear.className = "pnw-combo-clear";
    clear.setAttribute("part", "clear");
    clear.onclick = () => {
      if (this.pnwActiveModel.disabled || !this.pnwActiveModel.clearEnabled) return;
      this.pnwSetOpen(false);
      this.pnwTrigger?.focus();
      this.pnwEmit({ kind: "clear" });
    };
    footer.append(clear);
    popup.append(list, footer);
    this.pnwRoot.replaceChildren(style, trigger, popup);
    this.pnwTrigger = trigger;
    this.pnwValue = value;
    this.pnwPopup = popup;
    this.pnwList = list;
    this.pnwFooter = footer;
    this.pnwClearButton = clear;
  }

  private pnwApplyModel(): void {
    if (!this.pnwTrigger || !this.pnwValue || !this.pnwPopup || !this.pnwList
      || !this.pnwFooter || !this.pnwClearButton) return;
    const active = this.pnwRoot.activeElement as HTMLElement | null;
    const focusedRow = active?.closest<HTMLElement>(".pnw-combo-row");
    const focusedRowIndex = focusedRow
      ? Array.from(this.pnwList.querySelectorAll(".pnw-combo-row")).indexOf(focusedRow)
      : -1;
    const selected = this.pnwActiveModel.items.find(({ id }) => id === this.pnwActiveModel.selectedId);
    this.pnwValue.textContent = selected?.label ?? this.pnwActiveModel.placeholder;
    this.pnwValue.title = selected?.title ?? selected?.label ?? this.pnwActiveModel.placeholder;
    this.pnwTrigger.disabled = this.pnwActiveModel.disabled;
    this.pnwTrigger.title = this.pnwActiveModel.disabledReason
      ?? selected?.title ?? selected?.label ?? this.pnwActiveModel.placeholder;
    this.pnwTrigger.setAttribute("aria-label", this.pnwActiveModel.ariaLabel);
    this.pnwList.setAttribute("aria-label", this.pnwActiveModel.ariaLabel);
    if (this.pnwActiveModel.disabled) this.pnwSetOpen(false);

    const groups = new Map<string, PnwComboItem[]>();
    for (const item of this.pnwActiveModel.items) {
      const group = item.group ?? "";
      const items = groups.get(group) ?? [];
      items.push(item);
      groups.set(group, items);
    }
    const groupNodes = Array.from(groups, ([group, items]) => this.pnwGroupNode(group, items));
    if (!groupNodes.length) {
      const empty = this.ownerDocument.createElement("div");
      empty.className = "pnw-combo-empty";
      empty.textContent = this.pnwActiveModel.emptyText;
      groupNodes.push(empty);
    }
    this.pnwList.replaceChildren(...groupNodes);
    this.pnwClearButton.textContent = this.pnwActiveModel.clearLabel;
    this.pnwClearButton.disabled = this.pnwActiveModel.disabled || !this.pnwActiveModel.clearEnabled;
    this.pnwClearButton.title = this.pnwActiveModel.clearEnabled
      ? this.pnwActiveModel.clearLabel
      : (this.pnwActiveModel.clearDisabledReason ?? "当前没有可清空的项目");
    this.pnwClearButton.setAttribute("aria-label", this.pnwActiveModel.clearEnabled
      ? this.pnwActiveModel.clearLabel
      : `${this.pnwActiveModel.clearLabel}：${this.pnwClearButton.title}`);
    this.pnwFooter.hidden = this.pnwActiveModel.items.length === 0
      && !this.pnwActiveModel.clearEnabled;
    if (this.pnwOpen && focusedRow) {
      const rows = Array.from(this.pnwList.querySelectorAll<HTMLElement>(".pnw-combo-row"));
      const retained = rows.find((row) => row.dataset.itemId === focusedRow.dataset.itemId);
      const replacement = retained ?? rows[Math.min(focusedRowIndex, rows.length - 1)];
      const action = active?.classList.contains("pnw-combo-remove") && retained
        ? replacement?.querySelector<HTMLButtonElement>(".pnw-combo-remove:not(:disabled)")
        : undefined;
      if (replacement) (action ?? replacement.querySelector<HTMLButtonElement>(".pnw-combo-select"))?.focus();
      else {
        this.pnwSetOpen(false);
        this.pnwTrigger.focus();
      }
    }
    if (this.pnwOpen) queueMicrotask(() => this.pnwPlacePopup());
  }

  private pnwGroupNode(group: string, items: readonly PnwComboItem[]): HTMLDivElement {
    const groupNode = this.ownerDocument.createElement("div");
    groupNode.className = "pnw-combo-group";
    groupNode.setAttribute("role", "group");
    if (group) {
      const label = this.ownerDocument.createElement("div");
      label.className = "pnw-combo-group-label";
      label.textContent = group;
      label.title = group;
      groupNode.setAttribute("aria-label", group);
      groupNode.append(label);
    }
    for (const item of items) groupNode.append(this.pnwItemNode(item));
    return groupNode;
  }

  private pnwItemNode(item: PnwComboItem): HTMLDivElement {
    const row = this.ownerDocument.createElement("div");
    row.className = "pnw-combo-row";
    row.setAttribute("part", "row");
    row.dataset.itemId = item.id;
    const select = this.ownerDocument.createElement("button");
    select.type = "button";
    select.className = "pnw-combo-select";
    select.setAttribute("role", "option");
    select.setAttribute("aria-selected", item.id === this.pnwActiveModel.selectedId ? "true" : "false");
    select.setAttribute("aria-label", `选择${item.label}`);
    select.textContent = item.label;
    select.title = item.title ?? item.label;
    select.disabled = this.pnwActiveModel.disabled;
    select.onclick = () => {
      if (this.pnwActiveModel.disabled) return;
      this.pnwSetOpen(false);
      this.pnwTrigger?.focus();
      this.pnwEmit({ kind: "select", itemId: item.id });
    };
    const remove = this.ownerDocument.createElement("button");
    remove.type = "button";
    remove.className = "pnw-combo-remove";
    remove.textContent = "×";
    remove.disabled = this.pnwActiveModel.disabled || !item.removable;
    remove.title = item.removable ? `删除${item.label}` : (item.removeDisabledReason ?? "此项不能删除");
    remove.setAttribute("aria-label", item.removable
      ? `删除${item.label}`
      : `删除${item.label}：${remove.title}`);
    remove.onclick = (event) => {
      event.stopPropagation();
      if (this.pnwActiveModel.disabled || !item.removable) return;
      this.pnwEmit({ kind: "remove", itemId: item.id });
    };
    row.append(select, remove);
    return row;
  }

  private pnwSetOpen(open: boolean, focusFirst = false): void {
    if (!this.pnwTrigger || !this.pnwPopup) return;
    this.pnwOpen = open && !this.pnwActiveModel.disabled;
    this.pnwPopup.hidden = !this.pnwOpen;
    this.pnwTrigger.setAttribute("aria-expanded", this.pnwOpen ? "true" : "false");
    if (this.pnwOpen) {
      this.pnwPlacePopup();
      if (focusFirst) queueMicrotask(() => {
        if (this.pnwOpen && this.isConnected) this.pnwOptionButtons()[0]?.focus();
      });
    }
  }

  private pnwPlacePopup(): void {
    if (!this.pnwOpen || !this.pnwTrigger || !this.pnwPopup) return;
    const trigger = this.pnwTrigger.getBoundingClientRect();
    const view = this.ownerDocument.defaultView;
    const viewport = {
      top: 0,
      left: 0,
      right: view?.innerWidth ?? this.ownerDocument.documentElement?.clientWidth ?? trigger.right,
      bottom: view?.innerHeight ?? this.ownerDocument.documentElement?.clientHeight ?? trigger.bottom,
    };
    const boundary = this.pnwClippingBoundary(viewport);
    const gap = 2;
    const below = Math.max(0, boundary.bottom - trigger.bottom - gap);
    const above = Math.max(0, trigger.top - boundary.top - gap);
    const desiredHeight = Math.min(300, Math.max(28, this.pnwPopup.scrollHeight || 300));
    const opensUp = below < desiredHeight && above > below;
    const availableHeight = opensUp ? above : below;
    const maxHeight = Math.min(300, availableHeight);
    const popupHeight = Math.min(desiredHeight, maxHeight);
    const boundaryWidth = Math.max(0, boundary.right - boundary.left);
    const popupWidth = Math.min(Math.max(0, trigger.width), boundaryWidth);
    const furthestLeft = Math.max(boundary.left, boundary.right - popupWidth);
    const left = Math.min(Math.max(trigger.left, boundary.left), furthestLeft);
    const top = opensUp
      ? Math.max(boundary.top, trigger.top - gap - popupHeight)
      : trigger.bottom + gap;

    this.pnwPopup.dataset.placement = opensUp ? "top" : "bottom";
    this.pnwPopup.style.left = `${Math.round(left)}px`;
    this.pnwPopup.style.top = `${Math.round(top)}px`;
    this.pnwPopup.style.width = `${Math.round(popupWidth)}px`;
    this.pnwPopup.style.maxHeight = `${Math.max(0, Math.floor(maxHeight))}px`;
  }

  private pnwClippingBoundary(
    viewport: { top: number; left: number; right: number; bottom: number },
  ): typeof viewport {
    const boundary = { ...viewport };
    const view = this.ownerDocument.defaultView;
    let ancestor = this.assignedSlot ?? this.parentElement
      ?? (this.getRootNode() as ShadowRoot).host ?? null;
    while (ancestor) {
      const style = view?.getComputedStyle(ancestor);
      if (style && /(?:auto|scroll|hidden|clip)/u.test(
        `${style.overflow} ${style.overflowX} ${style.overflowY}`,
      )) {
        const rect = ancestor.getBoundingClientRect();
        boundary.top = Math.max(boundary.top, rect.top);
        boundary.left = Math.max(boundary.left, rect.left);
        boundary.right = Math.min(boundary.right, rect.right);
        boundary.bottom = Math.min(boundary.bottom, rect.bottom);
      }
      ancestor = ancestor.assignedSlot ?? ancestor.parentElement
        ?? (ancestor.getRootNode() as ShadowRoot).host ?? null;
    }
    return boundary;
  }

  private pnwOnTriggerKeyDown(event: KeyboardEvent): void {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      this.pnwSetOpen(true);
      const options = this.pnwOptionButtons();
      queueMicrotask(() => {
        if (this.pnwOpen && this.isConnected) (event.key === "ArrowUp" ? options.at(-1) : options[0])?.focus();
      });
      return;
    }
    if (event.key === "Escape" && this.pnwOpen) {
      event.preventDefault();
      this.pnwSetOpen(false);
    }
  }

  private pnwOnPopupKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.pnwSetOpen(false);
      this.pnwTrigger?.focus();
      return;
    }
    if (event.key === "Tab") {
      this.pnwSetOpen(false);
      // Let native Tab/Shift+Tab continue from the trigger, not a hidden option.
      this.pnwTrigger?.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const options = this.pnwOptionButtons();
    if (!options.length) return;
    event.preventDefault();
    const current = this.pnwRoot.activeElement;
    const index = options.findIndex((option) => option === current);
    const next = event.key === "Home" ? 0
      : event.key === "End" ? options.length - 1
        : event.key === "ArrowDown" ? (index + 1 + options.length) % options.length
          : (index - 1 + options.length) % options.length;
    options[next]?.focus();
  }

  private pnwOptionButtons(): HTMLButtonElement[] {
    return Array.from(this.pnwRoot.querySelectorAll<HTMLButtonElement>(
      '.pnw-combo-select[role="option"]',
    ));
  }

  private pnwCaret(): SVGSVGElement {
    const svg = this.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("pnw-combo-caret");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    const path = this.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M4 6l4 4 4-4");
    svg.append(path);
    return svg;
  }

  private pnwEmit(detail: PnwComboActionDetail): void {
    this.dispatchEvent(new CustomEvent<PnwComboActionDetail>(PNW_COMBO_ACTION, {
      detail: Object.freeze({ ...detail }),
      bubbles: true,
      composed: true,
    }));
  }
}

export function pnwNormalizeComboModel(
  value: PnwComboModel | null | undefined,
): PnwComboModel {
  if (!value) return PNW_EMPTY_COMBO_MODEL;
  const items: PnwComboItem[] = [];
  const seen = new Set<string>();
  for (const candidate of value.items ?? []) {
    const id = pnwComboText(candidate.id, 512);
    const label = pnwComboText(candidate.label, 1_024);
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    items.push(Object.freeze({
      id,
      label,
      ...(pnwComboText(candidate.group, 256)
        ? { group: pnwComboText(candidate.group, 256) }
        : {}),
      ...(pnwComboText(candidate.title, 2_048)
        ? { title: pnwComboText(candidate.title, 2_048) }
        : {}),
      removable: candidate.removable === true,
      ...(pnwComboText(candidate.removeDisabledReason, 512)
        ? { removeDisabledReason: pnwComboText(candidate.removeDisabledReason, 512) }
        : {}),
    }));
    if (items.length >= 200) break;
  }
  const selectedId = pnwComboText(value.selectedId, 512);
  const selected = selectedId && items.some(({ id }) => id === selectedId)
    ? selectedId
    : undefined;
  return Object.freeze({
    ariaLabel: pnwComboText(value.ariaLabel, 256) || PNW_EMPTY_COMBO_MODEL.ariaLabel,
    placeholder: pnwComboText(value.placeholder, 512) || PNW_EMPTY_COMBO_MODEL.placeholder,
    emptyText: pnwComboText(value.emptyText, 512) || PNW_EMPTY_COMBO_MODEL.emptyText,
    items: Object.freeze(items),
    ...(selected ? { selectedId: selected } : {}),
    disabled: value.disabled === true,
    ...(pnwComboText(value.disabledReason, 512)
      ? { disabledReason: pnwComboText(value.disabledReason, 512) }
      : {}),
    clearEnabled: value.clearEnabled === true && items.some(({ removable }) => removable),
    clearLabel: pnwComboText(value.clearLabel, 128) || PNW_EMPTY_COMBO_MODEL.clearLabel,
    ...(pnwComboText(value.clearDisabledReason, 512)
      ? { clearDisabledReason: pnwComboText(value.clearDisabledReason, 512) }
      : {}),
  });
}

export function pnwCodeDefineCombo(tagName = PNW_COMBO_TAG): typeof PnwCombo {
  const existing = customElements.get(tagName);
  if (existing) return existing as typeof PnwCombo;
  customElements.define(tagName, PnwCombo);
  return PnwCombo;
}

function pnwComboText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

declare global {
  interface HTMLElementTagNameMap {
    "pnw-combo": PnwCombo;
  }
}
