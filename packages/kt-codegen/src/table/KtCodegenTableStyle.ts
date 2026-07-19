// SPDX-License-Identifier: Apache-2.0

/** KtCodegenTable Shadow DOM 内部类名；同时驱动样式与 DOM，避免两处字符串漂移。 */
export const KT_CODEGEN_TABLE_CLASSES = Object.freeze({
  toolbar: "pnw-kt-codegen-table-toolbar",
  collapseToggle: "pnw-kt-codegen-table-collapse-toggle",
  collapseIndicator: "pnw-kt-codegen-table-collapse-indicator",
  caption: "pnw-kt-codegen-table-caption",
  shell: "pnw-kt-codegen-table-shell",
  selectedRow: "pnw-kt-codegen-table-selected-row",
  rowNumber: "pnw-kt-codegen-table-row-number",
  booleanCell: "pnw-kt-codegen-table-boolean-cell",
  unknownOption: "pnw-kt-codegen-table-unknown-option",
  empty: "pnw-kt-codegen-table-empty",
  statusbar: "pnw-kt-codegen-table-statusbar",
  status: "pnw-kt-codegen-table-status",
  error: "pnw-kt-codegen-table-error",
  dirty: "pnw-kt-codegen-table-dirty",
} as const);

/** KtCodegenTable 的宿主无关视觉原语；宿主可通过 pnw 变量或 VS Code token 换肤。 */
export const KT_CODEGEN_TABLE_STYLE = `
:host {
  --pnw-kt-codegen-border: var(--vscode-panel-border, color-mix(in srgb, currentColor 18%, transparent));
  --pnw-kt-codegen-background: var(--vscode-editor-background, #fff);
  --pnw-kt-codegen-toolbar-background: var(--vscode-sideBar-background, #f6f6f6);
  --pnw-kt-codegen-input-background: var(--vscode-input-background, #fff);
  --pnw-kt-codegen-input-foreground: var(--vscode-input-foreground, inherit);
  --pnw-kt-codegen-selection: var(--vscode-list-activeSelectionBackground, Highlight);
  --pnw-kt-codegen-selection-foreground: var(--vscode-list-activeSelectionForeground, HighlightText);
  --pnw-kt-codegen-inactive-selection: var(--vscode-list-inactiveSelectionBackground, var(--pnw-kt-codegen-hover));
  --pnw-kt-codegen-inactive-selection-foreground: var(--vscode-list-inactiveSelectionForeground, var(--vscode-foreground, inherit));
  --pnw-kt-codegen-hover: var(--vscode-list-hoverBackground, rgba(127, 127, 127, .12));
  --pnw-kt-codegen-focus: var(--vscode-focusBorder, #007acc);
  display: flex;
  min-height: 240px;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  color: var(--vscode-foreground, inherit);
  background: var(--pnw-kt-codegen-background);
  border: 1px solid var(--pnw-kt-codegen-border);
  border-radius: 6px;
  font: var(--vscode-font-size, 13px)/1.4 var(--vscode-font-family, system-ui, sans-serif);
  color-scheme: light dark;
}
:host([layout="page"]) {
  height: auto;
  min-height: 0;
  overflow: visible;
}
:host([collapsible][collapsed]) {
  height: auto !important;
  min-height: 0;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
.${KT_CODEGEN_TABLE_CLASSES.toolbar} {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 5px 8px;
  background: var(--pnw-kt-codegen-toolbar-background);
  border-bottom: 1px solid var(--pnw-kt-codegen-border);
  overflow-x: auto;
  scrollbar-width: thin;
}
.${KT_CODEGEN_TABLE_CLASSES.collapseToggle} {
  display: flex;
  flex: 1 0 max-content;
  align-self: stretch;
  align-items: center;
  gap: 5px;
  min-width: max-content;
  margin-right: auto;
  padding: 0 4px;
  text-align: left;
  background: transparent;
  border: 0;
}
.${KT_CODEGEN_TABLE_CLASSES.collapseToggle}:disabled { opacity: 1; cursor: default; }
.${KT_CODEGEN_TABLE_CLASSES.collapseIndicator} {
  display: inline-block;
  width: 12px;
  color: var(--vscode-descriptionForeground, inherit);
  text-align: center;
}
.${KT_CODEGEN_TABLE_CLASSES.caption} { flex: 0 0 auto; font-weight: 650; }
.${KT_CODEGEN_TABLE_CLASSES.toolbar} > .${KT_CODEGEN_TABLE_CLASSES.caption} { margin-right: auto; }
button {
  flex: 0 0 auto;
  min-height: 26px;
  padding: 2px 8px;
  color: inherit;
  background: var(--vscode-button-secondaryBackground, transparent);
  border: 1px solid var(--pnw-kt-codegen-border);
  border-radius: 4px;
  font: inherit;
  cursor: pointer;
}
button:hover:not(:disabled) { background: var(--pnw-kt-codegen-hover); }
button:focus-visible, input:focus-visible, select:focus-visible {
  outline: 1px solid var(--pnw-kt-codegen-focus);
  outline-offset: -1px;
}
button:disabled { opacity: .42; cursor: default; }
.${KT_CODEGEN_TABLE_CLASSES.shell} { position: relative; flex: 1 1 auto; min-height: 0; overflow: auto; }
:host([layout="page"]) .${KT_CODEGEN_TABLE_CLASSES.shell} {
  flex: 0 0 auto;
  min-height: auto;
  overflow-x: auto;
  overflow-y: hidden;
}
table { width: max-content; min-width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
th, td {
  height: 34px;
  padding: 0;
  overflow: hidden;
  border-right: 1px solid var(--pnw-kt-codegen-border);
  border-bottom: 1px solid var(--pnw-kt-codegen-border);
  background: var(--pnw-kt-codegen-background);
}
th {
  position: sticky;
  z-index: 2;
  top: 0;
  padding: 0 8px;
  text-align: left;
  white-space: nowrap;
  color: var(--vscode-descriptionForeground, inherit);
  background: var(--pnw-kt-codegen-toolbar-background);
  font-weight: 650;
}
tr:hover td { background: var(--pnw-kt-codegen-hover); }
tr.${KT_CODEGEN_TABLE_CLASSES.selectedRow} td {
  color: var(--pnw-kt-codegen-selection-foreground);
  background: var(--pnw-kt-codegen-selection);
}
.${KT_CODEGEN_TABLE_CLASSES.shell}:focus-within tr.${KT_CODEGEN_TABLE_CLASSES.selectedRow} td {
  color: var(--pnw-kt-codegen-selection-foreground);
  background: var(--pnw-kt-codegen-selection);
}
tr.${KT_CODEGEN_TABLE_CLASSES.selectedRow} td > input:not([type="checkbox"]),
tr.${KT_CODEGEN_TABLE_CLASSES.selectedRow} td > select { color: inherit; }
.${KT_CODEGEN_TABLE_CLASSES.rowNumber} {
  position: sticky;
  z-index: 1;
  left: 0;
  width: 48px;
  min-width: 48px;
  max-width: 48px;
  text-align: center;
  color: var(--vscode-descriptionForeground, inherit);
  background: var(--pnw-kt-codegen-toolbar-background);
}
th.${KT_CODEGEN_TABLE_CLASSES.rowNumber} { z-index: 3; }
.${KT_CODEGEN_TABLE_CLASSES.rowNumber} button {
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}
td > input:not([type="checkbox"]), td > select {
  width: 100%;
  height: 100%;
  min-width: 0;
  padding: 0 8px;
  color: var(--pnw-kt-codegen-input-foreground);
  background: transparent;
  border: 0;
  border-radius: 0;
  font: inherit;
}
td.${KT_CODEGEN_TABLE_CLASSES.booleanCell} { text-align: center; }
td.${KT_CODEGEN_TABLE_CLASSES.booleanCell} input { width: 16px; height: 16px; accent-color: var(--vscode-button-background, #007acc); }
option.${KT_CODEGEN_TABLE_CLASSES.unknownOption} { color: var(--vscode-editorWarning-foreground, #b89500); }
.${KT_CODEGEN_TABLE_CLASSES.empty} {
  position: absolute;
  inset: 42px 16px auto;
  padding: 24px;
  text-align: center;
  color: var(--vscode-descriptionForeground, #666);
  border: 1px dashed var(--pnw-kt-codegen-border);
  border-radius: 6px;
}
:host([layout="page"]) .${KT_CODEGEN_TABLE_CLASSES.empty} {
  position: static;
  margin: 16px;
}
.${KT_CODEGEN_TABLE_CLASSES.statusbar} {
  display: flex;
  flex: 0 0 auto;
  justify-content: space-between;
  gap: 12px;
  min-height: 28px;
  padding: 5px 9px;
  color: var(--vscode-descriptionForeground, inherit);
  background: var(--pnw-kt-codegen-toolbar-background);
  border-top: 1px solid var(--pnw-kt-codegen-border);
}
.${KT_CODEGEN_TABLE_CLASSES.status}.${KT_CODEGEN_TABLE_CLASSES.error} { color: var(--vscode-errorForeground, #c72e0f); }
.${KT_CODEGEN_TABLE_CLASSES.status}.${KT_CODEGEN_TABLE_CLASSES.dirty} { color: var(--vscode-editorWarning-foreground, #b89500); }
:host([collapsible][collapsed]) .${KT_CODEGEN_TABLE_CLASSES.toolbar} { border-bottom: 0; }
`;
