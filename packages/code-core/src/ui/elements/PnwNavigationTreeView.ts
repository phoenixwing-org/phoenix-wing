// SPDX-License-Identifier: Apache-2.0

import {
  pnwFindNavigationTreeRow,
  pnwNavigationTreeChildFocusId,
  pnwNavigationTreeInitialFocusId,
  pnwNavigationTreeMoveFocus,
  pnwNavigationTreeParentFocusId,
  pnwProjectNavigationTreeRows,
  type PnwNavigationTreeIconKey,
  type PnwNavigationTreeModel,
  type PnwNavigationTreeRow,
} from "../model/PnwNavigationTreeModel.js";

export const PNW_NAVIGATION_TREE_TAG = "pnw-navigation-tree";
export const PNW_NAVIGATION_TREE_ACTION = "pnw-navigation-tree-action";

export type PnwNavigationTreeColorScheme = "light" | "dark" | "system";

export type PnwNavigationTreeActionDetail =
  | { readonly kind: "select"; readonly nodeId: string }
  | { readonly kind: "toggle"; readonly nodeId: string; readonly expanded: boolean }
  | { readonly kind: "activate"; readonly nodeId: string };

const PNW_NAVIGATION_TREE_STYLE = `
:host {
  --_pnw-tree-bg: var(--pnw-navigation-tree-bg, var(--vscode-sideBar-background, #ffffff));
  --_pnw-tree-text: var(--pnw-navigation-tree-text, var(--vscode-foreground, #1f1f1f));
  --_pnw-tree-muted: var(--pnw-navigation-tree-muted, var(--vscode-descriptionForeground, #616161));
  --_pnw-tree-hover-bg: var(--pnw-navigation-tree-hover-bg, var(--vscode-list-hoverBackground, #e8e8e8));
  --_pnw-tree-selected-bg: var(--pnw-navigation-tree-selected-bg, var(--vscode-list-inactiveSelectionBackground, #d4d4d4));
  --_pnw-tree-selected-text: var(--pnw-navigation-tree-selected-text, var(--vscode-list-activeSelectionForeground, #1f1f1f));
  --_pnw-tree-focus: var(--pnw-navigation-tree-focus, var(--vscode-focusBorder, #0078d4));
  display: block;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  color: var(--_pnw-tree-text);
  background: var(--_pnw-tree-bg);
  font: 13px/1.4 var(--vscode-font-family, system-ui, sans-serif);
}
:host([hidden]) { display: none; }
:host([color-scheme="dark"]) {
  --_pnw-tree-bg: var(--pnw-navigation-tree-bg, var(--vscode-sideBar-background, #1e1e1e));
  --_pnw-tree-text: var(--pnw-navigation-tree-text, var(--vscode-foreground, #cccccc));
  --_pnw-tree-muted: var(--pnw-navigation-tree-muted, var(--vscode-descriptionForeground, #a0a0a0));
  --_pnw-tree-hover-bg: var(--pnw-navigation-tree-hover-bg, var(--vscode-list-hoverBackground, #2a2d2e));
  --_pnw-tree-selected-bg: var(--pnw-navigation-tree-selected-bg, var(--vscode-list-inactiveSelectionBackground, #37373d));
  --_pnw-tree-selected-text: var(--pnw-navigation-tree-selected-text, var(--vscode-list-activeSelectionForeground, #ffffff));
  --_pnw-tree-focus: var(--pnw-navigation-tree-focus, var(--vscode-focusBorder, #007fd4));
}
* { box-sizing: border-box; }
.pnw-navigation-tree { min-width: 0; padding-block: 2px; }
.pnw-navigation-tree-row {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: var(--pnw-navigation-tree-row-height, 28px);
  padding-inline: 4px 8px;
  color: var(--_pnw-tree-text);
  cursor: default;
  outline: none;
  user-select: none;
}
.pnw-navigation-tree-row:hover { background: var(--_pnw-tree-hover-bg); }
.pnw-navigation-tree-row.pnw-is-selected {
  color: var(--_pnw-tree-selected-text);
  background: var(--_pnw-tree-selected-bg);
}
.pnw-navigation-tree-row:focus {
  z-index: 1;
  outline: 1px solid var(--_pnw-tree-focus);
  outline-offset: -1px;
}
.pnw-navigation-tree-row[aria-disabled="true"] { cursor: not-allowed; opacity: .55; }
.pnw-navigation-tree-indent {
  flex: 0 0 var(--pnw-navigation-tree-indent, 20px);
  width: var(--pnw-navigation-tree-indent, 20px);
}
.pnw-navigation-tree-caret,
.pnw-navigation-tree-caret-placeholder {
  display: inline-grid;
  flex: 0 0 22px;
  width: 22px;
  height: 24px;
  place-items: center;
}
.pnw-navigation-tree-caret {
  padding: 0;
  color: currentColor;
  background: transparent;
  border: 0;
  border-radius: 3px;
  cursor: pointer;
}
.pnw-navigation-tree-caret:hover { background: color-mix(in srgb, currentColor 10%, transparent); }
.pnw-navigation-tree-caret:focus-visible {
  outline: 1px solid var(--_pnw-tree-focus);
  outline-offset: -1px;
}
.pnw-navigation-tree-caret svg { width: 16px; height: 16px; transition: transform 100ms ease; }
.pnw-navigation-tree-caret[aria-expanded="true"] svg { transform: rotate(90deg); }
.pnw-navigation-tree-icon {
  display: inline-grid;
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  margin-inline: 1px 6px;
  place-items: center;
  color: var(--pnw-navigation-tree-icon, currentColor);
}
.pnw-navigation-tree-icon svg { width: 18px; height: 18px; }
.pnw-navigation-tree-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pnw-navigation-tree-description {
  min-width: 0;
  margin-inline-start: 7px;
  overflow: hidden;
  color: var(--_pnw-tree-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pnw-navigation-tree-row.pnw-is-selected .pnw-navigation-tree-description { color: currentColor; opacity: .78; }
.pnw-navigation-tree-empty { padding: 12px; color: var(--_pnw-tree-muted); text-align: center; }
@media (prefers-color-scheme: dark) {
  :host(:not([color-scheme="light"]):not([color-scheme="dark"])) {
    --_pnw-tree-bg: var(--pnw-navigation-tree-bg, var(--vscode-sideBar-background, #1e1e1e));
    --_pnw-tree-text: var(--pnw-navigation-tree-text, var(--vscode-foreground, #cccccc));
    --_pnw-tree-muted: var(--pnw-navigation-tree-muted, var(--vscode-descriptionForeground, #a0a0a0));
    --_pnw-tree-hover-bg: var(--pnw-navigation-tree-hover-bg, var(--vscode-list-hoverBackground, #2a2d2e));
    --_pnw-tree-selected-bg: var(--pnw-navigation-tree-selected-bg, var(--vscode-list-inactiveSelectionBackground, #37373d));
    --_pnw-tree-selected-text: var(--pnw-navigation-tree-selected-text, var(--vscode-list-activeSelectionForeground, #ffffff));
    --_pnw-tree-focus: var(--pnw-navigation-tree-focus, var(--vscode-focusBorder, #007fd4));
  }
}
@media (prefers-reduced-motion: reduce) {
  .pnw-navigation-tree-caret svg { transition: none; }
}
`;

