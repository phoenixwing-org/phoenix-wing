// SPDX-License-Identifier: Apache-2.0

export const PNW_CONTENT_BLOCK_TAG = "pnw-content-block";
export const PNW_CONTENT_BLOCK_TOGGLE = "pnw-content-block-toggle";
export type PnwContentBlockLevel = "primary" | "secondary";
export interface PnwContentBlockToggleDetail { readonly expanded: boolean }
export interface PnwContentBlockOptions { readonly toggleEventType?: string }
export interface PnwContentBlockElement extends HTMLElement {
  open: boolean;
  level: PnwContentBlockLevel;
  collapsible: boolean;
  /** Focuses the native disclosure without exposing its Shadow DOM; static headings are not focusable. */
  focusHeader(options?: FocusOptions): void;
}
export interface PnwContentBlockConstructor {
  new(): PnwContentBlockElement;
  readonly observedAttributes: string[];
}

/** Import-safe in Node; invoke in a DOM realm. The source is self-contained for isolated Webviews. */
export function pnwCreateContentBlockClass(options: PnwContentBlockOptions = {}): PnwContentBlockConstructor {
  const pnwToggleEventType = options.toggleEventType?.trim() || "pnw-content-block-toggle";
  const PNW_STYLE = `
 :host { display:block; width:100%; min-width:0; margin:0; padding:0;
   color:var(--pnw-content-block-foreground,var(--vscode-foreground,var(--text,inherit)));
   font:var(--vscode-font-size,13px)/1.35 var(--vscode-font-family,system-ui,sans-serif); }
 :host([hidden]),[hidden] { display:none !important; }
 * { box-sizing:border-box; }
 .pnw-content-block { width:100%; min-width:0; margin:0; padding:0;
   border-top:1px solid var(--pnw-content-block-border,var(--vscode-panel-border,var(--border,currentColor))); }
 .pnw-content-block-header { display:flex; flex-wrap:wrap; align-items:center; gap:0 5px; width:100%; min-width:0; min-height:30px;
   color:var(--vscode-sideBarSectionHeader-foreground,var(--pnw-content-block-foreground,var(--vscode-foreground,var(--text,inherit))));
   background:var(--pnw-content-block-header-background,var(--vscode-sideBarSectionHeader-background,var(--panel-head-bg,transparent))); }
 .pnw-content-block-toggle { display:flex; flex:1 1 120px; align-items:center; gap:5px; min-width:0; min-height:30px;
   margin:0; padding:3px 6px 3px 4px; border:0; color:inherit; background:transparent;
   font:inherit; font-weight:600; text-align:left; }
 button.pnw-content-block-toggle { cursor:pointer; }
 button.pnw-content-block-toggle:hover { background:var(--vscode-list-hoverBackground,var(--hover,transparent)); }
 button.pnw-content-block-toggle:focus-visible { outline:1px solid var(--vscode-focusBorder,var(--accent,currentColor)); outline-offset:-1px; }
 .pnw-content-block-chevron,.pnw-content-block-icon { display:inline-grid; flex:0 0 16px; width:16px; height:16px; place-items:center; }
 .pnw-content-block-chevron svg { display:block; width:16px; height:16px; }
 :host([open]) .pnw-content-block-chevron svg { transform:rotate(90deg); }
 .pnw-content-block-title { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
 .pnw-content-block-status { flex:0 1 auto; min-width:0; overflow:hidden; color:var(--vscode-descriptionForeground,var(--muted,inherit));
   font-size:11px; font-weight:400; text-overflow:ellipsis; white-space:nowrap; }
 .pnw-content-block-context,.pnw-content-block-actions { display:flex; flex:0 1 auto; align-items:center; flex-wrap:wrap; gap:4px;
   min-width:0; max-width:100%; padding:2px 6px 2px 0; }
 .pnw-content-block-actions { flex:0 0 auto; margin-left:auto; }
 .pnw-content-block-has-context .pnw-content-block-toggle { flex:0 1 auto; }
 .pnw-content-block-has-context .pnw-content-block-status { flex:0 0 auto; }
 .pnw-content-block-context { flex:1 1 80px; min-width:min(80px,100%); width:100%; }
 slot[name="context"] { display:block; width:100%; min-width:0; }
 .pnw-content-block-body { width:100%; min-width:0; margin:0; padding:0; }
 ::slotted([slot="icon"]) { width:16px; height:16px; }
 ::slotted([slot="context"]),::slotted([slot="actions"]),::slotted([slot="body"]) { min-width:0; max-width:100%; }
 ::slotted([slot="context"]) { display:block; width:100%; }
 :host([level="secondary"]) .pnw-content-block { border-top:0; }
 :host([level="secondary"]) .pnw-content-block-header { min-height:26px; background:transparent; }
 :host([level="secondary"]) .pnw-content-block-toggle { min-height:26px; padding-left:12px; font-weight:500; }
 @media (forced-colors:active) { .pnw-content-block { border-color:CanvasText; } }
`;
  let pnwNextBlockId = 1;

  /** Presentation only. Slots retain their caller's nodes, controls, state and scroll ownership. */
  return class PnwContentBlock extends HTMLElement implements PnwContentBlockElement {
    static get observedAttributes(): string[] { return ["open", "level", "non-collapsible"]; }
    private readonly pnwRoot = this.attachShadow({ mode: "open" });
    private readonly pnwHeader = document.createElement("header");
    private pnwToggle: HTMLElement = document.createElement("button");
    private readonly pnwBody = document.createElement("div");
    private readonly pnwChevron = document.createElement("span");
    private readonly pnwTitleSlot = document.createElement("slot");
    private readonly pnwOptionalSlots = new Map<HTMLSlotElement, HTMLElement>();
    private readonly pnwTitleObserver = new MutationObserver(() => this.pnwUpdateTitleName());
    private pnwExpanded = true;

    constructor() {
      super();
      const pnwStyle = document.createElement("style"); pnwStyle.textContent = PNW_STYLE;
      const pnwBlock = document.createElement("section"); pnwBlock.className = "pnw-content-block"; pnwBlock.setAttribute("part", "block");
      this.pnwHeader.className = "pnw-content-block-header"; this.pnwHeader.setAttribute("part", "header");
      this.pnwToggle.setAttribute("type", "button"); this.pnwToggle.className = "pnw-content-block-toggle"; this.pnwToggle.setAttribute("part", "toggle");
      this.pnwChevron.className = "pnw-content-block-chevron"; this.pnwChevron.setAttribute("part", "chevron"); this.pnwChevron.setAttribute("aria-hidden", "true");
      const pnwSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      for (const [pnwKey, pnwValue] of Object.entries({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.75", "stroke-linecap": "round", "stroke-linejoin": "round" })) pnwSvg.setAttribute(pnwKey, pnwValue);
      const pnwPath = document.createElementNS("http://www.w3.org/2000/svg", "path"); pnwPath.setAttribute("d", "m9 5 7 7-7 7"); pnwSvg.append(pnwPath); this.pnwChevron.append(pnwSvg);
      const pnwIcon = this.pnwOptionalSlot("icon"); pnwIcon.setAttribute("aria-hidden", "true");
      const pnwTitle = document.createElement("span"); pnwTitle.className = "pnw-content-block-title"; pnwTitle.setAttribute("part", "title");
      this.pnwTitleSlot.name = "title"; pnwTitle.append(this.pnwTitleSlot);
      this.pnwTitleSlot.addEventListener("slotchange", () => this.pnwWatchTitle());
      this.pnwToggle.append(this.pnwChevron, pnwIcon, pnwTitle, this.pnwOptionalSlot("status"));
      this.pnwHeader.append(this.pnwToggle, this.pnwOptionalSlot("context"), this.pnwOptionalSlot("actions"));
      this.pnwBody.id = `pnw-content-block-body-${pnwNextBlockId++}`;
      this.pnwBody.className = "pnw-content-block-body"; this.pnwBody.setAttribute("part", "body");
      const pnwBodySlot = document.createElement("slot"); pnwBodySlot.name = "body";
      pnwBodySlot.append(document.createElement("slot")); this.pnwBody.append(pnwBodySlot);
      this.pnwHeader.addEventListener("click", pnwEvent => {
        if (!this.collapsible || !pnwEvent.composedPath().includes(this.pnwToggle)) return;
        this.open = !this.open;
        this.dispatchEvent(new CustomEvent<PnwContentBlockToggleDetail>(pnwToggleEventType, {
          detail: Object.freeze({ expanded: this.open }), bubbles: true, composed: true,
        }));
      });
      pnwBlock.append(this.pnwHeader, this.pnwBody); this.pnwRoot.append(pnwStyle, pnwBlock);
      this.pnwApplyState();
    }

    connectedCallback(): void {
      for (const pnwProperty of ["open", "level", "collapsible"] as const) {
        if (!Object.prototype.hasOwnProperty.call(this, pnwProperty)) continue;
        const pnwHolder = this as unknown as Record<string, unknown>;
        const pnwValue = pnwHolder[pnwProperty]; delete pnwHolder[pnwProperty]; pnwHolder[pnwProperty] = pnwValue;
      }
      this.toggleAttribute("open", this.pnwExpanded);
      this.pnwApplyState(); this.pnwUpdateOptionalSlots(); this.pnwWatchTitle();
      queueMicrotask(() => { if (this.isConnected) { this.pnwUpdateOptionalSlots(); this.pnwWatchTitle(); } });
    }
    disconnectedCallback(): void { this.pnwTitleObserver.disconnect(); }
    attributeChangedCallback(pnwName: string, _pnwOldValue: string | null, pnwValue: string | null): void {
      if (pnwName === "open") this.pnwExpanded = pnwValue !== null;
      this.pnwApplyState();
    }
    get open(): boolean { return this.pnwExpanded; }
    set open(pnwValue: boolean) { this.pnwExpanded = Boolean(pnwValue); this.toggleAttribute("open", this.pnwExpanded); this.pnwApplyState(); }
    get level(): PnwContentBlockLevel { return this.getAttribute("level") === "secondary" ? "secondary" : "primary"; }
    set level(pnwValue: PnwContentBlockLevel) { this.setAttribute("level", pnwValue === "secondary" ? "secondary" : "primary"); }
    get collapsible(): boolean { return !this.hasAttribute("non-collapsible"); }
    set collapsible(pnwValue: boolean) { this.toggleAttribute("non-collapsible", !pnwValue); this.pnwApplyState(); }
    focusHeader(pnwOptions?: FocusOptions): void { if (this.collapsible) this.pnwToggle.focus(pnwOptions); }

    private pnwApplyState(): void {
      const pnwTag = this.collapsible ? "BUTTON" : "DIV";
      if (this.pnwToggle.tagName !== pnwTag) {
        const pnwHeading = document.createElement(pnwTag.toLowerCase());
        pnwHeading.className = "pnw-content-block-toggle"; pnwHeading.setAttribute("part", "toggle");
        pnwHeading.append(...Array.from(this.pnwToggle.childNodes)); this.pnwToggle.replaceWith(pnwHeading); this.pnwToggle = pnwHeading;
      }
      this.pnwBody.hidden = this.collapsible && !this.pnwExpanded;
      this.pnwChevron.hidden = !this.collapsible;
      if (this.collapsible) {
        this.pnwToggle.setAttribute("type", "button"); this.pnwToggle.setAttribute("aria-expanded", String(this.pnwExpanded));
        this.pnwToggle.setAttribute("aria-controls", this.pnwBody.id); this.pnwToggle.removeAttribute("role"); this.pnwToggle.removeAttribute("aria-level");
      } else {
        this.pnwToggle.setAttribute("role", "heading"); this.pnwToggle.setAttribute("aria-level", "3");
        this.pnwToggle.removeAttribute("aria-expanded"); this.pnwToggle.removeAttribute("aria-controls");
      }
      this.pnwUpdateTitleName();
    }
    private pnwOptionalSlot(pnwName: string): HTMLElement {
      const pnwHolder = document.createElement("span"); pnwHolder.className = `pnw-content-block-${pnwName}`; pnwHolder.setAttribute("part", pnwName); pnwHolder.hidden = true;
      const pnwSlot = document.createElement("slot"); pnwSlot.name = pnwName;
      pnwSlot.addEventListener("slotchange", () => this.pnwUpdateOptionalSlots());
      this.pnwOptionalSlots.set(pnwSlot, pnwHolder); pnwHolder.append(pnwSlot); return pnwHolder;
    }
    private pnwUpdateOptionalSlots(): void {
      for (const [pnwSlot, pnwHolder] of this.pnwOptionalSlots) {
        pnwHolder.hidden = !pnwSlot.assignedNodes({ flatten: true }).some(pnwNode => pnwNode.nodeType === Node.ELEMENT_NODE || Boolean(pnwNode.textContent?.trim()));
      }
      const pnwHasContext = [...this.pnwOptionalSlots].some(([pnwSlot, pnwHolder]) => pnwSlot.name === "context" && !pnwHolder.hidden);
      this.pnwHeader.classList.toggle("pnw-content-block-has-context", pnwHasContext);
      this.pnwHeader.toggleAttribute("data-has-context", pnwHasContext);
    }
    private pnwWatchTitle(): void {
      this.pnwTitleObserver.disconnect();
      for (const pnwNode of this.pnwTitleSlot.assignedNodes({ flatten: true })) this.pnwTitleObserver.observe(pnwNode, { characterData: true, childList: true, subtree: true });
      this.pnwUpdateTitleName();
    }
    private pnwUpdateTitleName(): void {
      const pnwTitle = this.pnwTitleSlot.assignedNodes({ flatten: true }).map(pnwNode => pnwNode.textContent ?? "").join("").replace(/\s+/gu, " ").trim();
      this.pnwToggle.setAttribute("aria-label", pnwTitle || "区块");
    }
  };
}
