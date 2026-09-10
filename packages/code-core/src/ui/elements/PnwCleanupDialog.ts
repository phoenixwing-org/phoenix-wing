// SPDX-License-Identifier: Apache-2.0

export const PNW_CLEANUP_DIALOG_TAG = "pnw-cleanup-dialog";
export const PNW_CLEANUP_DIALOG_ACTION = "pnw-cleanup-dialog-action";

export type PnwCleanupDialogRisk = "normal" | "high";
export type PnwCleanupDialogPreviewState =
  | "idle"
  | "loading"
  | "ready"
  | "executing"
  | "complete"
  | "error";

export interface PnwCleanupDialogMode {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly risk: PnwCleanupDialogRisk;
  /** Overrides the dialog-level fallback for this mode. */
  readonly rulesVisible?: boolean;
}

export interface PnwCleanupDialogTarget {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly description?: string;
  readonly selected: boolean;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
  readonly supportedModeIds?: readonly string[];
}

export interface PnwCleanupDialogPreview {
  readonly state: PnwCleanupDialogPreviewState;
  /** Opaque Host token binding Execute to the accepted preview. */
  readonly token?: string;
  readonly summary?: string;
  readonly message?: string;
  readonly items: readonly string[];
}

export interface PnwCleanupDialogModel {
  readonly title: string;
  readonly description?: string;
  readonly modes: readonly PnwCleanupDialogMode[];
  readonly selectedModeId?: string;
  /** Optional presentation only; selection, request and risk semantics are unchanged. */
  readonly modePresentation?: "select" | "radio";
  readonly collapsibleSections?: boolean;
  readonly actionsPlacement?: "header" | "footer";
  readonly targets: readonly PnwCleanupDialogTarget[];
  readonly rulesVisible: boolean;
  readonly rulesLabel: string;
  readonly rulesYaml: string;
  readonly preview: PnwCleanupDialogPreview;
  readonly previewEnabled: boolean;
  readonly previewDisabledReason?: string;
  readonly executeEnabled: boolean;
  readonly executeDisabledReason?: string;
  readonly previewLabel: string;
  readonly executeLabel: string;
  readonly cancelLabel: string;
  readonly highRiskConfirmationLabel: string;
  /** Defaults to true. False omits only the extra checkbox, never the risk or frozen-preview gates. */
  readonly requireHighRiskConfirmation?: boolean;
}

export interface PnwCleanupDialogRequest {
  readonly modeId: string;
  readonly targetIds: readonly string[];
  readonly rulesYaml: string;
}

export type PnwCleanupDialogActionDetail =
  | { readonly kind: "change-mode"; readonly modeId: string }
  | { readonly kind: "toggle-target"; readonly targetId: string; readonly selected: boolean }
  | { readonly kind: "change-rules"; readonly rulesYaml: string }
  | { readonly kind: "preview"; readonly request: PnwCleanupDialogRequest }
  | {
    readonly kind: "execute";
    readonly request: PnwCleanupDialogRequest;
    readonly previewToken: string;
  }
  | { readonly kind: "cancel" };

const PNW_EMPTY_CLEANUP_DIALOG_MODEL: PnwCleanupDialogModel = Object.freeze({
  title: "清理",
  modes: Object.freeze([]),
  modePresentation: "select",
  targets: Object.freeze([]),
  rulesVisible: false,
  rulesLabel: "清理规则",
  rulesYaml: "",
  preview: Object.freeze({ state: "idle", items: Object.freeze([]) }),
  previewEnabled: false,
  executeEnabled: false,
  previewLabel: "预览",
  executeLabel: "清理",
  cancelLabel: "取消",
  highRiskConfirmationLabel: "我已核对预览，确认执行不可撤销的清理。",
  requireHighRiskConfirmation: true,
});