const PNW_NAVIGATION_TREE_ICON_PATHS: Readonly<
  Record<PnwNavigationTreeIconKey, readonly string[]>
> = {
  catalog: ["M4 5.5h3v13H4z", "M10.5 5.5h3v13h-3z", "m16 6 4 12"],
  folder: ["M3 7.5h7l2-2h9v13H3z"],
  "folder-open": ["M3 8h7l2-2h9v3", "m4 10 2.5-6h15l-2.5 8H3z"],
  file: ["M6 3.5h8l4 4v13H6z", "M14 3.5v4h4"],
  info: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18", "M12 10.5v6", "M12 7.5h.01"],
  settings: ["M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5", "m19 13.5 1.5 1.2-2 3.5-1.8-.7-1.4.8-.2 1.9H9.3L9 17.5l-1.8-.7-1.5 1.4-2-3.5 1.5-1.2v-2l-1.5-1.2 2-3.5 1.8.7L9 6.5l.3-1.9h4.1l.3 1.9 1.8.7 1.5-1.4 2 3.5-1.5 1.2z"],
  search: ["M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15", "m16 16 5 5"],
  warning: ["M12 3 2.5 20h19z", "M12 9v5", "M12 17.5h.01"],
  error: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18", "m9 9 6 6", "m15 9-6 6"],
};

export class PnwNavigationTreeView extends HTMLElement {
  static get observedAttributes(): readonly string[] {
    return ["color-scheme"];
  }