const PNW_CLEANUP_DIALOG_STYLE = `
:host { color: var(--vscode-foreground, #1f1f1f); font: var(--vscode-font-size, 13px)/1.4 var(--vscode-font-family, system-ui, sans-serif); }
* { box-sizing: border-box; }
button, select, textarea, input { font: inherit; }
.pnw-cleanup-dialog {
  /* Anchor the header to the viewport; mode/section changes grow downward only. */
  position: fixed; top: 16px; bottom: auto; margin: 0 auto;
  width: min(680px, calc(100vw - 32px)); max-width: 100%; max-height: min(760px, calc(100vh - 32px)); padding: 0;
  overflow: hidden; border: 1px solid var(--vscode-widget-border, #8e8e8e); color: inherit;
  background: var(--vscode-editorWidget-background, var(--vscode-editor-background, #fff)); box-shadow: 0 8px 30px var(--vscode-widget-shadow, rgba(0,0,0,.35));
}
.pnw-cleanup-dialog::backdrop { background: rgba(0,0,0,.38); }
.pnw-cleanup-shell { display: grid; max-height: inherit; grid-template-rows: auto minmax(0, 1fr) auto; }
.pnw-cleanup-header, .pnw-cleanup-footer { display: flex; align-items: center; gap: 8px; padding: 9px 12px; }
.pnw-cleanup-header { border-bottom: 1px solid var(--vscode-panel-border, #d4d4d4); }
.pnw-cleanup-title { flex: 1; min-width: 0; margin: 0; font-size: 14px; font-weight: 600; }
.pnw-cleanup-close { width: 26px; height: 26px; padding: 0; border: 0; color: inherit; background: transparent; cursor: pointer; }
.pnw-cleanup-close:hover { background: var(--vscode-toolbar-hoverBackground, #e8e8e8); }
.pnw-cleanup-content { min-height: 0; padding: 10px 12px; overflow: auto; }
.pnw-cleanup-description, .pnw-cleanup-mode-description, .pnw-cleanup-target-description, .pnw-cleanup-message { color: var(--vscode-descriptionForeground, #616161); }
.pnw-cleanup-description { margin: 0 0 9px; }
.pnw-cleanup-field { display: grid; gap: 5px; margin-top: 10px; }
.pnw-cleanup-field:first-child { margin-top: 0; }
.pnw-cleanup-label { font-weight: 600; }
.pnw-cleanup-block { margin-top: 10px; border: 1px solid var(--vscode-panel-border, #d4d4d4); }
.pnw-cleanup-block > summary { cursor: pointer; padding: 6px 8px; font-weight: 600; background: var(--vscode-sideBarSectionHeader-background, rgba(128,128,128,.12)); }
.pnw-cleanup-block > summary:hover { background: var(--vscode-list-hoverBackground, rgba(128,128,128,.16)); }
.pnw-cleanup-block > :not(summary) { margin: 6px; }
.pnw-cleanup-header-actions { display: flex; align-items: center; gap: 6px; min-width: 0; overflow-x: auto; }
.pnw-cleanup-header-actions:empty { display: none; }
.pnw-cleanup-header-actions button, ::slotted(button[slot="header-actions"]) { flex: 0 0 auto; white-space: nowrap; }
::slotted(button[slot="header-actions"]) { font: inherit; min-height: 28px; padding: 3px 8px; cursor: pointer; border: 1px solid var(--vscode-button-border, transparent); color: var(--vscode-button-secondaryForeground, inherit); background: var(--vscode-button-secondaryBackground, #e5e5e5); }
::slotted(button[slot="header-actions"]:hover) { background: var(--vscode-button-secondaryHoverBackground, #d5d5d5); }
::slotted(button[slot="header-actions"]:disabled) { opacity: .55; cursor: default; }
::slotted(button[slot="header-actions"]:focus-visible) { outline: 1px solid var(--vscode-focusBorder, #0078d4); }
.pnw-cleanup-shell[data-header-actions="true"] { grid-template-rows: auto minmax(0, 1fr); }
.pnw-cleanup-footer[hidden] { display: none; }
.pnw-cleanup-mode { width: 100%; min-height: 28px; padding: 3px 6px; border: 1px solid var(--vscode-dropdown-border, #8e8e8e); color: var(--vscode-dropdown-foreground, inherit); background: var(--vscode-dropdown-background, #fff); }
.pnw-cleanup-mode option { color: var(--vscode-dropdown-foreground, var(--vscode-foreground, CanvasText)); background: var(--vscode-dropdown-background, var(--vscode-editor-background, Canvas)); }
.pnw-cleanup-modes { display: flex; flex-wrap: nowrap; align-items: center; gap: 12px; min-width: 0; overflow-x: auto; }
.pnw-cleanup-mode-choice { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 5px; min-height: 28px; white-space: nowrap; cursor: pointer; }
.pnw-cleanup-mode-radio { margin: 0; accent-color: var(--vscode-button-background, #0078d4); }
.pnw-cleanup-mode-description { margin: 0; font-size: 12px; }
.pnw-cleanup-targets { display: grid; border: 1px solid var(--vscode-panel-border, #d4d4d4); }
.pnw-cleanup-target { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 7px; padding: 6px 7px; align-items: start; }
.pnw-cleanup-target + .pnw-cleanup-target { border-top: 1px solid var(--vscode-panel-border, #d4d4d4); }
.pnw-cleanup-target-main { min-width: 0; }
.pnw-cleanup-target-label { font-weight: 600; }
.pnw-cleanup-target-path { overflow: hidden; color: var(--vscode-descriptionForeground, #616161); font-family: var(--vscode-editor-font-family, monospace); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.pnw-cleanup-target-description { font-size: 11px; }
.pnw-cleanup-rules { width: 100%; min-height: 132px; resize: vertical; padding: 6px 7px; border: 1px solid var(--vscode-input-border, #8e8e8e); color: var(--vscode-input-foreground, inherit); background: var(--vscode-input-background, #fff); font-family: var(--vscode-editor-font-family, monospace); }
.pnw-cleanup-preview { min-height: 74px; border: 1px solid var(--vscode-panel-border, #d4d4d4); }
.pnw-cleanup-preview-summary, .pnw-cleanup-message { margin: 0; padding: 6px 7px; }
.pnw-cleanup-preview-summary { font-weight: 600; background: var(--vscode-sideBarSectionHeader-background, rgba(128,128,128,.12)); }
.pnw-cleanup-message[data-error="true"] { color: var(--vscode-errorForeground, #a1260d); }
.pnw-cleanup-items { max-height: 164px; margin: 0; padding: 3px 7px 6px 25px; overflow: auto; font-family: var(--vscode-editor-font-family, monospace); font-size: 12px; }
.pnw-cleanup-confirm { display: flex; gap: 7px; margin-top: 10px; padding: 7px; border: 1px solid var(--vscode-inputValidation-warningBorder, #b89500); background: var(--vscode-inputValidation-warningBackground, rgba(184,149,0,.09)); }
.pnw-cleanup-footer { justify-content: flex-end; border-top: 1px solid var(--vscode-panel-border, #d4d4d4); }
.pnw-cleanup-button { min-height: 28px; padding: 3px 10px; border: 1px solid var(--vscode-button-border, transparent); color: var(--vscode-button-secondaryForeground, inherit); background: var(--vscode-button-secondaryBackground, #e5e5e5); cursor: pointer; }
.pnw-cleanup-button:hover:not(:disabled) { background: var(--vscode-button-secondaryHoverBackground, #d5d5d5); }
.pnw-cleanup-button-primary { color: var(--vscode-button-foreground, #fff); background: var(--vscode-button-background, #0078d4); }
.pnw-cleanup-button-primary:hover:not(:disabled) { background: var(--vscode-button-hoverBackground, #026ec1); }
.pnw-cleanup-button:disabled, input:disabled, select:disabled, textarea:disabled { cursor: default; opacity: .55; }
button:focus-visible, select:focus-visible, textarea:focus-visible, input:focus-visible { outline: 1px solid var(--vscode-focusBorder, #0078d4); outline-offset: 1px; }
@media (forced-colors: active) { .pnw-cleanup-dialog, .pnw-cleanup-targets, .pnw-cleanup-preview, .pnw-cleanup-rules, .pnw-cleanup-mode { border-color: CanvasText; } }
`;

export class PnwCleanupDialog extends HTMLElement {
  private readonly pnwRoot = this.attachShadow({ mode: "open" });
  private pnwActiveModel = PNW_EMPTY_CLEANUP_DIALOG_MODEL;
  private pnwDialog?: HTMLDialogElement;
  private pnwBody?: HTMLDivElement;
  private pnwTitle?: HTMLHeadingElement;
  private pnwDescription?: HTMLParagraphElement;
  private pnwWorkspaceSlot?: HTMLSlotElement;
  private pnwCancelButton?: HTMLButtonElement;
  private pnwPreviewButton?: HTMLButtonElement;
  private pnwExecuteButton?: HTMLButtonElement;
  private pnwHighRiskConfirmed = false;
  private pnwHeaderActions?: HTMLDivElement;
  private pnwFooter?: HTMLElement;
  private readonly pnwSectionOpen = new Map<string, boolean>();

  connectedCallback(): void {
    this.pnwUpgradePreDefinitionModel();
    this.pnwEnsureDom();
    this.pnwRender();
  }

  set model(value: PnwCleanupDialogModel | undefined) {
    const previousToken = this.pnwActiveModel.preview.token;
    this.pnwActiveModel = pnwNormalizeCleanupDialogModel(value);
    if (previousToken !== this.pnwActiveModel.preview.token) this.pnwHighRiskConfirmed = false;
    this.pnwEnsureDom();
    this.pnwRender();
  }