  private readonly root = this.attachShadow({ mode: "open" });
  private currentModel: PnwNavigationTreeModel | undefined;
  private focusedNodeId: string | undefined;
  private visibleRows: readonly PnwNavigationTreeRow[] = [];

  get model(): PnwNavigationTreeModel | undefined {
    return this.currentModel;
  }

  set model(value: PnwNavigationTreeModel | undefined) {
    this.currentModel = value;
    this.render();
  }

  get colorScheme(): PnwNavigationTreeColorScheme {
    const value = this.getAttribute("color-scheme");
    return value === "light" || value === "dark" ? value : "system";
  }

  set colorScheme(value: PnwNavigationTreeColorScheme) {
    if (value === "system") this.removeAttribute("color-scheme");
    else this.setAttribute("color-scheme", value);
  }

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render();
  }

  private render(): void {
    if (!this.isConnected) return;
    const shouldRestoreFocus = this.root.activeElement?.classList.contains(
      "pnw-navigation-tree-row",
    ) === true;
    const model = this.currentModel;
    const style = document.createElement("style");
    style.textContent = PNW_NAVIGATION_TREE_STYLE;
    const tree = document.createElement("div");
    tree.className = "pnw-navigation-tree";
    tree.setAttribute("role", "tree");
    tree.setAttribute("aria-label", model?.ariaLabel ?? "导航树");

    this.visibleRows = model ? pnwProjectNavigationTreeRows(model) : [];
    const retainedFocus = pnwFindNavigationTreeRow(this.visibleRows, this.focusedNodeId);
    if (!retainedFocus || retainedFocus.node.disabled) {
      this.focusedNodeId = model
        ? pnwNavigationTreeInitialFocusId(this.visibleRows, model)
        : undefined;
    }

    if (!this.visibleRows.length) {
      const empty = document.createElement("div");
      empty.className = "pnw-navigation-tree-empty";
      empty.textContent = model?.emptyMessage ?? "没有导航项";
      tree.append(empty);
    } else {
      for (const row of this.visibleRows) tree.append(this.createRow(row));
    }
    this.root.replaceChildren(style, tree);
    if (shouldRestoreFocus && this.focusedNodeId) this.focusRow(this.focusedNodeId);
  }

  private createRow(row: PnwNavigationTreeRow): HTMLElement {
    const item = document.createElement("div");
    item.className = `pnw-navigation-tree-row${row.selected ? " pnw-is-selected" : ""}`;
    item.dataset.nodeId = row.node.id;
    item.setAttribute("role", "treeitem");
    item.setAttribute("aria-level", String(row.level));
    item.setAttribute("aria-posinset", String(row.positionInSet));
    item.setAttribute("aria-setsize", String(row.setSize));
    item.setAttribute("aria-selected", String(row.selected));
    item.setAttribute("aria-disabled", String(row.node.disabled === true));
    item.tabIndex = row.node.id === this.focusedNodeId && !row.node.disabled ? 0 : -1;
    if (row.hasChildren) item.setAttribute("aria-expanded", String(row.expanded));

    for (let level = 1; level < row.level; level += 1) {
      const indent = document.createElement("span");
      indent.className = "pnw-navigation-tree-indent";
      indent.setAttribute("aria-hidden", "true");
      item.append(indent);
    }
    item.append(this.createCaret(row));
    if (row.node.iconKey) item.append(this.createIcon(row.node.iconKey));

    const label = document.createElement("span");
    label.className = "pnw-navigation-tree-label";
    label.textContent = row.node.label;
    item.append(label);

    if (row.node.description) {
      const description = document.createElement("span");
      description.className = "pnw-navigation-tree-description";
      description.textContent = row.node.description;
      item.append(description);
      item.title = `${row.node.label} — ${row.node.description}`;
    } else {
      item.title = row.node.label;
    }

    item.addEventListener("focus", () => {
      this.focusedNodeId = row.node.id;
    });
    item.addEventListener("click", (event) => {
      if (row.node.disabled) return;
      // On one stable row, a native double click dispatches detail=1 then detail=2.
      // This is best-effort only: a controlled Host may synchronously replace the row.
      if (event.detail > 1) return;
      this.focusRow(row.node.id);
      this.emit({ kind: "select", nodeId: row.node.id });
      if (row.hasChildren) this.emitToggle(row);
    });
    item.addEventListener("dblclick", (event) => {
      if (row.node.disabled) return;
      event.preventDefault();
      if (!row.hasChildren) this.emit({ kind: "activate", nodeId: row.node.id });
    });
    item.addEventListener("keydown", (event) => this.handleKeydown(event, row));
    return item;
  }

  private createCaret(row: PnwNavigationTreeRow): HTMLElement {
    if (!row.hasChildren) {
      const placeholder = document.createElement("span");
      placeholder.className = "pnw-navigation-tree-caret-placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      return placeholder;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "pnw-navigation-tree-caret";
    button.tabIndex = -1;
    button.setAttribute("aria-label", row.expanded ? `折叠 ${row.node.label}` : `展开 ${row.node.label}`);
    button.setAttribute("aria-expanded", String(row.expanded));
    const svg = this.createSvg();
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "m9 5 7 7-7 7");
    svg.append(path);
    button.append(svg);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (row.node.disabled) return;
      if (event.detail > 1) return;
      this.focusRow(row.node.id);
      this.emitToggle(row);
    });
    return button;
  }

  private createIcon(iconKey: PnwNavigationTreeIconKey): HTMLElement {
    const wrapper = document.createElement("span");
    wrapper.className = "pnw-navigation-tree-icon";
    wrapper.setAttribute("aria-hidden", "true");
    const svg = this.createSvg();
    const iconPaths = PNW_NAVIGATION_TREE_ICON_PATHS[iconKey];
    const safePaths = iconPaths ?? PNW_NAVIGATION_TREE_ICON_PATHS.info;
    if (!iconPaths) wrapper.dataset.pnwIconFallback = "true";
    for (const pathData of safePaths) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      svg.append(path);
    }
    wrapper.append(svg);
    return wrapper;
  }

  private createSvg(): SVGSVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.75");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    return svg;
  }

  private handleKeydown(event: KeyboardEvent, row: PnwNavigationTreeRow): void {
    if (row.node.disabled) return;
    let targetId: string | undefined;
    switch (event.key) {
      case "ArrowDown":
        targetId = pnwNavigationTreeMoveFocus(this.visibleRows, row.node.id, "next");
        break;
      case "ArrowUp":
        targetId = pnwNavigationTreeMoveFocus(this.visibleRows, row.node.id, "previous");
        break;
      case "Home":
        targetId = pnwNavigationTreeMoveFocus(this.visibleRows, row.node.id, "first");
        break;
      case "End":
        targetId = pnwNavigationTreeMoveFocus(this.visibleRows, row.node.id, "last");
        break;
      case "ArrowRight":
        if (row.hasChildren && !row.expanded) this.emitToggle(row);
        else targetId = pnwNavigationTreeChildFocusId(this.visibleRows, row.node.id);
        break;
      case "ArrowLeft":
        if (row.hasChildren && row.expanded) this.emitToggle(row);
        else targetId = pnwNavigationTreeParentFocusId(this.visibleRows, row.node.id);
        break;
      case "Enter":
        this.emit({ kind: "activate", nodeId: row.node.id });
        break;
      case " ":
        this.emit({ kind: "select", nodeId: row.node.id });
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (targetId) this.focusRow(targetId);
  }

  private focusRow(nodeId: string): void {
    const next = this.root.querySelector<HTMLElement>(
      `.pnw-navigation-tree-row[data-node-id="${CSS.escape(nodeId)}"]`,
    );
    if (!next) return;
    this.root.querySelectorAll<HTMLElement>(".pnw-navigation-tree-row").forEach((row) => {
      row.tabIndex = row === next ? 0 : -1;
    });
    this.focusedNodeId = nodeId;
    next.focus();
  }

  private emitToggle(row: PnwNavigationTreeRow): void {
    this.emit({ kind: "toggle", nodeId: row.node.id, expanded: !row.expanded });
  }

  private emit(detail: PnwNavigationTreeActionDetail): void {
    this.dispatchEvent(
      new CustomEvent<PnwNavigationTreeActionDetail>(PNW_NAVIGATION_TREE_ACTION, {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  }
}

export function pnwCodeDefineNavigationTree(
  tagName = PNW_NAVIGATION_TREE_TAG,
): typeof PnwNavigationTreeView {
  const registered = customElements.get(tagName);
  if (registered) return registered as typeof PnwNavigationTreeView;
  customElements.define(tagName, PnwNavigationTreeView);
  return PnwNavigationTreeView;
}

declare global {
  interface HTMLElementTagNameMap {
    "pnw-navigation-tree": PnwNavigationTreeView;
  }
}