  get model(): PnwCleanupDialogModel { return this.pnwActiveModel; }

  showModal(modeId?: string): void {
    this.pnwEnsureDom();
    if (modeId && this.pnwActiveModel.modes.some(({ id }) => id === modeId)) {
      this.pnwActivateMode(modeId, false);
    }
    this.pnwRender();
    if (!this.pnwDialog?.open) {
      if (typeof this.pnwDialog?.showModal === "function") this.pnwDialog.showModal();
      else this.pnwDialog?.setAttribute("open", "");
    }
  }

  close(): void {
    if (!this.pnwDialog?.open && !this.pnwDialog?.hasAttribute("open")) return;
    if (typeof this.pnwDialog.close === "function") this.pnwDialog.close();
    else this.pnwDialog.removeAttribute("open");
  }

  private pnwUpgradePreDefinitionModel(): void {
    if (!Object.prototype.hasOwnProperty.call(this, "model")) return;
    const holder = this as unknown as { model?: PnwCleanupDialogModel };
    const model = holder.model;
    delete holder.model;
    this.model = model;
  }

  private pnwEnsureDom(): void {
    if (this.pnwDialog) return;
    const style = document.createElement("style");
    style.textContent = PNW_CLEANUP_DIALOG_STYLE;
    const dialog = document.createElement("dialog");
    dialog.className = "pnw-cleanup-dialog";
    dialog.setAttribute("part", "dialog");
    const shell = document.createElement("section");
    shell.className = "pnw-cleanup-shell";
    const header = document.createElement("header");
    header.className = "pnw-cleanup-header";
    const title = document.createElement("h2");
    title.id = "pnw-cleanup-title";
    title.className = "pnw-cleanup-title";
    dialog.setAttribute("aria-labelledby", title.id);
    const close = document.createElement("button");
    close.type = "button";
    close.className = "pnw-cleanup-close";
    close.setAttribute("aria-label", "关闭清理对话框");
    close.textContent = "×";
    close.onclick = () => this.pnwCancel();
    const headerActions = document.createElement("div");
    headerActions.className = "pnw-cleanup-header-actions";
    const hostActions = document.createElement("slot");
    hostActions.name = "header-actions";
    headerActions.append(hostActions);
    const body = document.createElement("div");
    body.className = "pnw-cleanup-content";
    const description = document.createElement("p");
    description.className = "pnw-cleanup-description";
    const workspace = document.createElement("slot");
    workspace.name = "workspace";
    body.append(workspace, description);
    const footer = document.createElement("footer");
    footer.className = "pnw-cleanup-footer";
    const cancel = this.pnwButton("pnw-cleanup-cancel", () => this.pnwCancel());
    const preview = this.pnwButton("pnw-cleanup-preview-action", () => this.pnwEmitPreview());
    const execute = this.pnwButton(
      "pnw-cleanup-execute pnw-cleanup-button-primary",
      () => this.pnwEmitExecute(),
    );
    header.append(title, headerActions, close);
    footer.append(cancel, preview, execute);
    shell.append(header, body, footer);
    dialog.append(shell);
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.pnwCancel();
    });
    this.pnwRoot.append(style, dialog);
    this.pnwDialog = dialog;
    this.pnwBody = body;
    this.pnwTitle = title;
    this.pnwDescription = description;
    this.pnwWorkspaceSlot = workspace;
    this.pnwCancelButton = cancel;
    this.pnwPreviewButton = preview;
    this.pnwExecuteButton = execute;
    this.pnwHeaderActions = headerActions;
    this.pnwFooter = footer;
  }

  private pnwRender(): void {
    if (!this.pnwBody || !this.pnwTitle || !this.pnwDescription) return;
    const model = this.pnwActiveModel;
    const selectedMode = model.modes.find(({ id }) => id === model.selectedModeId);
    const busy = model.preview.state === "loading" || model.preview.state === "executing";
    const active = this.pnwRoot.activeElement;
    const focusedMode = active?.classList.contains("pnw-cleanup-mode-radio")
      ? (active as HTMLInputElement).value : undefined;
    const focusedSelect = active?.classList.contains("pnw-cleanup-mode") === true;
    this.pnwTitle.textContent = model.title;
    this.pnwDescription.textContent = model.description ?? "";
    this.pnwDescription.hidden = !model.description;
    // Keep the Host-owned workspace slot mounted while refreshing mode/preview state.
    for (const child of Array.from(this.pnwBody.children)) {
      if (child !== this.pnwWorkspaceSlot && child !== this.pnwDescription) child.remove();
    }
    this.pnwBody.append(
      this.pnwRenderMode(model, selectedMode, busy),
      this.pnwRenderTargets(model, busy),
    );
    if (selectedMode?.rulesVisible ?? model.rulesVisible) {
      this.pnwBody.append(this.pnwRenderRules(model, busy));
    }
    this.pnwBody.append(this.pnwRenderPreview(model));
    if (selectedMode?.risk === "high" && model.requireHighRiskConfirmation !== false) {
      this.pnwBody.append(this.pnwRenderHighRisk(model, busy));
    }

    this.pnwRenderActions();
    if (focusedMode !== undefined && !busy) this.pnwFocusMode(focusedMode);
    else if (focusedSelect && !busy) this.pnwRoot.querySelector<HTMLSelectElement>(".pnw-cleanup-mode")?.focus();
  }

  private pnwRenderActions(): void {
    const model = this.pnwActiveModel;
    const selectedMode = model.modes.find(({ id }) => id === model.selectedModeId);
    const busy = this.pnwBusy();
    const inHeader = model.actionsPlacement === "header";
    if (this.pnwFooter && this.pnwHeaderActions && this.pnwCancelButton && this.pnwPreviewButton && this.pnwExecuteButton) {
      const actions = inHeader ? this.pnwHeaderActions : this.pnwFooter;
      // Move existing controls, never duplicate actions or their event handlers.
      if (this.pnwCancelButton.parentElement !== actions) actions.append(this.pnwCancelButton, this.pnwPreviewButton, this.pnwExecuteButton);
      this.pnwFooter.hidden = inHeader;
      this.pnwFooter.parentElement?.setAttribute("data-header-actions", String(inHeader));
    }
    if (this.pnwCancelButton) this.pnwCancelButton.textContent = model.cancelLabel;
    if (this.pnwPreviewButton) {
      this.pnwPreviewButton.textContent = model.preview.state === "loading" ? "预览中…" : model.previewLabel;
      this.pnwPreviewButton.disabled = busy || !model.previewEnabled || !this.pnwRequestReady();
      this.pnwPreviewButton.title = this.pnwPreviewButton.disabled
        ? model.previewDisabledReason ?? "请选择清理方式和目标"
        : "";
    }
    if (this.pnwExecuteButton) {
      this.pnwExecuteButton.textContent = model.preview.state === "executing" ? "清理中…" : model.executeLabel;
      this.pnwExecuteButton.disabled = busy
        || !model.executeEnabled
        || model.preview.state !== "ready"
        || !model.preview.token
        || !this.pnwRequestReady()
        || (selectedMode?.risk === "high" && model.requireHighRiskConfirmation !== false && !this.pnwHighRiskConfirmed);
      this.pnwExecuteButton.title = this.pnwExecuteButton.disabled
        ? model.executeDisabledReason ?? "请先预览并确认"
        : "";
    }
  }

  private pnwRenderMode(
    model: PnwCleanupDialogModel,
    selectedMode: PnwCleanupDialogMode | undefined,
    busy: boolean,
  ): HTMLElement {
    const field = this.pnwField("清理方式");
    if (model.modePresentation === "radio") {
      const group = document.createElement("div");
      group.className = "pnw-cleanup-modes";
      group.setAttribute("role", "radiogroup");
      group.setAttribute("aria-label", "清理方式");
      for (const mode of model.modes) {
        const label = document.createElement("label");
        label.className = "pnw-cleanup-mode-choice";
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "pnw-cleanup-mode";
        radio.className = "pnw-cleanup-mode-radio";
        radio.value = mode.id;
        radio.checked = mode.id === model.selectedModeId;
        radio.disabled = busy;
        radio.onchange = () => {
          if (radio.checked && !radio.disabled) this.pnwActivateMode(mode.id, true);
        };
        radio.onkeydown = (event) => {
          if (radio.disabled || this.pnwBusy()) return;
          const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
          if (!keys.includes(event.key)) return;
          event.preventDefault();
          const current = model.modes.findIndex(({ id }) => id === mode.id);
          const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? model.modes.length - 1
            : (current + (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) + model.modes.length) % model.modes.length;
          const next = model.modes[nextIndex];
          if (next) { this.pnwActivateMode(next.id, true); this.pnwFocusMode(next.id); }
        };
        const text = document.createElement("span");
        text.textContent = `${mode.label}${mode.risk === "high" ? " · 高风险" : ""}`;
        label.append(radio, text);
        group.append(label);
      }
      field.append(group);
    } else {
      const select = document.createElement("select");
      select.className = "pnw-cleanup-mode";
      select.disabled = busy;
      select.setAttribute("aria-label", "清理方式");
      for (const mode of model.modes) {
        const option = document.createElement("option");
        option.value = mode.id;
        option.textContent = `${mode.label}${mode.risk === "high" ? " · 高风险" : ""}`;
        option.selected = mode.id === model.selectedModeId;
        select.append(option);
      }
      select.onchange = () => {
        if (!select.disabled) this.pnwActivateMode(select.value, true);
      };
      field.append(select);
    }
    if (selectedMode?.description) {
      const description = document.createElement("p");
      description.className = "pnw-cleanup-mode-description";
      description.textContent = selectedMode.description;
      field.append(description);
    }
    return field;
  }

  private pnwRenderTargets(model: PnwCleanupDialogModel, busy: boolean): HTMLElement {
    const field = this.pnwField("清理目标");
    const targets = document.createElement("div");
    targets.className = "pnw-cleanup-targets";
    const visibleTargets = model.targets.filter((target) => (
      !target.supportedModeIds?.length || target.supportedModeIds.includes(model.selectedModeId ?? "")
    ));
    for (const target of visibleTargets) {
      const label = document.createElement("label");
      label.className = "pnw-cleanup-target";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = target.selected;
      checkbox.disabled = busy || Boolean(target.disabled);
      checkbox.title = target.disabledReason ?? "";
      checkbox.onchange = () => {
        const nextTargets = this.pnwActiveModel.targets.map((candidate) => (
          candidate.id === target.id ? { ...candidate, selected: checkbox.checked } : candidate
        ));
        this.pnwHighRiskConfirmed = false;
        this.pnwActiveModel = pnwNormalizeCleanupDialogModel({
          ...this.pnwActiveModel,
          targets: nextTargets,
          preview: { state: "idle", items: [] },
        });
        this.pnwEmit({ kind: "toggle-target", targetId: target.id, selected: checkbox.checked });
        this.pnwRender();
      };
      const main = document.createElement("span");
      main.className = "pnw-cleanup-target-main";
      const name = document.createElement("span");
      name.className = "pnw-cleanup-target-label";
      name.textContent = target.label;
      const path = document.createElement("span");
      path.className = "pnw-cleanup-target-path";
      path.textContent = target.path;
      path.title = target.path;
      main.append(name, document.createElement("br"), path);
      if (target.description) {
        const description = document.createElement("span");
        description.className = "pnw-cleanup-target-description";
        description.textContent = target.description;
        main.append(document.createElement("br"), description);
      }
      label.append(checkbox, main);
      targets.append(label);
    }
    if (!visibleTargets.length) {
      const empty = document.createElement("p");
      empty.className = "pnw-cleanup-message";
      empty.textContent = "当前方式没有可用目标。";
      targets.append(empty);
    }
    field.append(targets);
    return field;
  }

  private pnwActivateMode(modeId: string, emit: boolean): void {
    if (this.pnwBusy() || !this.pnwActiveModel.modes.some(({ id }) => id === modeId)) return;
    const nextTargets = this.pnwActiveModel.targets.map((target) => ({
      ...target,
      selected: !target.disabled
        && (!target.supportedModeIds?.length || target.supportedModeIds.includes(modeId)),
    }));
    this.pnwHighRiskConfirmed = false;
    this.pnwActiveModel = pnwNormalizeCleanupDialogModel({
      ...this.pnwActiveModel,
      selectedModeId: modeId,
      targets: nextTargets,
      preview: { state: "idle", items: [] },
    });
    if (emit) this.pnwEmit({ kind: "change-mode", modeId });
    this.pnwRender();
  }

  private pnwBusy(): boolean {
    return this.pnwActiveModel.preview.state === "loading" || this.pnwActiveModel.preview.state === "executing";
  }

  private pnwFocusMode(modeId: string): void {
    const radios = Array.from(this.pnwRoot.querySelectorAll<HTMLInputElement>(".pnw-cleanup-mode-radio"));
    (radios.find(({ value }) => value === modeId) ?? radios.find(({ checked }) => checked))?.focus();
  }

  private pnwRenderRules(model: PnwCleanupDialogModel, busy: boolean): HTMLElement {
    const field = this.pnwField(model.rulesLabel);
    const rules = document.createElement("textarea");
    rules.className = "pnw-cleanup-rules";
    rules.value = model.rulesYaml;
    rules.disabled = busy;
    rules.spellcheck = false;
    rules.setAttribute("aria-label", model.rulesLabel);
    rules.oninput = () => {
      if (rules.disabled || this.pnwBusy()) return;
      this.pnwHighRiskConfirmed = false;
      this.pnwActiveModel = pnwNormalizeCleanupDialogModel({
        ...this.pnwActiveModel,
        rulesYaml: rules.value,
        executeEnabled: false,
        preview: { state: "idle", items: [] },
      });
      // Refresh feedback only: keep the active textarea node, caret, IME and scroll intact.
      const previewField = this.pnwBody?.querySelector(".pnw-cleanup-preview")?.parentElement;
      previewField?.replaceWith(this.pnwRenderPreview(this.pnwActiveModel));
      this.pnwBody?.querySelector(".pnw-cleanup-confirm")
        ?.replaceWith(this.pnwRenderHighRisk(this.pnwActiveModel, false));
      this.pnwRenderActions();
      this.pnwEmit({ kind: "change-rules", rulesYaml: rules.value });
    };
    field.append(rules);
    return field;
  }

  private pnwRenderPreview(model: PnwCleanupDialogModel): HTMLElement {
    const field = this.pnwField("预览结果");
    const preview = document.createElement("section");
    preview.className = "pnw-cleanup-preview";
    preview.setAttribute("aria-live", "polite");
    if (model.preview.summary) {
      const summary = document.createElement("p");
      summary.className = "pnw-cleanup-preview-summary";
      summary.textContent = model.preview.summary;
      preview.append(summary);
    }
    if (model.preview.message || !model.preview.items.length) {
      const message = document.createElement("p");
      message.className = "pnw-cleanup-message";
      message.dataset.error = String(model.preview.state === "error");
      message.textContent = model.preview.message ?? pnwCleanupPreviewFallback(model.preview.state);
      preview.append(message);
    }
    if (model.preview.items.length) {
      const items = document.createElement("ol");
      items.className = "pnw-cleanup-items";
      for (const value of model.preview.items) {
        const item = document.createElement("li");
        item.textContent = value;
        item.title = value;
        items.append(item);
      }
      preview.append(items);
    }
    field.append(preview);
    return field;
  }

  private pnwRenderHighRisk(model: PnwCleanupDialogModel, busy: boolean): HTMLElement {
    const label = document.createElement("label");
    label.className = "pnw-cleanup-confirm";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = this.pnwHighRiskConfirmed;
    checkbox.disabled = busy || model.preview.state !== "ready" || !model.preview.token;
    checkbox.onchange = () => {
      this.pnwHighRiskConfirmed = checkbox.checked;
      this.pnwRender();
    };
    const text = document.createElement("span");
    text.textContent = model.highRiskConfirmationLabel;
    label.append(checkbox, text);
    return label;
  }

  private pnwField(labelText: string): HTMLElement {
    if (this.pnwActiveModel.collapsibleSections && labelText !== "清理方式") {
      const field = document.createElement("details");
      field.className = "pnw-cleanup-block";
      field.dataset.section = labelText;
      field.open = this.pnwSectionOpen.get(labelText) ?? true;
      const summary = document.createElement("summary");
      summary.textContent = labelText;
      // Capture synchronously before mode/model refresh can replace this node.
      summary.onclick = (event) => {
        event.preventDefault();
        field.open = !field.open;
        this.pnwSectionOpen.set(labelText, field.open);
      };
      field.ontoggle = () => { if (field.isConnected) this.pnwSectionOpen.set(labelText, field.open); };
      field.append(summary);
      return field;
    }
    const field = document.createElement("div");
    field.className = "pnw-cleanup-field";
    const label = document.createElement("div");
    label.className = "pnw-cleanup-label";
    label.textContent = labelText;
    field.append(label);
    return field;
  }

  private pnwButton(className: string, action: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `pnw-cleanup-button ${className}`;
    button.onclick = action;
    return button;
  }

  private pnwRequest(): PnwCleanupDialogRequest | undefined {
    const modeId = this.pnwActiveModel.selectedModeId;
    if (!modeId) return undefined;
    const targetIds = this.pnwActiveModel.targets
      .filter((target) => target.selected
        && !target.disabled
        && (!target.supportedModeIds?.length || target.supportedModeIds.includes(modeId)))
      .map(({ id }) => id);
    if (!targetIds.length) return undefined;
    return Object.freeze({ modeId, targetIds: Object.freeze(targetIds), rulesYaml: this.pnwActiveModel.rulesYaml });
  }

  private pnwRequestReady(): boolean { return Boolean(this.pnwRequest()); }

  private pnwEmitPreview(): void {
    const request = this.pnwRequest();
    if (!request || !this.pnwActiveModel.previewEnabled) return;
    this.pnwHighRiskConfirmed = false;
    this.pnwEmit({ kind: "preview", request });
  }

  private pnwEmitExecute(): void {
    const request = this.pnwRequest();
    const token = this.pnwActiveModel.preview.token;
    const selectedMode = this.pnwActiveModel.modes.find(({ id }) => id === request?.modeId);
    if (!request || !token || !this.pnwActiveModel.executeEnabled
      || this.pnwActiveModel.preview.state !== "ready"
      || (selectedMode?.risk === "high" && this.pnwActiveModel.requireHighRiskConfirmation !== false && !this.pnwHighRiskConfirmed)) return;
    this.pnwEmit({ kind: "execute", request, previewToken: token });
  }

  private pnwCancel(): void {
    this.close();
    this.pnwEmit({ kind: "cancel" });
  }

  private pnwEmit(detail: PnwCleanupDialogActionDetail): void {
    this.dispatchEvent(new CustomEvent<PnwCleanupDialogActionDetail>(PNW_CLEANUP_DIALOG_ACTION, {
      bubbles: true,
      composed: true,
      detail,
    }));
  }
}

export function pnwNormalizeCleanupDialogModel(
  value: PnwCleanupDialogModel | undefined,
): PnwCleanupDialogModel {
  if (!value) return PNW_EMPTY_CLEANUP_DIALOG_MODEL;
  const modeIds = new Set<string>();
  const modes = Object.freeze(value.modes.flatMap((mode) => {
    const id = mode.id.trim();
    if (!id || modeIds.has(id)) return [];
    modeIds.add(id);
    return [Object.freeze({ ...mode, id, label: mode.label.trim() || id })];
  }));
  const selectedModeId = value.selectedModeId && modeIds.has(value.selectedModeId)
    ? value.selectedModeId
    : modes[0]?.id;
  const targetIds = new Set<string>();
  const targets = Object.freeze(value.targets.flatMap((target) => {
    const id = target.id.trim();
    if (!id || targetIds.has(id)) return [];
    targetIds.add(id);
    return [Object.freeze({
      ...target,
      id,
      label: target.label.trim() || id,
      path: target.path.trim(),
      supportedModeIds: target.supportedModeIds
        ? Object.freeze([...new Set(target.supportedModeIds.filter((modeId) => modeIds.has(modeId)))])
        : undefined,
    })];
  }));
  const preview = Object.freeze({
    ...value.preview,
    items: Object.freeze([...value.preview.items]),
  });
  return Object.freeze({
    ...value,
    title: value.title.trim() || "清理",
    modes,
    modePresentation: value.modePresentation === "radio" ? "radio" : "select",
    selectedModeId,
    targets,
    preview,
    requireHighRiskConfirmation: value.requireHighRiskConfirmation !== false,
  });
}

export function pnwCodeDefineCleanupDialog(tagName = PNW_CLEANUP_DIALOG_TAG): void {
  if (!customElements.get(tagName)) customElements.define(tagName, PnwCleanupDialog);
}

function pnwCleanupPreviewFallback(state: PnwCleanupDialogPreviewState): string {
  if (state === "loading") return "正在生成预览…";
  if (state === "executing") return "正在执行清理…";
  if (state === "complete") return "清理已完成。";
  if (state === "error") return "清理预览失败。";
  if (state === "ready") return "未匹配到需要清理的项目。";
  return "先选择清理方式和目标，再预览实际改动。";
}
